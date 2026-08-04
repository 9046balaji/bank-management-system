import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import json
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    rv = client.get('/health')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert data['status'] == 'healthy'
    assert data['service'] == 'ai-service'

def test_metrics_endpoint(client):
    rv = client.get('/metrics')
    assert rv.status_code == 200
    assert b'ai_service_requests_total' in rv.data

def test_predict_fraud(client):
    payload = {
        'Amount': 6000,
        'is_foreign': True
    }
    rv = client.post('/predict_fraud', json=payload)
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert 'is_fraud' in data
    assert 'fraud_probability' in data
    assert data['risk_level'] in ['HIGH', 'MEDIUM', 'LOW']

def test_predict_loan(client):
    payload = {
        'ApplicantIncome': 8000,
        'CoapplicantIncome': 2000,
        'LoanAmount': 1500,
        'Credit_History': 1
    }
    rv = client.post('/predict_loan', json=payload)
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert 'is_approved' in data
    assert 'approval_probability' in data

def test_categorize_expense(client):
    payload = {'description': 'Swiggy food order delivered'}
    rv = client.post('/categorize_expense', json=payload)
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert 'category' in data
    assert data['category'] == 'Food & Dining'

def test_train_correction_workflow(client):
    # Add correction
    rv = client.post('/train_correction', json={
        'description': 'Custom Widget Store Purchase',
        'correct_category': 'Shopping'
    })
    assert rv.status_code == 200
    
    # Verify in categorizer
    rv = client.post('/categorize_expense', json={'description': 'Custom Widget Store Purchase'})
    data = json.loads(rv.data)
    assert data['category'] == 'Shopping'
    assert data['model_used'] == 'user_feedback_memory'
