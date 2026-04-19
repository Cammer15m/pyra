# PYRA PWA v1

Forest-floor wildfire intelligence — field sensor companion for the PYRA stake.

## Live

- **URL:** https://cammer15m.github.io/pyra/
- Installable as a PWA on iOS, Android, and desktop.

## Install to phone

- **iOS Safari:** visit the URL → tap **Share** → **Add to Home Screen**.
- **Android Chrome:** visit the URL → tap the native install banner when it appears, or tap the overflow menu → **Install app**.
- **Desktop Chrome / Edge / Brave:** click the install icon in the address bar.

## Run locally

```bash
cd docs
python3 -m http.server 8000
# open http://localhost:8000
```

Service workers require a secure context in production, but `http://localhost:*` is treated as secure by browsers for PWA testing.

## What's real vs. empty-state

| Panel | Source | Status |
|---|---|---|
| Map | Leaflet + OpenStreetMap tiles | Live |
| Current weather | Open-Meteo forecast API | Live |
| Reverse-geocoded place name | Nominatim (OSM) | Live |
| DHT11 captures (baseline + breath) | `data/baseline.csv`, `data/breath.csv` from 2026-04-18 bench | Live, real bench data |
| Node status | Hardcoded to bench node `pyra-dev-001` | Live, real values |
| FWI | — | Empty-state — landing Day 6 per `DECISIONS.md` D-007 |
| Live stream | — | Empty-state — node not broadcasting yet |
| Fleet | — | Empty-state — single bench node only |
| Historical DB | — | Empty-state — no ingest pipeline in v1 |
| Alerts | — | Empty-state — no rules configured |

**No mock data.** Every panel either shows real values from a real source, or declares itself empty.

## Enable GitHub Pages (first-time setup)

Repo UI path:

> Settings → Pages → **Build and deployment** → Source **Deploy from a branch** → Branch **main**, Folder **`/docs`** → Save

Or via `gh`:

```bash
gh api -X POST repos/Cammer15m/pyra/pages \
  -f "source[branch]=main" \
  -f "source[path]=/docs"
```

Live URL usually available 60–120 s after Save.

## Stack

- Plain HTML / CSS / JS — no build step
- [Tailwind CSS](https://tailwindcss.com/) via CDN
- [Leaflet](https://leafletjs.com/) 1.9.4 + OpenStreetMap raster tiles
- [Chart.js](https://www.chartjs.org/) 4.4.1
- [Open-Meteo](https://open-meteo.com/) — current weather (no API key)
- [Nominatim](https://nominatim.openstreetmap.org/) — reverse geocoding (1 req/s debounce; `email=` identification per OSM policy)

## Files

```
docs/
├── index.html           App shell + inline CSS/JS
├── manifest.json        PWA manifest (standalone, theme / background color)
├── sw.js                Service worker (cache-first shell, SWR for live APIs)
├── icon-192.png         Home-screen icon
├── icon-512.png         Home-screen icon (hi-res)
├── README.md            This file
└── data/
    ├── baseline.csv     60 s DHT11 ambient — 2026-04-18 bench (timestamp_ms, temp_c, humidity_pct)
    └── breath.csv       30 s DHT11 breath — 2026-04-18 bench
```

## Version

v1 — pinned by `DECISIONS.md` D-009. See also D-004 (sprint reframe), D-005 (stack), D-007 (cffdrs / FWI path), D-008 (Day 1 bench verification).
