# Digital Solutions Marketing Site

Produktionsreife, zweisprachige Marketing-Seite für einen Schweizer IT-Dienstleister. Stack: HTML5, Bootstrap 5 (CDN), Vanilla ES6-Module, PHP 8+ für die Kontaktstrecke.

## Struktur
```
/
├── index.html              # Startseite (DE/EN Umschaltbar)
├── leistungen.html         # Leistungsübersicht mit KPIs & Paketen
├── referenzen.html         # Case Studies mit Filter & Hash-Persistenz
├── ueber-uns.html          # Mission, Team, Werte
├── kontakt.html            # Vollständiges Kontaktformular + Modal
├── kontakt.php             # Validierter Mail-Endpunkt
├── assets/
│   ├── css/
│   │   ├── main.src.css    # Quelle (bearbeiten)
│   │   └── main.css        # minifizierte Ausgabe
│   ├── js/
│   │   └── main.js         # ES6-Modul (i18n, Slider, Formhandling)
│   └── img/                # SVG-Assets & Logos
├── sitemap.xml
├── robots.txt
├── manifest.webmanifest
├── favicon.svg
├── impressum.html
├── datenschutz.html
└── docs/
    └── tests.md            # Manuelle Smoke-Tests & Checkliste
```

## Lokale Entwicklung
1. Projektverzeichnis klonen/kopieren und in den Webroot legen, z. B. `~/Sites/digital_solutions` oder `C:\xampp\htdocs\digital_solutions`.
2. PHP-Entwicklungsserver starten:
   ```bash
   php -S 127.0.0.1:8000
   ```
3. Browser öffnen: <http://127.0.0.1:8000/> – alle Seiten funktionieren als statische HTML-Dateien, `kontakt.php` verarbeitet Formular-POSTs.

## Deployment (Shared Hosting z. B. Infomaniak)
1. Per SFTP verbinden (Beispiel):
   ```bash
   sftp user@ihre-domain.ch
   lcd /pfad/zur/digital_solutions
   cd /web/htdocs/www.domain.ch/www
   put -r *
   ```
2. Dateirechte setzen (empfohlen):
   ```bash
   find . -type d -exec chmod 755 {} \;
   find . -type f -exec chmod 644 {} \;
   ```
3. Sicherstellen, dass PHP ≥ 8.1 aktiv ist und `mail()` serverseitig erlaubt ist. Falls SMTP benötigt wird, TODO-Kommentar in `kontakt.php` beachten und dort erweitern.
4. Domain-Canonical-URLs in den `<link rel="canonical">`/`hreflang`-Tags bei Bedarf auf die produktive Domain anpassen.

## Anpassungen
- **Farbschema:** In `assets/css/main.src.css` die CSS-Variablen (`--accent`, `--neutral-*`) aktualisieren. Danach `main.css` erneut minifizieren, z. B. mit [csso](https://github.com/css/csso):
  ```bash
  npx csso assets/css/main.src.css --output assets/css/main.css
  ```
  Alternativ kann ein beliebiges CSS-Minify-Tool eingesetzt werden.
- **Texte & Übersetzungen:** Inhaltliche Änderungen im jeweiligen `<script id="translations">` Block der Seite vornehmen. Keys in `de`/`en` sollten identisch bleiben.
- **Logos/Bilder:** Alle Assets liegen in `assets/img/` (SVG). Neue Grafiken ebenfalls als SVG hinzufügen, Breite/Höhe definieren, `loading="lazy"` nicht vergessen.

## Kontaktformular & Sicherheit
- Clientseitige Validierung und AJAX-Submit via `fetch` in `assets/js/main.js` (`data-contact-form`).
- Serverseitig prüft `kontakt.php` Name, E-Mail, Nachricht (≥20 Zeichen), Budget, Timeline, Projektart, Consent.
- Schutzmechanismen: Honeypot-Feld, Mindestabsendezeit ≥3 s, IP-Rate-Limit (60 s), Fehlerlogging nach `/logs/kontakt-YYYYMMDD.log`.
- Erfolgs-/Fehlerantwort als JSON `{ ok: true|false, errors: {...} }`. Ohne JS liefert `kontakt.php` eine einfache HTML-Antwort.
- `Reply-To` setzt die Absenderadresse, `From` bleibt die Team-Mail (`CONTACT_TO`).

## Barrierefreiheit & Performance
- Skip-Link, Fokus-Trap für Mobile-Navigation und Modal, sichtbare `:focus-visible` Styles.
- `prefers-reduced-motion` wird respektiert (Slider stoppt, Smooth-Scroll deaktiviert).
- Bilder besitzen feste Breite/Höhe (`loading="lazy"`, `decoding="async"`).
- Dark Mode per `prefers-color-scheme`, Kontrastwerte ≥ WCAG AA.
- Lighthouse-Zielwerte: ≥95 Performance/Accessibility/Best Practices, ≥90 SEO.

## Analytics / Erweiterungen
- `logEvent(name, payload)` in `assets/js/main.js` ist der zentrale Hook, um später echte Tracking-Integrationen (z. B. Plausible, Matomo) einzuhängen.
- Sprachumschaltung, Tech-Stack-Tabs, Testimonials-Slider, Referenzfilter und Kontaktmodal arbeiten komplett ohne externe Bibliotheken.

## Tests
- Manuelle Smoke-Tests inkl. Lighthouse/Axe-Protokoll siehe `docs/tests.md`.
- PHP-Linting: `php -l kontakt.php`.
