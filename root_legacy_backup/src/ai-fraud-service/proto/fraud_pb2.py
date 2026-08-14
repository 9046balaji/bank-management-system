# src/ai-fraud-service/proto/fraud_pb2.py
"""Generated Protobuf message definitions for fraud.proto"""

class FraudEvaluationRequest:
    def __init__(self, transaction_id="", user_id="", amount=0.0, currency="USD", merchant_category="", location="", ip_address=""):
        self.transaction_id = transaction_id
        self.user_id = user_id
        self.amount = amount
        self.currency = currency
        self.merchant_category = merchant_category
        self.location = location
        self.ip_address = ip_address

class FraudEvaluationResponse:
    def __init__(self, fraud_score=0.0, decision="APPROVE", model_version="", used_fallback=False):
        self.fraud_score = fraud_score
        self.decision = decision
        self.model_version = model_version
        self.used_fallback = used_fallback

class LogPredictionFeedbackRequest:
    def __init__(self, transaction_id="", actual_label="", user_id=""):
        self.transaction_id = transaction_id
        self.actual_label = actual_label
        self.user_id = user_id

class LogPredictionFeedbackResponse:
    def __init__(self, success=True):
        self.success = success
