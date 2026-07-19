<p align="center">
  <img src="assets/icon.svg" width="72" height="72" alt="PasteFilter">
</p>

<h1 align="center">PasteFilter</h1>

<p align="center"><strong>Redact & randomize sensitive data before it leaves your keyboard.</strong></p>

<p align="center">
  A privacy-first browser extension that watches what you paste into web pages —
  chat boxes, forms, tickets, dashboards — and catches API keys, passwords, and
  personal data <em>before</em> they land. Block it, mask it, or swap in
  realistic-but-useless fake data. 100% on-device. No accounts. No tracking.
</p>

---

## Why PasteFilter

You copy a config file to ask ChatGPT a question and paste your live database
password with it. You share a log in a support ticket and leak a customer's
email and a Stripe key. It happens in a keystroke.

PasteFilter is the guard on that keystroke. It runs a local detector on every
paste and, the moment it sees something sensitive, it acts — with **zero network
calls**. Your data never leaves the browser, not even to us.

It is a client-side reimagining of the excellent
[PasteGuard](https://github.com/sgasser/pasteguard) proxy (Apache-2.0): the same
checksum-validated detection, rebuilt to run entirely inside your browser, plus
a new **Randomize** mode.

## The four modes

| Mode | What happens on a risky paste |
|------|-------------------------------|
| **Off** | PasteFilter stays out of the way. |
| **Warn** | A dialog lists what was found and lets you choose: paste original, mask, or randomize. |
| **Mask** | Each secret is replaced with a `[[TYPE_1]]` placeholder automatically. |
| **Randomize** ⭐ | Each secret is swapped for realistic **fake** data — the text still parses, but every value is fictional. |

**Randomize** is the headline feature. Instead of an obvious `[REDACTED]`, a
credit card becomes another *Luhn-valid but fictional* card, an email becomes
`jordan.lee42@example.com`, an IP becomes `203.0.113.x` (a reserved test range),
an AWS key becomes AWS's own documentation key. The AI or form still gets
well-formed, useful-looking input — just not your real data.

## What it detects

**Secrets** — Private keys (RSA/EC/OpenSSH/PGP), JWTs, Bearer tokens, AWS keys,
GitHub tokens, Google API keys, Slack tokens, SendGrid keys, `sk-`/Stripe keys,
database connection strings, and `.env` credentials (`DB_PASSWORD=…`).

**Personal data** — Email addresses, phone numbers, credit cards (Luhn-checked),
IBANs (mod-97-checked), IPv4/IPv6 addresses, and EU VAT numbers.

Every structured match is **validated**, not just pattern-matched, so benign
prose ("order #100045", "version 1.2.3", "98 out of 100") is left alone.

## Privacy

- **No network requests.** Detection and replacement run locally in JavaScript.
- **No data collection.** No analytics, telemetry, cookies, or fingerprinting.
- **No accounts.** Nothing to sign into.
- Settings and a local "items filtered" counter live in `chrome.storage.local`
  on your machine only.

## Install (from source / unpacked)

1. Download or clone this folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.

For Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → pick
`manifest.json`.

## Usage

- Click the toolbar icon to pick a mode, pause the current site, or preview
  detection in the **Try it** box.
- Right-click any field or selection → **PasteFilter: clean this field / selection**.
- Open **Settings** to toggle individual detectors, add paused sites, define
  allowlist regexes, and choose a Light / Dark / Auto theme.

## How it works

```
paste ─▶ content script ─▶ detectors.js (regex + checksum validation)
                              │
                    findings? ─┴─ no ─▶ paste proceeds untouched
                              │
                             yes ─▶ fake.js (mask or randomize) ─▶ insert cleaned text
```

`detectors.js` and `fake.js` are pure, dependency-free, and unit-tested against
a V8 engine. No build step, no bundler, no runtime dependencies.

## Theme

Light and dark, following the SEOULTRA design language (Google-material blue
accent). Follows your system by default; override in Settings.

## Credits & license

Detection logic adapted from **[PasteGuard](https://github.com/sgasser/pasteguard)**
by Stefan Gasser, used under the Apache License 2.0. See [`NOTICE`](NOTICE).
PasteFilter itself is released under the Apache License 2.0 — see [`LICENSE`](LICENSE).

Built by [SEOULTRA](https://seoultra.id/plugins/).

## Changelog

### 1.0.0
- Initial release: Off / Warn / Mask / **Randomize** modes.
- 18 detectors (12 secret types, 6 PII types) with local checksum validation.
- Popup with live preview, per-site pause, right-click clean, options page.
- Light/dark SEOULTRA theme. 100% local, no tracking.
>>>>>>> e11bee8 (initial commit)
