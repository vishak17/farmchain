from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class AnalysisRequest(BaseModel):
    batch_id: str
    produce_type: str
    category: Literal["STANDARD", "HIGH_SENSITIVITY", "HIGH_TOLERANCE"]
    declared_count: int
    declared_weight_grams: float
    node_type: int = Field(ge=0, le=3, description="0=farm,1=mm,2=depot,3=retailer")
    hours_since_harvest: Optional[float] = None

class ItemCountEstimate(BaseModel):
    estimated_count: int
    confidence: float = Field(ge=0.0, le=1.0)
    count_anomaly: bool
    count_delta_pct: float
    fraud_flag: bool

class FreshnessIndicators(BaseModel):
    visual_freshness_score: float = Field(ge=0.0, le=100.0)
    spoilage_detected: bool
    bruising_detected: bool
    mould_detected: bool
    colour_anomaly: bool
    preservative_flag: bool
    wilting_detected: bool
    surface_uniformity: float = Field(ge=0.0, le=1.0)

class AnalysisResponse(BaseModel):
    batch_id: str
    visual_frs_confidence: float
    visual_frs_estimate: float
    item_count: ItemCountEstimate
    freshness: FreshnessIndicators
    overall_quality_label: str
    grade: str
    flags: List[str]
    ipfs_hash: str
    processing_time_ms: float
    model_version: str = "simulation_v1.0"
