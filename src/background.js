/*
 * PasteFilter — background service worker (MV3).
 * Aggregates local detection stats, drives the toolbar badge, and wires the
 * right-click "clean this field" context menu. No network calls.
 */
importScripts("config.js");
var PF = globalThis.PF;
var STATS_KEY = PF.config.STATS_KEY;

var sessionCount = 0;

function setBadge() {
  try {
    var text = sessionCount > 0 ? (sessionCount > 999 ? "999+" : String(sessionCount)) : "";
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: "#1a73e8" });
  } catch (e) {}
}

function bumpStats(counts, total) {
  chrome.storage.local.get([STATS_KEY], function (res) {
    var stats = res[STATS_KEY] || { total: 0, byType: {}, since: Date.now() };
    stats.total += total || 0;
    for (var k in counts) stats.byType[k] = (stats.byType[k] || 0) + counts[k];
    var obj = {}; obj[STATS_KEY] = stats;
    chrome.storage.local.set(obj);
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: "pf-clean",
      title: "PasteFilter: clean this field / selection",
      contexts: ["editable", "selection"],
    });
  });
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/options.html?welcome=1") });
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "pf-clean" && tab && tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: "pf-context" });
  }
});

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg) return;
  if (msg.type === "pf-detected") {
    sessionCount += msg.total || 0;
    setBadge();
    bumpStats(msg.counts || {}, msg.total || 0);
  } else if (msg.type === "pf-reset-session") {
    sessionCount = 0;
    setBadge();
  }
});
