import asyncio
import random
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class FraudModel:
    """XGBoost Fraud Prediction Model wrapper."""

    def __init__(self):
        self._loaded = True
        self.version = "xgb-v2.1.0-mlflow"

    def is_loaded(self) -> bool:
        return self._loaded

    async def predict(self, amount: float, user_id: str, location: str = "", ip_address: str = "") -> Tuple[float, str, str]:
        """Runs fast inference targeting p95 < 10ms."""
        # Simulated fast inference computation
        score = random.uniform(5.0, 25.0)
        if amount > 75000:
            score = random.uniform(70.0, 95.0)

        decision = "APPROVE" if score < 30.0 else ("FLAG" if score < 70.0 else "REJECT")
        return score, decision, self.version
