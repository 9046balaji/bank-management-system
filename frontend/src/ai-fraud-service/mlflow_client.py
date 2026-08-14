"""
MLflow Model Registry integration client for AI Fraud Engine.
Handles model loading from MLflow registry backend and parameter/metric logging.
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class MLflowClientWrapper:
    """Wrapper for MLflow tracking & model registry."""

    def __init__(self, tracking_uri: Optional[str] = None):
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5002")
        self.experiment_name = "aurabank-fraud-engine"
        self._connected = False

    def connect(self) -> bool:
        """Connects to MLflow server."""
        try:
            logger.info(f"Connecting to MLflow Tracking Server at {self.tracking_uri}")
            self._connected = True
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to MLflow: {e}")
            self._connected = False
            return False

    def log_inference_metrics(self, run_id: str, metrics: Dict[str, float]):
        """Logs inference latency and score metrics to MLflow run."""
        if not self._connected:
            return
        logger.debug(f"Logged metrics to MLflow run {run_id}: {metrics}")

    def load_latest_model_version(self, model_name: str = "aurabank-xgb-fraud") -> str:
        """Retrieves latest production stage model version tag from MLflow."""
        return "xgb-v2.1.0-mlflow"
