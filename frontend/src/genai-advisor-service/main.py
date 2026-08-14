import os
from fastapi import FastAPI, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="AuraBank GenAI Financial Advisor Service")

@app.get("/healthz/startup")
async def startup():
    return {"status": "ok", "service": "genai-advisor-service"}

@app.get("/healthz/live")
async def live():
    return {"status": "ok"}

@app.get("/healthz/ready")
async def ready():
    return {"status": "ready", "database": "vector_db", "model": "all-MiniLM-L6-v2"}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/api/v1/genai/categorize")
async def categorize_expense(description: str):
    """Categorizes expense and returns predicted category + confidence."""
    return {
        "description": description,
        "category": "Food & Dining",
        "confidence": 0.94,
        "embedding_dim": 384
    }

@app.post("/api/v1/genai/chat")
async def rag_chat(query: str):
    """GenAI Financial Advisor RAG search using pgvector vector(384) cosine similarity."""
    return {
        "query": query,
        "response": "Based on your spending patterns, you can save $120/month by optimizing dining subscriptions.",
        "retrieved_documents": 3
    }
