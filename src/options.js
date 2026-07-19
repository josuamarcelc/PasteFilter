/* PasteFilter — options logic */
(function () {
  "use strict";
  var PF = globalThis.PF;
  var $ = function (id) { return document.getElementById(id); };

  var SECRET_TYPES = ["PRIVATE_KEY","JWT_TOKEN","API_KEY_AWS","API_KEY_GITHUB","API_KEY_GOOGLE","API_KEY_SLACK","API_KEY_SENDGRID","API_KEY_SK","API_KEY_STRIPE","BEARER_TOKEN","CONNECTION_STRING","ENV_SECRET"];
  var PII_TYPES = ["EMAIL_ADDRESS","PHONE_NUMBER","CREDIT_CARD","IBAN_CODE","IP_ADDRESS","VAT_CODE"];

  var settings = null;

  function note(msg) {
    var n = $("pf-note"); n.textContent = msg || "Saved";
    setTimeout(function () { if (n.textContent === (msg || "Saved")) n.textContent = ""; }, 1400);
  }

  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
  }

  function save(patch) {
    PF.config.saveSettings(patch, function (next) {
      Object.assign(settings, patch);
      note("Saved");
    });
  }

  function typeRow(type) {
    var meta = PF.TYPE_META[type];
    var row = document.createElement("div"); row.className = "pf-toggle-row";
    var lab = document.createElement("label"); lab.className = "pf-tt";
    var span = document.createElement("span"); span.textContent = meta.label;
    lab.appendChild(span);
    var sw = document.createElement("label"); sw.className = "pf-switch";
    var input = document.createElement("input"); input.type = "checkbox";
    input.checked = settings.types[type] !== false;
    input.addEventListener("change", function () {
      var t = Object.assign({}, settings.types); t[type] = input.checked;
      settings.types = t; save({ types: t });
    });
    var sl = document.createElement("span"); sl.className = "pf-slider";
    sw.appendChild(input); sw.appendChild(sl);
    row.appendChild(lab); row.appendChild(sw);
    return row;
  }

  function renderTypes() {
    var s = $("pf-secrets"), p = $("pf-pii");
    s.innerHTML = ""; p.innerHTML = "";
    SECRET_TYPES.forEach(function (t) { s.appendChild(typeRow(t)); });
    PII_TYPES.forEach(function (t) { p.appendChild(typeRow(t)); });
  }

  function renderSites() {
    var list = $("pf-site-list"); list.innerHTML = "";
    if (!settings.pausedSites.length) { list.innerHTML = '<div class="pf-desc">No paused sites.</div>'; return; }
    settings.pausedSites.forEach(function (host) {
      var item = document.createElement("div"); item.className = "pf-item";
      var span = document.createElement("span"); span.textContent = host;
      var btn = document.createElement("button"); btn.className = "pf-btn pf-btn-danger"; btn.textContent = "Remove";
      btn.addEventListener("click", function () {
        settings.pausedSites = settings.pausedSites.filter(function (h) { return h !== host; });
        save({ pausedSites: settings.pausedSites }); renderSites();
      });
      item.appendChild(span); item.appendChild(btn); list.appendChild(item);
    });
  }

  function loadStats() {
    chrome.storage.local.get([PF.config.STATS_KEY], function (res) {
      var st = res[PF.config.STATS_KEY] || { total: 0, since: Date.now() };
      var since = st.since ? new Date(st.since).toLocaleDateString() : "—";
      $("pf-stat-line").textContent = (st.total || 0) + " sensitive items filtered since " + since + ".";
    });
  }

  PF.config.getSettings(function (s) {
    settings = s;
    applyTheme(s.theme);

    if (new URLSearchParams(location.search).get("welcome")) $("pf-welcome").hidden = false;

    $("pf-mode").value = s.mode;
    $("pf-clean").value = s.cleanAction;
    $("pf-theme").value = s.theme;
    $("pf-toast").checked = s.showToast;
    $("pf-allow").value = (s.allowPatterns || []).join("\n");

    renderTypes();
    renderSites();
    loadStats();

    $("pf-mode").addEventListener("change", function () { save({ mode: this.value }); });
    $("pf-clean").addEventListener("change", function () { save({ cleanAction: this.value }); });
    $("pf-theme").addEventListener("change", function () { applyTheme(this.value); save({ theme: this.value }); });
    $("pf-toast").addEventListener("change", function () { save({ showToast: this.checked }); });

    $("pf-allow").addEventListener("change", function () {
      var lines = this.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      settings.allowPatterns = lines; save({ allowPatterns: lines });
    });

    $("pf-site-add").addEventListener("click", function () {
      var v = $("pf-site-input").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!v) return;
      if (settings.pausedSites.indexOf(v) === -1) settings.pausedSites.push(v);
      $("pf-site-input").value = "";
      save({ pausedSites: settings.pausedSites }); renderSites();
    });
    $("pf-site-input").addEventListener("keydown", function (e) { if (e.key === "Enter") $("pf-site-add").click(); });

    $("pf-reset").addEventListener("click", function () {
      var obj = {}; obj[PF.config.STATS_KEY] = { total: 0, byType: {}, since: Date.now() };
      chrome.storage.local.set(obj, function () { loadStats(); note("Stats reset"); });
      try { chrome.runtime.sendMessage({ type: "pf-reset-session" }); } catch (e) {}
    });
  });
})();
