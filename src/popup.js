/* PasteFilter — popup logic */
(function () {
  "use strict";
  var PF = globalThis.PF;
  var $ = function (id) { return document.getElementById(id); };

  var MODE_HINTS = {
    off: "PasteFilter is not acting on pastes.",
    warn: "Ask me each time sensitive data is pasted.",
    mask: "Replace with [[PLACEHOLDER]] markers automatically.",
    randomize: "Swap in realistic-but-useless fake data automatically.",
  };

  var host = null;

  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
  }

  function renderMode(mode) {
    var btns = document.querySelectorAll("#pf-mode button");
    btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode)); });
    $("pf-mode-hint").textContent = MODE_HINTS[mode] || "";
  }

  function loadStats() {
    chrome.storage.local.get([PF.config.STATS_KEY], function (res) {
      var st = res[PF.config.STATS_KEY] || { total: 0, byType: {} };
      $("pf-total").textContent = st.total || 0;
      var secretTypes = ["PRIVATE_KEY","JWT_TOKEN","API_KEY_AWS","API_KEY_GITHUB","API_KEY_GOOGLE","API_KEY_SLACK","API_KEY_SENDGRID","API_KEY_SK","API_KEY_STRIPE","BEARER_TOKEN","CONNECTION_STRING","ENV_SECRET"];
      var secrets = 0;
      secretTypes.forEach(function (t) { secrets += st.byType[t] || 0; });
      $("pf-secrets").textContent = secrets;
      // top 4 types
      var arr = Object.keys(st.byType || {}).map(function (k) { return [k, st.byType[k]]; })
        .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
      var wrap = $("pf-toptypes"); wrap.innerHTML = "";
      arr.forEach(function (pair) {
        var meta = PF.TYPE_META[pair[0]]; if (!meta) return;
        var chip = document.createElement("span");
        chip.className = "pf-chip " + meta.group;
        chip.textContent = meta.label + " · " + pair[1];
        wrap.appendChild(chip);
      });
      if (!arr.length) { wrap.innerHTML = '<span class="pf-hint">Nothing filtered yet.</span>'; }
    });
  }

  function initTryIt(settings) {
    var ta = $("pf-try"), chips = $("pf-try-chips"), out = $("pf-try-out");
    var allow = PF.config.compileAllow(settings.allowPatterns);
    function run() {
      var text = ta.value;
      var findings = PF.detect(text, { enabledTypes: settings.types, allow: allow });
      chips.innerHTML = "";
      var seen = {};
      findings.forEach(function (f) {
        if (seen[f.type]) return; seen[f.type] = true;
        var c = document.createElement("span"); c.className = "pf-chip " + f.group; c.textContent = f.label;
        chips.appendChild(c);
      });
      if (!text) { out.textContent = ""; return; }
      if (!findings.length) { out.textContent = "No sensitive data detected."; return; }
      // Show randomized preview.
      var o = "", last = 0, memo = {};
      findings.forEach(function (f) {
        o += text.slice(last, f.start);
        var key = f.type + " " + f.text;
        o += (memo[key] || (memo[key] = PF.fake.value(f.type, f.text)));
        last = f.end;
      });
      o += text.slice(last);
      out.textContent = "→ " + o;
    }
    ta.addEventListener("input", run);
    run();
  }

  PF.config.getSettings(function (settings) {
    applyTheme(settings.theme);
    $("pf-enabled").checked = settings.enabled;
    renderMode(settings.mode);

    // current host + paused state
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      try {
        var url = tabs && tabs[0] && tabs[0].url ? new URL(tabs[0].url) : null;
        host = url ? url.hostname : null;
        $("pf-host").textContent = host || "this page";
        var paused = host && settings.pausedSites.indexOf(host) !== -1;
        $("pf-paused").checked = !!paused;
      } catch (e) { $("pf-host").textContent = "this page"; }
    });

    $("pf-enabled").addEventListener("change", function () {
      PF.config.saveSettings({ enabled: this.checked });
    });

    document.querySelectorAll("#pf-mode button").forEach(function (b) {
      b.addEventListener("click", function () {
        renderMode(b.dataset.mode);
        PF.config.saveSettings({ mode: b.dataset.mode });
      });
    });

    $("pf-paused").addEventListener("change", function () {
      if (!host) return;
      PF.config.getSettings(function (s) {
        var list = s.pausedSites.slice();
        var idx = list.indexOf(host);
        if (this.checked && idx === -1) list.push(host);
        if (!this.checked && idx !== -1) list.splice(idx, 1);
        PF.config.saveSettings({ pausedSites: list });
      }.bind(this));
    });

    $("pf-options").addEventListener("click", function (e) {
      e.preventDefault(); chrome.runtime.openOptionsPage();
    });

    loadStats();
    initTryIt(settings);
  });
})();
