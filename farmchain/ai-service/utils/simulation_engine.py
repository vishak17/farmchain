import numpy as np
import hashlib
import time
from typing import Optional

DECAY_RATES = {
    "STANDARD": 0.0005,
    "HIGH_SENSITIVITY": 0.0020,
    "HIGH_TOLERANCE": 0.0001
}

FRESHNESS_THRESHOLDS = {
    "STANDARD": [(9800, "A+"), (9500, "A"), (9000, "B"), (8500, "C"), (0, "D")],
    "HIGH_SENSITIVITY": [(9800, "A+"), (9600, "A"), (9300, "B"), (9000, "C"), (0, "D")],
    "HIGH_TOLERANCE": [(9500, "A+"), (9200, "A"), (8800, "B"), (8500, "C"), (0, "D")]
}

def seeded_random(seed_str: str) -> np.random.Generator:
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    return np.random.default_rng(seed)

def get_grade(frs_pct: float, category: str) -> str:
    frs_bp = int(frs_pct * 100)
    for threshold, grade in FRESHNESS_THRESHOLDS[category]:
        if frs_bp >= threshold:
            return grade
    return "D"

class SimulationEngine:
    def analyze(self, request, image_array=None):
        start = time.time()
        rng = seeded_random(request.batch_id + request.produce_type)
        
        hours = request.hours_since_harvest or (request.node_type * 4 + 2)
        decay_rate = DECAY_RATES[request.category]
        
        # Weight-based FRS estimate
        frs_estimate = (1.0 - decay_rate) ** hours * 100
        frs_estimate = float(np.clip(frs_estimate, 50.0, 100.0))
        
        # Add controlled noise
        frs_noise = float(rng.normal(0, 0.3))
        frs_estimate = float(np.clip(frs_estimate + frs_noise, 50.0, 100.0))
        
        # If real image provided, use RGB analysis
        if image_array is not None:
            try:
                mean_rgb = np.mean(image_array.reshape(-1, 3), axis=0)
                green_ratio = mean_rgb[1] / (mean_rgb.sum() + 1e-6)
                # Greener = fresher for most produce
                image_freshness_adj = (green_ratio - 0.33) * 10
                frs_estimate = float(np.clip(frs_estimate + image_freshness_adj, 50.0, 100.0))
                colour_variance = float(np.std(image_array.reshape(-1, 3)))
            except:
                colour_variance = 30.0
        else:
            colour_variance = float(rng.uniform(20, 50))
        
        grade = get_grade(frs_estimate, request.category)
        
        # Count estimation with noise
        count_noise = int(rng.normal(0, max(1, request.declared_count * 0.04)))
        # Apply transit loss: 1-2% per node
        transit_loss_pct = request.node_type * rng.uniform(0.005, 0.015)
        adjusted_count = int(request.declared_count * (1 - transit_loss_pct))
        estimated_count = max(0, adjusted_count + count_noise)
        count_delta = abs(estimated_count - request.declared_count) / max(1, request.declared_count)
        count_anomaly = count_delta > 0.10
        fraud_flag = count_delta > 0.20  # >20% missing = likely fraud
        
        # Freshness indicators
        is_degraded = frs_estimate < 90
        spoilage = bool(rng.random() < (0.001 * max(0, 100 - frs_estimate)))
        bruising = bool(rng.random() < (0.002 * max(0, 100 - frs_estimate) + request.node_type * 0.01))
        mould = bool(rng.random() < (0.0005 * max(0, 100 - frs_estimate)))
        
        # Preservative flag: FRS suspiciously high for the elapsed time
        expected_min_frs = (1.0 - decay_rate) ** hours * 100 - 5.0
        preservative_flag = frs_estimate > expected_min_frs + 3.0 and hours > 12
        
        # Wilting: high sensitivity produce
        wilting = request.category == "HIGH_SENSITIVITY" and hours > 8 and bool(rng.random() < 0.15)
        
        # Colour anomaly: high uniformity surface (preservative coating)
        surface_uniformity = float(np.clip(1.0 - (colour_variance / 100.0), 0, 1))
        colour_anomaly = surface_uniformity > 0.85  # too uniform = suspicious
        
        flags = []
        if preservative_flag: flags.append("PRESERVATIVE_SUSPECTED")
        if fraud_flag: flags.append("COUNT_FRAUD_SUSPECTED")
        if count_anomaly: flags.append(f"COUNT_MISMATCH_{count_delta*100:.0f}PCT")
        if mould: flags.append("MOULD_DETECTED")
        if bruising: flags.append("BRUISING_DETECTED")
        if colour_anomaly: flags.append("SURFACE_ANOMALY")
        
        # Mock IPFS hash
        ipfs_input = f"{request.batch_id}{request.node_type}{frs_estimate}"
        ipfs_hash = "Qm" + hashlib.sha256(ipfs_input.encode()).hexdigest()[:44]
        
        elapsed_ms = (time.time() - start) * 1000
        
        return {
            "batch_id": request.batch_id,
            "visual_frs_confidence": float(np.clip(0.85 + rng.normal(0, 0.05), 0.6, 0.98)),
            "visual_frs_estimate": round(frs_estimate, 2),
            "item_count": {
                "estimated_count": estimated_count,
                "confidence": float(np.clip(0.90 - count_delta, 0.5, 0.99)),
                "count_anomaly": count_anomaly,
                "count_delta_pct": round(count_delta * 100, 2),
                "fraud_flag": fraud_flag
            },
            "freshness": {
                "visual_freshness_score": round(frs_estimate, 2),
                "spoilage_detected": spoilage,
                "bruising_detected": bruising,
                "mould_detected": mould,
                "colour_anomaly": colour_anomaly,
                "preservative_flag": preservative_flag,
                "wilting_detected": wilting,
                "surface_uniformity": round(surface_uniformity, 3)
            },
            "overall_quality_label": grade,
            "grade": grade,
            "flags": flags,
            "ipfs_hash": ipfs_hash,
            "processing_time_ms": round(elapsed_ms, 2),
            "model_version": "simulation_v1.0"
        }

engine = SimulationEngine()
