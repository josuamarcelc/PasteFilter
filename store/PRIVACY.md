# PasteFilter Privacy Policy

_Last updated: 2026-07-19_

PasteFilter is built privacy-first. **No data ever leaves your device.**

## What PasteFilter does

PasteFilter inspects text you actively **paste** into an editable field, or text
you **select** and clean via the right-click menu. It detects sensitive values
(secrets and personal data) and — at your choosing — blocks, masks, or replaces
them with fictional data. All of this happens locally in your browser's
JavaScript engine.

## What we store

Only on your own device, via `chrome.storage.local`:

- Your settings (mode, per-detector toggles, paused sites, allowlist patterns, theme).
- A local counter of how many items PasteFilter has filtered, by type.

This data is never transmitted, synced to us, or shared.

## What we do NOT collect

- No browsing history, URLs, or page content.
- No keystrokes, clipboard contents, or form data beyond the specific text you
  paste or select for cleaning — and even that is processed locally and never sent.
- No IP addresses, device identifiers, or location.
- No analytics, telemetry, cookies, or fingerprinting.
- No personal information of any kind.

## Network requests

PasteFilter makes **zero** network requests. There are no servers, no SDKs, no
third-party services, no ads, and no trackers.

## Permissions

- `storage` — save your settings and the local counter on your device.
- `contextMenus` — add the "clean this field / selection" right-click item.
- Host access (`<all_urls>`) — required so paste protection works on any site;
  it only reads the text you paste or select, nothing else.

## Data sharing

We do not sell, share, or transfer any data to anyone, because none is collected.

## Contact

Questions: info\<at\>seoultra.id · https://seoultra.id/plugins/

In short: your data stays on your device. We collect nothing.
