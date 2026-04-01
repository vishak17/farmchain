from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import json
import numpy as np
from PIL import Image
import io
from datetime import datetime
from schemas.analysis import AnalysisRequest, AnalysisResponse
from utils.simulation_engine import engine

app = FastAPI(
    title="FarmChain AI Visual Estimation Service",
    description="Produce freshness and count estimation via computer vision (simulation mode)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
async def health():
    return {"status": "ok", "model": "simulation_v1.0", "timestamp": datetime.utcnow().isoformat()}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_produce(
    request: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    try:
        req_data = AnalysisRequest(**json.loads(request))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid request: {str(e)}")
    
    image_array = None
    if image:
        try:
            contents = await image.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB").resize((224, 224))
            image_array = np.array(pil_image)
        except Exception as e:
            # Log but don't fail — just analyze without image
            print(f"[AI] Image processing error: {e}")
    
    result = engine.analyze(req_data, image_array)
    return result

@app.post("/batch-analyze")
async def batch_analyze(requests: List[AnalysisRequest]):
    results = []
    for req in requests:
        result = engine.analyze(req)
        results.append(result)
    return {"results": results, "count": len(results)}

@app.get("/freshness-anomaly")
async def check_freshness_anomaly(
    batch_id: str,
    produce_type: str,
    category: str = "STANDARD"
):
    # Generate a fake custody history for demo
    import hashlib, random
    seed = int(hashlib.md5(batch_id.encode()).hexdigest(), 16) % 1000
    random.seed(seed)
    
    decay = {"STANDARD": 0.5, "HIGH_SENSITIVITY": 2.0, "HIGH_TOLERANCE": 0.1}[category]
    history = []
    frs = 100.0
    for i in range(4):
        frs -= random.uniform(0, decay * 2)
        history.append(round(frs, 2))
    
    is_anomaly = any(history[i] > history[i-1] + 0.5 for i in range(1, len(history)))
    
    return {
        "batch_id": batch_id,
        "frs_history": history,
        "is_anomaly": is_anomaly,
        "anomaly_type": "PRESERVATIVE_SUSPECTED" if is_anomaly else None,
        "recommendation": "FLAG_FOR_INSPECTION" if is_anomaly else "NORMAL"
    }

@app.get("/produce-categories")
async def get_produce_categories():
    from utils.simulation_engine import DECAY_RATES
    return {
        "categories": ["STANDARD", "HIGH_SENSITIVITY", "HIGH_TOLERANCE"],
        "decay_rates": DECAY_RATES,
        "examples": {
            "HIGH_SENSITIVITY": ["spinach", "lettuce", "mushroom", "strawberry"],
            "STANDARD": ["tomato", "mango", "apple", "carrot"],
            "HIGH_TOLERANCE": ["pumpkin", "onion", "garlic", "watermelon"]
        }
    }
