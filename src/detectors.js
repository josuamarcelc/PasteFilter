/*
 * PasteFilter — detection engine
 * -----------------------------------------------------------------------------
 * A client-side port of PasteGuard's deterministic detectors
 * (github.com/sgasser/pasteguard, Apache-2.0) plus its secrets ruleset, rebuilt
 * to run entirely in the browser with zero network calls.
 *
 * Every detector returns half-open character spans {type, start, end, score}.
 * Structured/checksum-validated matches score 1.0; heuristic ones score lower.
 * Detectors run in priority order (secrets first, then structured PII) and a
 * later span that overlaps an already-accepted one is dropped — so an IBAN is
 * never also reported as a credit card, a JWT never also as a "token", etc.
 *
 * Exposes globalThis.PF (shared by the content script, popup and options page).
 */
(function (root) {
  "use strict";

  // ---- span helpers --------------------------------------------------------
  function span(type, start, end, score) {
    return { type: type, start: start, end: end, score: score };
  }
  function overlaps(a, b) {
    // Half-open overlap: touching spans (end === start) do NOT overlap.
    return a.start < b.end && b.start < a.end;
  }

  // ---- validators ----------------------------------------------------------
  function luhnValid(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = digits.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return false;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  // ISO 13616 IBAN mod-97 check.
  function ibanValid(raw) {
    var s = raw.replace(/\s+/g, "").toUpperCase();
    if (s.length < 15 || s.length > 34) return false;
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(s)) return false;
    var rearranged = s.slice(4) + s.slice(0, 4);
    var expanded = "";
    for (var i = 0; i < rearranged.length; i++) {
      var c = rearranged.charCodeAt(i);
      expanded += (c >= 65 && c <= 90) ? (c - 55).toString() : rearranged[i];
    }
    // mod-97 over a long numeric string, chunked to stay within safe integers.
    var remainder = 0;
    for (var j = 0; j < expanded.length; j += 7) {
      remainder = parseInt(String(remainder) + expanded.substr(j, 7), 10) % 97;
    }
    return remainder === 1;
  }

  function ipv4Valid(text) {
    var parts = text.split(".");
    if (parts.length !== 4) return false;
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) return false;
      var n = parseInt(parts[i], 10);
      if (n < 0 || n > 255) return false;
    }
    return true;
  }

  // Compact IPv6 validator (accepts "::" compression and embedded IPv4 tail).
  function ipv6Valid(text) {
    if (text.indexOf(":") === -1) return false;
    if ((text.match(/::/g) || []).length > 1) return false;
    var tail4 = "";
    var body = text;
    var lastColon = body.lastIndexOf(":");
    if (body.indexOf(".") !== -1) {
      var maybe = body.slice(lastColon + 1);
      if (!ipv4Valid(maybe)) return false;
      tail4 = maybe;
      body = body.slice(0, lastColon + 1) + "0"; // stand-in for the two hextets
    }
    var hasCompression = body.indexOf("::") !== -1;
    var groups = body.split(":").filter(function (g) { return g !== ""; });
    for (var i = 0; i < groups.length; i++) {
      if (!/^[0-9A-Fa-f]{1,4}$/.test(groups[i])) return false;
    }
    var need = tail4 ? 6 : 8;
    if (hasCompression) return groups.length <= need - 1;
    return groups.length === need;
  }

  // ---- PII detectors -------------------------------------------------------
  // Accent-aware (Latin-1 + Latin Extended) so müller@, andré.io match in full,
  // without \p{} property escapes (keeps the pattern portable to older engines).
  var AC = "À-ÖØ-öø-ÿ";
  var EMAIL_RE = new RegExp(
    "(?<![\\w.%+\\-@" + AC + "])" +
    "[\\w%+\\-" + AC + "]+(?:\\.[\\w%+\\-" + AC + "]+)*" +
    "@(?:[\\w\\-" + AC + "]+\\.)+[A-Za-z" + AC + "]{2,}" +
    "(?![\\w\\-" + AC + "])",
    "g"
  );
  var IPV4_RE = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w])(?!\.\d)/g;
  var IPV6_RE = /(?<![\w:.])[0-9A-Fa-f.:]{2,45}(?![\w:.])/g;
  var IBAN_RE = /(?<![A-Za-z0-9])[A-Za-z]{2}[0-9]{2}(?:[ ]?[A-Za-z0-9]){11,30}(?![A-Za-z0-9])/g;
  var CC_RE = /(?<!\d)(?:\d[ \-]?){13,19}(?<![\s\-])(?!\d)/g;
  var VAT_CC = "AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|EL|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE";
  var VAT_RE = new RegExp("(?<![A-Za-z0-9])(" + VAT_CC + ")[ ]?([0-9A-Za-z]{8,12})(?![A-Za-z0-9])", "g");
  // Pragmatic phone matcher: E.164 and common separators. Validated by digit count.
  var PHONE_RE = /(?<![\w.])(\+?\d[\d\s().\-]{7,17}\d)(?![\w])/g;

  function detEmail(text, out) {
    var m;
    while ((m = EMAIL_RE.exec(text))) out.push(span("EMAIL_ADDRESS", m.index, m.index + m[0].length, 1.0));
  }
  function detIpv6(text, out) {
    var m;
    while ((m = IPV6_RE.exec(text))) {
      var s = m[0], end = m.index + s.length;
      while (s.charAt(s.length - 1) === ".") { s = s.slice(0, -1); end -= 1; }
      if (ipv6Valid(s)) out.push(span("IP_ADDRESS", m.index, end, 1.0));
    }
  }
  function detIpv4(text, out) {
    var m;
    while ((m = IPV4_RE.exec(text))) {
      if (ipv4Valid(m[0])) out.push(span("IP_ADDRESS", m.index, m.index + m[0].length, 1.0));
    }
  }
  function detIban(text, out) {
    var m;
    while ((m = IBAN_RE.exec(text))) {
      var tokens = m[0].split(" ");
      while (tokens.length) {
        var cand = tokens.join(" ");
        if (ibanValid(cand)) { out.push(span("IBAN_CODE", m.index, m.index + cand.length, 1.0)); break; }
        tokens.pop();
      }
    }
  }
  function detCreditCard(text, out) {
    var m;
    while ((m = CC_RE.exec(text))) {
      var digits = m[0].replace(/[ \-]/g, "");
      if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
        out.push(span("CREDIT_CARD", m.index, m.index + m[0].length, 1.0));
      }
    }
  }
  function detVat(text, out) {
    var m;
    while ((m = VAT_RE.exec(text))) {
      var body = m[2];
      // Require the body to be mostly digits — kills prose like "DENMARKING".
      var digitCount = (body.match(/\d/g) || []).length;
      if (digitCount >= body.length - 2 && digitCount >= 6) {
        out.push(span("VAT_CODE", m.index, m.index + m[0].length, 0.85));
      }
    }
  }
  function detPhone(text, out) {
    var m;
    while ((m = PHONE_RE.exec(text))) {
      var raw = m[1];
      var digits = raw.replace(/\D/g, "");
      var intl = raw.trim().charAt(0) === "+";
      // E.164 is 8–15 digits; NANP-style local 10. Require separators or a + to
      // avoid grabbing long plain integers (order ids, hashes).
      var hasSep = /[\s().\-]/.test(raw);
      if (digits.length < 8 || digits.length > 15) continue;
      if (!intl && !hasSep && digits.length !== 10) continue;
      out.push(span("PHONE_NUMBER", m.index, m.index + raw.length, intl ? 0.9 : 0.7));
    }
  }

  // ---- Secret detectors ----------------------------------------------------
  // Ordered most-specific first; regexes carry named group 0 = full secret.
  var SECRET_RULES = [
    { type: "PRIVATE_KEY", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g },
    { type: "JWT_TOKEN", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
    { type: "API_KEY_AWS", re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[0-9A-Z]{16}\b/g },
    { type: "API_KEY_GITHUB", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
    { type: "API_KEY_GOOGLE", re: /\bAIza[0-9A-Za-z_\-]{35}\b/g },
    { type: "API_KEY_SLACK", re: /\bxox[baprs]-[0-9A-Za-z\-]{10,}\b/g },
    { type: "API_KEY_SENDGRID", re: /\bSG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}\b/g },
    { type: "API_KEY_SK", re: /\bsk-[A-Za-z0-9_\-]{20,}\b/g },
    { type: "API_KEY_STRIPE", re: /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
    { type: "BEARER_TOKEN", re: /\bBearer\s+[A-Za-z0-9._\-]{40,}\b/g },
    { type: "CONNECTION_STRING", re: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp|amqps):\/\/[^\s:@/]+:[^\s:@/]+@\S+/g },
    { type: "ENV_SECRET", re: /\b[A-Z][A-Z0-9_]*(?:PASSWORD|PASSWD|_PWD|SECRET|_TOKEN|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY)\s*[:=]\s*["']?[^\s"']{6,}/g },
  ];

  function detSecrets(text, out) {
    for (var r = 0; r < SECRET_RULES.length; r++) {
      var rule = SECRET_RULES[r], m;
      rule.re.lastIndex = 0;
      while ((m = rule.re.exec(text))) {
        out.push(span(rule.type, m.index, m.index + m[0].length, 1.0));
      }
    }
  }

  // Type → {label, group}. group is "secret" or "pii".
  var TYPE_META = {
    PRIVATE_KEY:       { label: "Private key",        group: "secret" },
    JWT_TOKEN:         { label: "JWT token",          group: "secret" },
    API_KEY_AWS:       { label: "AWS access key",     group: "secret" },
    API_KEY_GITHUB:    { label: "GitHub token",       group: "secret" },
    API_KEY_GOOGLE:    { label: "Google API key",     group: "secret" },
    API_KEY_SLACK:     { label: "Slack token",        group: "secret" },
    API_KEY_SENDGRID:  { label: "SendGrid key",       group: "secret" },
    API_KEY_SK:        { label: "Secret API key",     group: "secret" },
    API_KEY_STRIPE:    { label: "Stripe key",         group: "secret" },
    BEARER_TOKEN:      { label: "Bearer token",       group: "secret" },
    CONNECTION_STRING: { label: "Connection string",  group: "secret" },
    ENV_SECRET:        { label: "Credential (.env)",  group: "secret" },
    EMAIL_ADDRESS:     { label: "Email address",      group: "pii" },
    PHONE_NUMBER:      { label: "Phone number",       group: "pii" },
    CREDIT_CARD:       { label: "Credit card",        group: "pii" },
    IBAN_CODE:         { label: "IBAN",               group: "pii" },
    IP_ADDRESS:        { label: "IP address",         group: "pii" },
    VAT_CODE:          { label: "VAT number",         group: "pii" },
  };
  var ALL_TYPES = Object.keys(TYPE_META);

  /**
   * Detect sensitive spans.
   * @param {string} text
   * @param {object} [opts] { enabledTypes?: {TYPE:bool}, allow?: RegExp[] }
   * @returns {Array<{type,start,end,score,text,label,group}>}
   */
  function detect(text, opts) {
    if (!text) return [];
    opts = opts || {};
    var enabled = opts.enabledTypes || null;
    var ordered = [];

    detSecrets(text, ordered);   // secrets take priority over overlapping PII
    detEmail(text, ordered);
    detIpv6(text, ordered);
    detIpv4(text, ordered);
    detIban(text, ordered);
    detVat(text, ordered);
    detCreditCard(text, ordered);
    detPhone(text, ordered);

    // Priority = order of insertion; accept greedily, drop overlaps.
    var accepted = [];
    for (var i = 0; i < ordered.length; i++) {
      var s = ordered[i];
      if (enabled && enabled[s.type] === false) continue;
      var clash = false;
      for (var j = 0; j < accepted.length; j++) {
        if (overlaps(s, accepted[j])) { clash = true; break; }
      }
      if (clash) continue;
      s.text = text.slice(s.start, s.end);
      // Custom user allowlist — never flag these.
      if (opts.allow && opts.allow.some(function (re) { return re.test(s.text); })) continue;
      var meta = TYPE_META[s.type];
      s.label = meta.label;
      s.group = meta.group;
      accepted.push(s);
    }
    accepted.sort(function (a, b) { return a.start - b.start; });
    return accepted;
  }

  root.PF = root.PF || {};
  root.PF.detect = detect;
  root.PF.TYPE_META = TYPE_META;
  root.PF.ALL_TYPES = ALL_TYPES;
  root.PF.util = { luhnValid: luhnValid, ibanValid: ibanValid, ipv4Valid: ipv4Valid, ipv6Valid: ipv6Valid, overlaps: overlaps };
})(typeof globalThis !== "undefined" ? globalThis : self);
