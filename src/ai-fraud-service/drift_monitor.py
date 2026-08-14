from prometheus_client import Counter, Histogram

FRAUD_EVALUATIONS_TOTAL = Counter('fraud_evaluations_total', 'Total fraud risk evaluations')
FRAUD_FALLBACK_TOTAL = Counter('fraud_fallback_total', 'Total evaluations using rule-based fallback')
FRAUD_LATENCY_HISTOGRAM = Histogram('fraud_inference_latency_ms', 'Fraud engine latency in milliseconds', buckets=[1, 2, 5, 10, 20, 50, 100])

def record_prediction(score: float, latency_ms: float, used_fallback: bool, amount: float):
    FRAUD_EVALUATIONS_TOTAL.inc()
    if used_fallback:
        FRAUD_FALLBACK_TOTAL.inc()
    FRAUD_LATENCY_HISTOGRAM.observe(latency_ms)
