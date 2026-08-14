"""
Rule-based fraud evaluation used when:
1. Model is loading (cold start)
2. Model inference throws an exception
3. Model response exceeds timeout threshold

These rules must NEVER block a payment — they are conservative defaults.
"""

def rule_based_evaluate(amount: float) -> tuple[float, str]:
    """Returns (score, decision) using simple deterministic heuristic rules."""
    if amount > 100000.0:
        return 85.0, "FLAG"     # Very high amount — flag for manual review
    if amount > 50000.0:
        return 55.0, "FLAG"     # High amount — flag
    return 20.0, "APPROVE"      # Default: approve with low score
