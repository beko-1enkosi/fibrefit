# FibreFit

**Find better fibre. Know when to switch.**

FibreFit is a hackathon MVP that helps users compare curated fibre options by area, match packages to household needs, report connectivity problems, compare a current package with alternatives, and ask an AI assistant to explain FibreFit's recommendation.

> **Demo data notice:** package prices, availability, reliability and coverage in this repository are curated hackathon demo data and must not be presented as live provider data.

## Stack
- React + Vite frontend
- Leaflet + OpenStreetMap
- FastAPI backend
- JSON demo package data
- JSON-backed community reports for the MVP
- OpenRouter for recommendation explanations only

## Important architecture principle
The recommendation is calculated deterministically by FibreFit's own scoring logic. OpenRouter does not choose the fibre package; it receives FibreFit context and explains it in plain language.

## Run the backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
Backend: `http://localhost:8000`

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

## OpenRouter
Add an API key to `backend/.env`:
```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```
If no API key is present, all core FibreFit features still work and the assistant displays a fallback message.

## MVP flow
1. Choose a demo area.
2. View community reports on the map.
3. Enter budget, household size and internet usage.
4. Optionally enter the current plan.
5. Get Best Match, Best Value and Fastest Option.
6. Compare the recommended plan with the current plan.
7. Report a connectivity issue.
8. Ask the FibreFit assistant to explain the recommendation.

## Current demo areas
- Midrand
- Sandton
- Centurion

## Next step
The current UI is intentionally neutral and function-first. The next iteration should redesign the visual system and interaction details without changing the product logic.
