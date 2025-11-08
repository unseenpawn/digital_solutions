# Digital Solutions Marketing Site

Modern, bilingual marketing site for Digital Solutions (Swiss IT services provider) built with HTML5, Bootstrap 5, vanilla ES6 modules and a lightweight PHP form handler.

## Struktur

```
/
├── index.html
├── leistungen.html
├── referenzen.html
├── ueber-uns.html
├── kontakt.html
├── kontakt.php
├── assets/
│   ├── css/
│   │   ├── main.src.css  # Quelle (bearbeitbar)
│   │   └── main.css      # minifizierte Version
│   ├── js/
│   │   └── main.js
│   └── img/              # ausschliesslich SVGs
├── sitemap.xml
├── robots.txt
├── manifest.webmanifest
├── favicon.svg
├── impressum.html
└── datenschutz.html
```

## Lokale Entwicklung

1. Projekt in einen Webserver-Ordner legen (z. B. `~/Sites/digital_solutions`).
2. Optional: `php -S localhost:8080` im Projektordner starten, damit `kontakt.php` erreichbar ist.
3. Seite im Browser öffnen: <http://localhost:8080/>.

## Deployment

- Für Shared Hosting (Infomaniak, Cyon etc.) gesamten Ordner hochladen.
- `kontakt.php` benötigt aktiviertes `mail()` (Standard). Für SMTP-Anbindung Kommentar in `kontakt.php` ergänzen.
- `BASE_URL` in den HTML-Dateien (canonical/hreflang) bei Bedarf auf Produktiv-Domain anpassen.

## Inhalt pflegen

- Texte befinden sich in den jeweiligen HTML-Dateien innerhalb des `<script id="translations">` JSON-Blocks.
- Farben anpassen: In `assets/css/main.src.css` Variablen (`--accent`, `--bg` etc.) ändern und danach optional neu minifizieren (`python tools` oder beliebiges Minify-Tool).
- Bilder liegen unter `assets/img/` und sind reine SVG-Platzhalter.

## Barrierefreiheit & Performance

- Sticky Navigation mit Fokus-Trap.
- Dark Mode via `prefers-color-scheme`.
- Smooth Scroll respektiert `prefers-reduced-motion`.
- Lazy-load Attribute bei nicht kritischen Bildern gesetzt.
- Lighthouse-Zielwerte: ≥95 (Performance & Accessibility) mit aktivem HTTP-Caching.

## Kontaktformular

- Client-Side Validation & AJAX via `fetch`.
- Server-Side Validation in `kontakt.php` (Honeypot + Zeitstempel als Basisschutz).
- Antwort als JSON (`success`, `message`).
- Mail-Header setzen `Reply-To` auf Absender.

## Analysen & Erweiterungen

- `logEvent(name, payload)` in `assets/js/main.js` dient als Hook für Analytics.
- Tech-Stack Tabs, Testimonials, Referenzfilter und Sprachauswahl werden rein mit Vanilla JS gesteuert.

