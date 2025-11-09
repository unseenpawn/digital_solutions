# Smoke Tests & Manuelle Checks

## Checkliste
- ✅ All nav links work (5 pages)
- ✅ Hero CTA scrolls to contact on index
- ✅ kontakt.php rejects <3s submits / invalid email
- ✅ Form fallback (no JS) still submits and shows thank-you
- ✅ Filter on referenzen persists via hash
- ✅ Dark mode readable; focus visible
- ✅ No console errors; images CLS-safe

## Commands
```bash
php -S 127.0.0.1:8000
```

Weitere Schritte:
1. Lighthouse Mobile (Chrome DevTools) mit Emulation starten, Screenshot der Ergebnisse unter `docs/` ablegen.
2. Axe DevTools oder vergleichbare Erweiterung laufen lassen (keine schwerwiegenden Probleme).
