import pytest
from models.fallback import rule_based_evaluate

def test_rule_based_evaluate_low_amount():
    score, decision = rule_based_evaluate(100.0)
    assert score == 20.0
    assert decision == "APPROVE"

def test_rule_based_evaluate_high_amount():
    score, decision = rule_based_evaluate(60000.0)
    assert score == 55.0
    assert decision == "FLAG"

def test_rule_based_evaluate_critical_amount():
    score, decision = rule_based_evaluate(150000.0)
    assert score == 85.0
    assert decision == "FLAG"
