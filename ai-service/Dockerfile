FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5001

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
