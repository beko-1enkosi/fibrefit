import json
import os
from pathlib import Path
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import Package, FinderRequest, RecommendationResponse, ReportCreate, AssistantRequest
from app.services.recommender import recommend

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PACKAGES_FILE = DATA_DIR / "packages.json"
REPORTS_FILE = DATA_DIR / "reports.json"

app = FastAPI(title="FibreFit API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(path: Path, data):
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


@app.get("/")
def root():
    return {"name": "FibreFit API", "status": "ok", "demo_data": True}


@app.get("/areas")
def areas():
    packages = [Package(**item) for item in load_json(PACKAGES_FILE)]
    return sorted(set(package.area for package in packages))


@app.get("/packages")
def packages(area: str | None = None):
    data = load_json(PACKAGES_FILE)
    if area:
        data = [item for item in data if item["area"].lower() == area.lower()]
    return data


@app.post("/recommend", response_model=RecommendationResponse)
def get_recommendation(request: FinderRequest):
    all_packages = [Package(**item) for item in load_json(PACKAGES_FILE)]
    try:
        best_match, best_value, fastest, comparison = recommend(all_packages, request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RecommendationResponse(
        best_match=best_match,
        best_value=best_value,
        fastest=fastest,
        current_comparison=comparison,
    )


@app.get("/reports")
def reports(area: str | None = None):
    data = load_json(REPORTS_FILE)
    if area:
        data = [item for item in data if item["area"].lower() == area.lower()]
    return sorted(data, key=lambda item: item["created_at"], reverse=True)


@app.post("/reports", status_code=201)
def create_report(report: ReportCreate):
    data = load_json(REPORTS_FILE)
    item = {
        "id": f"report-{len(data)+1}",
        **report.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    data.append(item)
    save_json(REPORTS_FILE, data)
    return item


@app.post("/assistant")
async def assistant(request: AssistantRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {
            "answer": "The FibreFit assistant is ready, but no OpenRouter API key is configured yet. Your recommendation still works because FibreFit scoring does not depend on AI.",
            "fallback": True,
        }

    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    system = (
        "You are FibreFit's connectivity explanation assistant. "
        "Only explain the structured FibreFit recommendation context provided. "
        "Do not invent live coverage, prices, outages, or provider facts. "
        "State clearly that hackathon coverage/package data is demo data when relevant. "
        "Use simple South African consumer-friendly language and be concise."
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"FibreFit context: {json.dumps(request.context)}\n\nQuestion: {request.question}"},
        ],
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="OpenRouter request failed")
    body = response.json()
    return {"answer": body["choices"][0]["message"]["content"], "fallback": False}
