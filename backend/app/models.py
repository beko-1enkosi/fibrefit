from pydantic import BaseModel, Field
from typing import List, Optional


class Package(BaseModel):
    id: str
    area: str
    network: str
    isp: str
    download_mbps: int
    upload_mbps: int
    price: int
    contract: str
    reliability: int = Field(ge=0, le=100)
    ideal_for: List[str]


class FinderRequest(BaseModel):
    area: str
    budget: int
    household_size: int
    usage: List[str]
    current_speed: Optional[int] = None
    current_price: Optional[int] = None


class RankedPackage(BaseModel):
    package: Package
    match_percentage: int
    reasons: List[str]


class RecommendationResponse(BaseModel):
    best_match: RankedPackage
    best_value: RankedPackage
    fastest: RankedPackage
    current_comparison: Optional[dict] = None


class ReportCreate(BaseModel):
    area: str
    issue_type: str
    network: Optional[str] = None
    isp: Optional[str] = None
    note: Optional[str] = None


class AssistantRequest(BaseModel):
    question: str
    context: dict
