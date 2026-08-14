# src/ai-fraud-service/proto/fraud_pb2_grpc.py
"""Generated gRPC servicer and stub interfaces for fraud.proto"""

class FraudServiceServicer:
    """Base servicer interface for FraudService gRPC endpoints."""

    async def EvaluateRisk(self, request, context):
        raise NotImplementedError('Method not implemented!')

    async def LogPredictionFeedback(self, request, context):
        raise NotImplementedError('Method not implemented!')
