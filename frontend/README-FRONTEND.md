# FibreFit Frontend — Design Pass

This frontend keeps the existing FastAPI API contract and redesigns the app into a multi-page SPA experience.

## Pages
- `/` — Home
- `/find` — Fibre finder + map
- `/results` — Best Match / Best Value / Fastest + switch comparison
- `/community` — Community map and report feed
- `/compare` — Current-plan comparison
- `/report` — Connectivity issue reporting

## Run

```bash
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` for the API. To override it, copy `.env.example` to `.env` and set `VITE_API_URL`.

The OpenRouter key stays in the backend only.
