/*
 * PasteFilter — fake data generators
 * -----------------------------------------------------------------------------
 * This is what makes PasteFilter more than a blocker. Instead of only masking a
 * secret with a placeholder, PasteFilter can swap it for realistic-but-useless
 * data drawn from reserved / documentation ranges (RFC 5737 IPs, example.com
 * emails, 555-01xx phones, AWS's own EXAMPLE key, etc.). The pasted text still
 * looks and parses like the real thing, but every sensitive value is fictional.
 *
 * Exposes globalThis.PF.fake.
 */
(function (root) {
  "use strict";

  function ri(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function digits(n) { var s = ""; for (var i = 0; i < n; i++) s += ri(10); return s; }
  function hex(n) { var s = "", h = "0123456789abcdef"; for (var i = 0; i < n; i++) s += h[ri(16)]; return s; }
  function alnum(n, upper) {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + (upper ? "" : "abcdefghijklmnopqrstuvwxyz") + "0123456789";
    var s = ""; for (var i = 0; i < n; i++) s += c[ri(c.length)]; return s;
  }

  var FIRST = ["alex", "sam", "jordan", "casey", "riley", "taylor", "morgan", "jamie", "avery", "quinn"];
  var LAST = ["smith", "jones", "lee", "garcia", "khan", "novak", "brown", "wong", "silva", "meyer"];

  // Luhn-valid card, 16 digits, given brand-ish leading digit.
  function fakeCard(lead) {
    var body = String(lead);
    while (body.length < 15) body += ri(10);
    var sum = 0, alt = true;
    for (var i = body.length - 1; i >= 0; i--) {
      var d = body.charCodeAt(i) - 48;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    var check = (10 - (sum % 10)) % 10;
    return body + check;
  }

  // Re-apply the original grouping style to a plain digit string.
  function regroup(original, plainDigits) {
    if (original.indexOf(" ") !== -1) return plainDigits.replace(/(.{4})(?=.)/g, "$1 ");
    if (original.indexOf("-") !== -1) return plainDigits.replace(/(.{4})(?=.)/g, "$1-");
    return plainDigits;
  }

  var SCHEME_DEFAULTS = {
    postgres: "postgres://appuser:pw@db.example.com:5432/appdb",
    postgresql: "postgresql://appuser:pw@db.example.com:5432/appdb",
    mysql: "mysql://appuser:pw@db.example.com:3306/appdb",
    "mongodb": "mongodb://appuser:pw@db.example.com:27017/appdb",
    "mongodb+srv": "mongodb+srv://appuser:pw@cluster.example.com/appdb",
    redis: "redis://appuser:pw@cache.example.com:6379/0",
    amqp: "amqp://appuser:pw@mq.example.com:5672/",
    amqps: "amqps://appuser:pw@mq.example.com:5671/",
  };

  // Generate a realistic-but-useless replacement for a detected span.
  function fakeValue(type, original) {
    switch (type) {
      case "EMAIL_ADDRESS":
        return pick(FIRST) + "." + pick(LAST) + (ri(90) + 10) + "@example.com";
      case "PHONE_NUMBER": {
        var intl = original.trim().charAt(0) === "+";
        return (intl ? "+1 " : "") + "555-01" + digits(2); // 555-01xx is reserved for fiction
      }
      case "CREDIT_CARD":
        return regroup(original, fakeCard(4)); // Visa-shaped, Luhn-valid, fictional
      case "IBAN_CODE": {
        var cc = /^[A-Za-z]{2}/.test(original) ? original.slice(0, 2).toUpperCase() : "DE";
        var len = Math.max(16, original.replace(/\s/g, "").length);
        var body = "00" + digits(len - 4); // 00 check digits => intentionally invalid
        return (cc + body).replace(/(.{4})(?=.)/g, "$1 ");
      }
      case "IP_ADDRESS":
        return original.indexOf(":") !== -1
          ? "2001:db8::" + hex(1 + ri(3))            // RFC 3849 documentation range
          : "203.0.113." + (1 + ri(254));            // RFC 5737 TEST-NET-3
      case "VAT_CODE": {
        var vc = original.slice(0, 2).toUpperCase();
        return vc + digits(9);
      }
      case "PRIVATE_KEY":
        return "-----BEGIN PRIVATE KEY-----\n[REDACTED BY PASTEFILTER]\n-----END PRIVATE KEY-----";
      case "JWT_TOKEN":
        return "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." + alnum(16) + "." + alnum(22);
      case "API_KEY_AWS":
        return "AKIAIOSFODNN7EXAMPLE";                // AWS's own documentation key
      case "API_KEY_GITHUB":
        return "ghp_" + alnum(36, false);
      case "API_KEY_GOOGLE":
        return "AIza" + alnum(35, false);
      case "API_KEY_SLACK":
        return "xoxb-0000000000-0000000000-" + alnum(24, false);
      case "API_KEY_SENDGRID":
        return "SG." + alnum(22, false) + "." + alnum(43, false);
      case "API_KEY_SK":
        return "sk-" + alnum(24, false) + "FAKE";
      case "API_KEY_STRIPE":
        return "sk_test_" + alnum(24, false);
      case "BEARER_TOKEN":
        return "Bearer " + alnum(40, false);
      case "CONNECTION_STRING": {
        var scheme = (original.split("://")[0] || "postgres").toLowerCase();
        return SCHEME_DEFAULTS[scheme] || "postgres://appuser:pw@db.example.com:5432/appdb";
      }
      case "ENV_SECRET": {
        // Keep the KEY, redact only the value after the first = or :.
        var mm = original.match(/^([^:=]*[:=]\s*)(["']?)/);
        return mm ? mm[1] + mm[2] + "REDACTED" + mm[2] : "REDACTED";
      }
      default:
        return "[REDACTED]";
    }
  }

  // PasteGuard-style placeholder, e.g. [[EMAIL_ADDRESS_1]].
  function placeholder(type, n) { return "[[" + type + "_" + n + "]]"; }

  root.PF = root.PF || {};
  root.PF.fake = { value: fakeValue, placeholder: placeholder };
})(typeof globalThis !== "undefined" ? globalThis : self);
