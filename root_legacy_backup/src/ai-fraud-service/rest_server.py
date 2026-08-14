from fastapi import FastAPI, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from models.fraud_model import FraudModel

app = FastAPI(title="AuraBank AI Fraud Engine REST & Health API")
model = FraudModel()

@app.get("/healthz/startup")
async def startup():
    if not model.is_loaded():
        return Response(status_code=503, content='{"status":"loading"}')
    return {"status": "ok", "service": "ai-fraud-service"}

@app.get("/healthz/live")
async def live():
    return {"status": "ok"}

@app.get("/healthz/ready")
async def ready():
    if not model.is_loaded():
        return Response(status_code=503, content='{"status":"model not ready"}')
    return {"status": "ready", "model_version": model.version}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
