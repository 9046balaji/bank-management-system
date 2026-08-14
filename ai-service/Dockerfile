# ============================================================
# AI Service Dockerfile — Multi-Stage Build (FIX #22)
# Stage 1: Install deps → Stage 2: Lean production image
# Separates build-time system packages from runtime image
# ============================================================

# ── Stage 1: Dependency Builder ──────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies (not needed at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements into a target directory
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production Runtime ───────────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app

# Prevent Python from writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5001

# Copy installed packages from builder (no build tools in final image)
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Expose microservice port
EXPOSE 5001

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Healthcheck command
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

# Run with Gunicorn WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "60", "app:app"]
