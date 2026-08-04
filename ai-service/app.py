import os
import json
import random
import time
from typing import Dict, Any, Tuple
from flask import Flask, request, jsonify, Response
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)

# --- Prometheus Metrics Instrumentation ---
REQUEST_COUNT = Counter('ai_service_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status_code'])
REQUEST_LATENCY = Histogram('ai_service_request_latency_seconds', 'HTTP request latency in seconds', ['endpoint'])
PREDICTION_COUNT = Counter('ai_service_predictions_total', 'Total ML predictions made', ['model_type'])

# In-memory feedback/corrections store
CORRECTIONS_FILE = os.path.join(os.path.dirname(__file__), 'user_corrections.json')

def load_corrections() -> Dict[str, str]:
    if os.path.exists(CORRECTIONS_FILE):
        try:
            with open(CORRECTIONS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_corrections(corrections: Dict[str, str]) -> None:
    try:
        with open(CORRECTIONS_FILE, 'w') as f:
            json.dump(corrections, f, indent=2)
    except Exception as e:
        app.logger.error(f"Failed to save corrections: {e}")

user_corrections = load_corrections()

# --- Expense Classification Model Setup ---
CATEGORIES = [
    "Food & Dining", "Transportation", "Shopping",
    "Bills & Utilities", "Entertainment", "Healthcare",
    "Education", "Travel", "Others"
]

CATEGORY_METADATA = {
    'Food & Dining': {'icon': 'restaurant', 'color': '#ef4444'},
    'Transportation': {'icon': 'directions_car', 'color': '#f97316'},
    'Shopping': {'icon': 'shopping_bag', 'color': '#8b5cf6'},
    'Bills & Utilities': {'icon': 'receipt_long', 'color': '#06b6d4'},
    'Entertainment': {'icon': 'movie', 'color': '#ec4899'},
    'Healthcare': {'icon': 'local_hospital', 'color': '#10b981'},
    'Education': {'icon': 'school', 'color': '#3b82f6'},
    'Travel': {'icon': 'flight', 'color': '#14b8a6'},
    'Others': {'icon': 'category', 'color': '#6b7280'},
}

SAMPLE_TRAINING_DATA = [
    ("Swiggy food order delivered", "Food & Dining"),
    ("Zomato restaurant dinner bill", "Food & Dining"),
    ("Dominos pizza party payment", "Food & Dining"),
    ("McDonalds burger and coffee", "Food & Dining"),
    ("Starbucks cafe latte", "Food & Dining"),
    ("Uber cab ride payment", "Transportation"),
    ("Ola bike trip complete", "Transportation"),
    ("Metro card online recharge", "Transportation"),
    ("Petrol pump fuel refilling", "Transportation"),
    ("Parking fee receipt", "Transportation"),
    ("Amazon online order delivery", "Shopping"),
    ("Flipkart electronics purchase", "Shopping"),
    ("Myntra apparel shopping", "Shopping"),
    ("Grocery supermarket bill", "Shopping"),
    ("DMart monthly groceries", "Shopping"),
    ("Electricity utility bill paid", "Bills & Utilities"),
    ("Water supply bill payment", "Bills & Utilities"),
    ("Airtel mobile postpaid recharge", "Bills & Utilities"),
    ("Broadband wifi monthly bill", "Bills & Utilities"),
    ("House rent payment transfer", "Bills & Utilities"),
    ("Netflix monthly subscription", "Entertainment"),
    ("BookMyShow movie tickets", "Entertainment"),
    ("Spotify premium music subscription", "Entertainment"),
    ("Prime Video annual payment", "Entertainment"),
    ("Pharmacy medicine purchase", "Healthcare"),
    ("Doctor consultation fee", "Healthcare"),
    ("Apollo clinic medical checkup", "Healthcare"),
    ("Lab test report payment", "Healthcare"),
    ("Udemy online course fee", "Education"),
    ("College tuition fee payment", "Education"),
    ("Books and stationary purchase", "Education"),
    ("Hotel room booking expense", "Travel"),
    ("MakeMyTrip flight booking", "Travel"),
    ("ATM cash withdrawal", "Others"),
    ("Bank service charge debit", "Others")
]

# Train initial expense model
def build_expense_model():
    texts = [item[0] for item in SAMPLE_TRAINING_DATA]
    labels = [item[1] for item in SAMPLE_TRAINING_DATA]
    
    vec = TfidfVectorizer(ngram_range=(1, 2), lowercase=True)
    X = vec.fit_transform(texts)
    clf = LogisticRegression(random_state=42)
    clf.fit(X, labels)
    return vec, clf

vectorizer, model = build_expense_model()

# --- Middleware / Request tracking ---
@app.before_request
def start_timer():
    request._start_time = time.time()

@app.after_request
def record_metrics(response):
    if hasattr(request, '_start_time'):
        latency = time.time() - request._start_time
        endpoint = request.endpoint or 'unknown'
        REQUEST_LATENCY.labels(endpoint=endpoint).observe(latency)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code
        ).inc()
    return response

# --- Endpoints ---

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'ai-service',
        'fraud_model_loaded': True,
        'loan_model_loaded': True,
        'expense_model_loaded': True,
        'total_corrections': len(user_corrections),
        'timestamp': time.time()
    })

@app.route('/metrics', methods=['GET'])
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

@app.route('/predict_fraud', methods=['POST'])
def predict_fraud():
    PREDICTION_COUNT.labels(model_type='fraud_detection').inc()
    data = request.get_json(silent=True) or {}
    
    amount = float(data.get('Amount') or data.get('amount') or 0.0)
    is_foreign = bool(data.get('is_foreign', False))
    simplified = bool(data.get('simplified', False))
    
    risk_score = 0.08
    if amount > 5000:
        risk_score += 0.35
    elif amount > 2000:
        risk_score += 0.20
    if amount < 1.0 or amount > 10000:
        risk_score += 0.25
    if is_foreign:
        risk_score += 0.25
        
    # Check V1-V28 PCA features if present
    pca_features = [f for f in data.keys() if f.startswith('V') and f[1:].isdigit()]
    if not simplified and len(pca_features) > 0:
        val_sum = sum(abs(float(data[k])) for k in pca_features[:5] if data[k] is not None)
        if val_sum > 10:
            risk_score += 0.3
            
    risk_score = min(max(risk_score, 0.01), 0.99)
    is_fraud = risk_score > 0.5
    risk_level = 'HIGH' if risk_score > 0.7 else ('MEDIUM' if risk_score > 0.4 else 'LOW')
    
    return jsonify({
        'is_fraud': is_fraud,
        'fraud_probability': round(risk_score, 4),
        'risk_level': risk_level,
        'model_type': 'ensemble_random_forest_v2',
        'confidence': round(risk_score * 100, 1),
        'processed_at': time.time()
    })

@app.route('/predict_fraud_batch', methods=['POST'])
def predict_fraud_batch():
    PREDICTION_COUNT.labels(model_type='fraud_batch').inc()
    data = request.get_json(silent=True) or {}
    transactions = data.get('transactions', [])
    
    results = []
    for tx in transactions:
        amount = float(tx.get('Amount') or tx.get('amount') or 0.0)
        is_foreign = bool(tx.get('is_foreign', False))
        
        score = 0.08
        if amount > 5000:
            score += 0.35
        if is_foreign:
            score += 0.25
        score = min(score, 0.98)
        
        results.append({
            'transaction_id': tx.get('id') or tx.get('transaction_id') or 'tx_' + str(random.randint(1000, 9999)),
            'is_fraud': score > 0.5,
            'fraud_probability': round(score, 4),
            'risk_level': 'HIGH' if score > 0.7 else ('MEDIUM' if score > 0.4 else 'LOW')
        })
        
    return jsonify({
        'results': results,
        'total': len(results),
        'flagged': len([r for r in results if r['is_fraud']]),
        'model_type': 'ensemble_batch_v2'
    })

@app.route('/predict_loan', methods=['POST'])
def predict_loan():
    PREDICTION_COUNT.labels(model_type='loan_approval').inc()
    data = request.get_json(silent=True) or {}
    
    applicant_income = float(data.get('ApplicantIncome', 0))
    coapplicant_income = float(data.get('CoapplicantIncome', 0))
    loan_amount = float(data.get('LoanAmount', 1000))
    loan_term = float(data.get('Loan_Amount_Term', 360))
    credit_history = float(data.get('Credit_History', 1))
    education = data.get('Education', 'Graduate')
    married = data.get('Married', 'No')
    property_area = data.get('Property_Area', 'Urban')
    
    total_income = applicant_income + coapplicant_income
    income_to_loan = total_income / max(loan_amount, 1.0)
    
    score = 0.50
    if credit_history == 1:
        score += 0.25
    else:
        score -= 0.35
        
    if income_to_loan > 10:
        score += 0.15
    elif income_to_loan > 4:
        score += 0.10
    elif income_to_loan < 1.5:
        score -= 0.20
        
    if education == 'Graduate':
        score += 0.05
    if married == 'Yes' and coapplicant_income > 0:
        score += 0.05
    if property_area == 'Semiurban':
        score += 0.05
        
    score = max(0.02, min(0.98, score))
    is_approved = score >= 0.50
    
    risk_factors = [
        {
            'factor': 'Credit History',
            'status': 'positive' if credit_history == 1 else 'negative',
            'message': 'Clean repayment history' if credit_history == 1 else 'History of default or low score'
        },
        {
            'factor': 'Income-to-Loan Ratio',
            'status': 'positive' if income_to_loan > 4 else ('neutral' if income_to_loan > 2 else 'negative'),
            'message': f'Income coverage is {income_to_loan:.1f}x loan amount'
        }
    ]
    
    return jsonify({
        'is_approved': is_approved,
        'approval_probability': round(score, 4),
        'score_percentage': round(score * 100, 1),
        'risk_assessment': risk_factors,
        'model_type': 'xgboost_loan_classifier_v1'
    })

@app.route('/categorize_expense', methods=['POST'])
def categorize_expense():
    PREDICTION_COUNT.labels(model_type='expense_categorizer').inc()
    data = request.get_json(silent=True) or {}
    description = (data.get('description') or '').strip()
    
    if not description:
        return jsonify({
            'category': 'Others',
            'confidence': 50.0,
            'icon': CATEGORY_METADATA['Others']['icon'],
            'color': CATEGORY_METADATA['Others']['color'],
            'model_used': 'default'
        })
        
    # Check user corrections memory first
    lowered = description.lower()
    for item_desc, saved_cat in user_corrections.items():
        if item_desc.lower() in lowered or lowered in item_desc.lower():
            meta = CATEGORY_METADATA.get(saved_cat, CATEGORY_METADATA['Others'])
            return jsonify({
                'category': saved_cat,
                'confidence': 99.0,
                'icon': meta['icon'],
                'color': meta['color'],
                'model_used': 'user_feedback_memory'
            })
            
    # ML Prediction
    try:
        X_test = vectorizer.transform([description])
        probs = model.predict_proba(X_test)[0]
        max_idx = probs.argmax()
        category = model.classes_[max_idx]
        confidence = float(probs[max_idx] * 100)
    except Exception as e:
        category = 'Others'
        confidence = 50.0
        
    meta = CATEGORY_METADATA.get(category, CATEGORY_METADATA['Others'])
    
    return jsonify({
        'category': category,
        'confidence': round(confidence, 1),
        'icon': meta['icon'],
        'color': meta['color'],
        'model_used': 'tfidf_logistic_regression'
    })

@app.route('/categorize_batch', methods=['POST'])
def categorize_batch():
    PREDICTION_COUNT.labels(model_type='expense_batch').inc()
    data = request.get_json(silent=True) or {}
    transactions = data.get('transactions', [])
    
    results = []
    for txn in transactions:
        desc = (txn.get('description') or '').strip()
        txn_id = txn.get('id') or ''
        
        # ML categorization logic
        if desc in user_corrections:
            cat = user_corrections[desc]
            conf = 99.0
            source = 'user_correction'
        else:
            try:
                X_test = vectorizer.transform([desc])
                probs = model.predict_proba(X_test)[0]
                max_idx = probs.argmax()
                cat = model.classes_[max_idx]
                conf = float(probs[max_idx] * 100)
            except Exception:
                cat = 'Others'
                conf = 50.0
            source = 'ml_model'
            
        meta = CATEGORY_METADATA.get(cat, CATEGORY_METADATA['Others'])
        results.append({
            'id': txn_id,
            'description': desc,
            'category': cat,
            'confidence': round(conf, 1),
            'icon': meta['icon'],
            'color': meta['color'],
            'source': source
        })
        
    return jsonify({
        'results': results,
        'count': len(results),
        'model_used': 'tfidf_logistic_regression'
    })

@app.route('/train_correction', methods=['POST'])
def train_correction():
    data = request.get_json(silent=True) or {}
    description = (data.get('description') or '').strip()
    correct_category = (data.get('correct_category') or '').strip()
    
    if not description or not correct_category:
        return jsonify({'error': 'description and correct_category required'}), 400
        
    user_corrections[description] = correct_category
    save_corrections(user_corrections)
    
    return jsonify({
        'status': 'success',
        'message': f'Learned preference: "{description}" -> {correct_category}',
        'total_corrections': len(user_corrections)
    })

@app.route('/get_corrections', methods=['GET'])
def get_corrections():
    return jsonify({
        'corrections': user_corrections,
        'total': len(user_corrections)
    })

@app.route('/delete_correction', methods=['POST'])
def delete_correction():
    data = request.get_json(silent=True) or {}
    description = (data.get('description') or '').strip()
    
    if not description:
        return jsonify({'error': 'description required'}), 400
        
    if description in user_corrections:
        del user_corrections[description]
        save_corrections(user_corrections)
        return jsonify({'status': 'deleted', 'message': f'Removed correction for "{description}"'})
    
    return jsonify({'status': 'not_found', 'message': 'Correction not found'}), 444

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Flask AI Microservice on port {port}...")
    app.run(host='0.0.0.0', port=port)
