# PasteFilter — Chrome Web Store submission guide

Everything you need to fill in at
[chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
Copy/paste the blocks below into the matching fields.

---

## 1. Package

| Field | Value |
|-------|-------|
| Item name | **PasteFilter — Redact & Randomize Sensitive Data** |
| Short name (manifest) | PasteFilter |
| Version | 1.0.0 |
| Manifest | V3 |
| Default language | English (United States) |
| Homepage URL | https://seoultra.id/plugins/ |

Upload a ZIP of the extension **without** the `store/` folder or dev files
(see §8 for the exact command).

---

## 2. Store listing

**Category:** `Productivity` (secondary fit: `Developer Tools`)

**Summary** (132 characters max — this is the manifest `description`):

```
Detect API keys, passwords & personal data as you paste — block, mask, or swap in realistic fake data. 100% local, no tracking.
```

**Detailed description:** use the contents of [`../description.txt`](../description.txt).

---

## 3. Graphic assets (what to upload)

| Asset | Size | Status |
|-------|------|--------|
| Store icon | 128×128 PNG | ✅ `assets/icon-128.png` |
| Screenshot(s) | 1280×800 or 640×400 PNG/JPG, 1–5 | ⬜ capture (see [`screenshots.md`](screenshots.md)) |
| Small promo tile | 440×280 PNG | ⬜ optional but recommended |
| Marquee promo tile | 1400×560 PNG | ⬜ optional |

At least **one screenshot is required.** Suggested set of 4:
1. The Warn dialog catching a pasted API key + email.
2. The popup showing the four modes + "Try it" preview.
3. A Randomize toast after cleaning a paste.
4. The Settings page (detector toggles, light + dark).

---

## 4. Single purpose (required statement)

```
PasteFilter has a single purpose: to detect sensitive data (secrets and personal
information) in text the user pastes into web pages and, at the user's choosing,
block it, replace it with placeholders, or replace it with fictional data — all
locally in the browser.
```

---

## 5. Permission justifications

Chrome asks you to justify every permission. Use these:

**`storage`**
```
Stores the user's own settings (mode, per-detector toggles, paused sites,
allowlist) and a local counter of how many items were filtered. All data stays
in chrome.storage.local on the user's device; nothing is transmitted.
```

**`contextMenus`**
```
Adds one right-click menu item, "PasteFilter: clean this field / selection," so
the user can sanitize text on demand.
```

**Host permission `<all_urls>`**
```
PasteFilter must read the text of a paste and, when the user has chosen mask or
randomize mode, insert the cleaned text into the focused field. Sensitive data
can be pasted on any site (AI chat tools, CRMs, ticketing, admin panels), so the
content script needs to run on all sites. It only ever inspects the text the
user actively pastes or selects; it does not read page content, browsing
history, or send anything off the device.
```

**Remote code:** **No.** All JavaScript is included in the package; nothing is
loaded or `eval`'d from a remote source.

---

## 6. Privacy practices tab

**Does this item collect or use user data?** You must still complete the form.
Declare the following (all **No / not collected**):

| Data type | Collected? |
|-----------|-----------|
| Personally identifiable information | No |
| Health information | No |
| Financial & payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No |

**Certifications (check all three):**
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL (required):** host [`PRIVACY.md`](PRIVACY.md) at a public
URL and paste it here. Suggested home:
`https://seoultra.id/plugins/paste-filter/privacy-policy/`.

**Justification for why no data leaves the device:** PasteFilter performs all
detection and replacement in local JavaScript and makes no network requests.

---

## 7. Distribution

| Field | Value |
|-------|-------|
| Visibility | Public |
| Distribution | All regions |
| Pricing | Free |
| Mature content | No |
| Ads | None |

---

## 8. Packaging

From the project root:

```bash
zip -r pastefilter-1.0.0.zip manifest.json src assets \
  -x '*.DS_Store' -x '*/.*'
```

The ZIP must contain `manifest.json` at its top level. Do **not** include
`store/`, `README.md`, `description.txt`, `LICENSE`, or `NOTICE` in the upload
(they are for the repo/listing, not the runtime).

Verify before upload:
```bash
unzip -l pastefilter-1.0.0.zip   # manifest.json, src/*, assets/icon-*.png
```

---

## 9. Firefox Add-ons (AMO) — same package

The manifest is MV3 and browser-namespace-free (`chrome.*` is polyfilled by
Firefox 115+ for the APIs used here: storage, contextMenus, action, scripting).
Submit the same ZIP at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/).
Reuse the summary, description, and privacy answers above. Edge Add-ons accepts
the identical package.
