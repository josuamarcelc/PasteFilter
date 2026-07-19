/*
 * PasteFilter — shared settings + stats (chrome.storage.local).
 * Loaded by the content script, popup and options page so defaults never drift.
 * Exposes globalThis.PF.config.
 */
(function (root) {
  "use strict";

  var SETTINGS_KEY = "pf_settings";
  var STATS_KEY = "pf_stats";

  // All detector types default ON. (Type list mirrors detectors.js.)
  var ALL_TYPES = [
    "PRIVATE_KEY", "JWT_TOKEN", "API_KEY_AWS", "API_KEY_GITHUB", "API_KEY_GOOGLE",
    "API_KEY_SLACK", "API_KEY_SENDGRID", "API_KEY_SK", "API_KEY_STRIPE",
    "BEARER_TOKEN", "CONNECTION_STRING", "ENV_SECRET",
    "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "IBAN_CODE", "IP_ADDRESS", "VAT_CODE",
  ];

  function defaultTypes() {
    var t = {};
    for (var i = 0; i < ALL_TYPES.length; i++) t[ALL_TYPES[i]] = true;
    return t;
  }

  var DEFAULTS = {
    enabled: true,
    mode: "randomize",        // off | warn | mask | randomize
    cleanAction: "randomize", // used by "warn" default button + context menu: mask | randomize
    theme: "auto",            // auto | light | dark
    showToast: true,
    types: defaultTypes(),
    pausedSites: [],          // hostnames where PasteFilter is paused
    allowPatterns: [],        // strings compiled to RegExp; matches are never flagged
  };

  function mergeTypes(stored) {
    var base = defaultTypes();
    if (stored && typeof stored === "object") {
      for (var k in stored) if (base.hasOwnProperty(k)) base[k] = !!stored[k];
    }
    return base;
  }

  function getSettings(cb) {
    try {
      chrome.storage.local.get([SETTINGS_KEY], function (res) {
        var s = (res && res[SETTINGS_KEY]) || {};
        cb({
          enabled: s.enabled !== undefined ? !!s.enabled : DEFAULTS.enabled,
          mode: s.mode || DEFAULTS.mode,
          cleanAction: s.cleanAction || DEFAULTS.cleanAction,
          theme: s.theme || DEFAULTS.theme,
          showToast: s.showToast !== undefined ? !!s.showToast : DEFAULTS.showToast,
          types: mergeTypes(s.types),
          pausedSites: Array.isArray(s.pausedSites) ? s.pausedSites : [],
          allowPatterns: Array.isArray(s.allowPatterns) ? s.allowPatterns : [],
        });
      });
    } catch (e) { cb(JSON.parse(JSON.stringify(DEFAULTS))); }
  }

  function saveSettings(patch, cb) {
    chrome.storage.local.get([SETTINGS_KEY], function (res) {
      var next = Object.assign({}, res[SETTINGS_KEY] || {}, patch);
      var obj = {}; obj[SETTINGS_KEY] = next;
      chrome.storage.local.set(obj, function () { if (cb) cb(next); });
    });
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && changes[SETTINGS_KEY]) cb();
    });
  }

  // Compile allowlist strings to RegExp, skipping invalid ones.
  function compileAllow(patterns) {
    var out = [];
    (patterns || []).forEach(function (p) {
      if (!p) return;
      try { out.push(new RegExp(p)); } catch (e) { /* ignore bad pattern */ }
    });
    return out;
  }

  root.PF = root.PF || {};
  root.PF.config = {
    SETTINGS_KEY: SETTINGS_KEY,
    STATS_KEY: STATS_KEY,
    DEFAULTS: DEFAULTS,
    ALL_TYPES: ALL_TYPES,
    getSettings: getSettings,
    saveSettings: saveSettings,
    onChange: onChange,
    compileAllow: compileAllow,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
