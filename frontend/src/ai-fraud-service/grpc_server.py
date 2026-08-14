import time
import logging
from models.fraud_model import FraudModel
from models.fallback import rule_based_evaluate
from drift_monitor import record_prediction

logger = logging.getLogger(__name__)
_model = FraudModel()

class FraudServicer:
    """gRPC Servicer handling EvaluateRisk RPCs with circuit breaker fallback."""

    async def EvaluateRisk(self, request, context):
        start = time.perf_counter()
        used_fallback = False

        try:
            score, decision, model_version = await _model.predict(
                amount=getattr(request, 'amount', 0.0),
                user_id=getattr(request, 'user_id', ''),
                location=getattr(request, 'location', ''),
                ip_address=getattr(request, 'ip_address', '')
            )
        except Exception as e:
            logger.warning(f"Model inference failed, activating rule fallback: {e}")
            score, decision = rule_based_evaluate(getattr(request, 'amount', 0.0))
            model_version = "fallback-rules-v1"
            used_fallback = True

        latency_ms = (time.perf_counter() - start) * 1000.0
        record_prediction(score=score, latency_ms=latency_ms, used_fallback=used_fallback, amount=getattr(request, 'amount', 0.0))

        return {
            "fraud_score": score,
            "decision": decision,
            "model_version": model_version,
            "used_fallback": used_fallback
        }
