"""
Aura Bank ML API Server
Provides endpoints for:
- Credit Card Fraud Detection
- Loan Eligibility Prediction
- Smart Expense Categorization (TF-IDF + Logistic Regression)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pickle
import pandas as pd
import numpy as np
import os
import warnings

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Get the directory where this script is located
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

# Load models
fraud_model = None
loan_model = None
expense_classifier = None
expense_vectorizer = None

def load_models():
    """Load ML models on startup"""
    global fraud_model, loan_model, expense_classifier, expense_vectorizer
    
    try:
        # Load fraud detection model (pickle format)
        fraud_model_path = os.path.join(MODEL_DIR, 'credit_card_model.pkl')
        if os.path.exists(fraud_model_path):
            with open(fraud_model_path, 'rb') as f:
                fraud_model = pickle.load(f)
            print(f"✓ Fraud detection model loaded from {fraud_model_path}")
        else:
            print(f"⚠ Fraud model not found at {fraud_model_path}")
    except Exception as e:
        print(f"⚠ Error loading fraud model: {e}")
    
    try:
        # Load loan prediction model (joblib format)
        loan_model_path = os.path.join(MODEL_DIR, 'load_prediction_model.joblib')
        if os.path.exists(loan_model_path):
            loan_model = joblib.load(loan_model_path)
            print(f"✓ Loan prediction model loaded from {loan_model_path}")
        else:
            print(f"⚠ Loan model not found at {loan_model_path}")
    except Exception as e:
        print(f"⚠ Error loading loan model: {e}")
    
    try:
        # Load expense categorization model (TF-IDF + Logistic Regression)
        expense_model_path = os.path.join(MODEL_DIR, 'expense_classifier_clean.pkl')
        vectorizer_path = os.path.join(MODEL_DIR, 'tfidf_vectorizer_clean.pkl')
        
        if os.path.exists(expense_model_path) and os.path.exists(vectorizer_path):
            expense_classifier = joblib.load(expense_model_path)
            expense_vectorizer = joblib.load(vectorizer_path)
            print(f"✓ Expense categorizer model loaded from {expense_model_path}")
        else:
            print(f"⚠ Expense model not found at {expense_model_path}")
    except Exception as e:
        print(f"⚠ Error loading expense model: {e}")

# Load models on import
load_models()


# ==========================================
# HEALTH CHECK
# ==========================================
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'fraud_model_loaded': fraud_model is not None,
        'loan_model_loaded': loan_model is not None,
        'expense_model_loaded': expense_classifier is not None and expense_vectorizer is not None
    })


# ==========================================
# FRAUD DETECTION ENDPOINT
# ==========================================
@app.route('/predict_fraud', methods=['POST'])
def predict_fraud():
    """
    Predict if a transaction is fraudulent.
    
    Expected input (JSON):
    {
        "Time": float,       # Seconds from first transaction
        "V1": float,         # PCA components V1-V28
        "V2": float,
        ...
        "V28": float,
        "Amount": float      # Transaction amount
    }
    
    For simplified usage (just amount-based risk scoring):
    {
        "Amount": float,
        "simplified": true
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        # Simplified mode - just use amount-based risk scoring
        if data.get('simplified', False):
            amount = float(data.get('Amount', 0))
            
            # Simple heuristic-based fraud scoring
            # High amounts and unusual patterns increase risk
            risk_score = 0.0
            
            # Amount-based risk factors
            if amount > 5000:
                risk_score += 0.3
            elif amount > 2000:
                risk_score += 0.15
            elif amount > 1000:
                risk_score += 0.05
                
            # Very small or very large transactions are suspicious
            if amount < 1 or amount > 10000:
                risk_score += 0.2
                
            # Time-based factor (if provided)
            hour = data.get('hour', 12)
            if hour < 6 or hour > 23:  # Late night transactions
                risk_score += 0.1
            
            # Foreign transaction
            if data.get('is_foreign', False):
                risk_score += 0.15
                
            # Multiple rapid transactions
            if data.get('rapid_transactions', False):
                risk_score += 0.25
            
            # Cap at 0.95
            risk_score = min(risk_score, 0.95)
            
            return jsonify({
                'is_fraud': risk_score > 0.5,
                'fraud_probability': round(risk_score, 4),
                'risk_level': 'HIGH' if risk_score > 0.7 else 'MEDIUM' if risk_score > 0.4 else 'LOW',
                'model_type': 'heuristic'
            })
        
        # Full model prediction (requires V1-V28 PCA features)
        if fraud_model is None:
            return jsonify({
                'error': 'Fraud detection model not loaded',
                'fallback': True,
                'is_fraud': False,
                'fraud_probability': 0.0
            }), 503
        
        # Build feature vector for fraud model
        # Features: Time, V1-V28, Amount
        features = []
        feature_names = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
        
        for feat in feature_names:
            value = data.get(feat, 0)
            features.append(float(value) if value is not None else 0.0)
        
        # Create DataFrame with correct column names
        X = pd.DataFrame([features], columns=feature_names)
        
        # Predict
        prediction = int(fraud_model.predict(X)[0])
        
        # Get probability if available
        try:
            probability = float(fraud_model.predict_proba(X)[0][1])
        except:
            probability = float(prediction)
        
        return jsonify({
            'is_fraud': bool(prediction),
            'fraud_probability': round(probability, 4),
            'risk_level': 'HIGH' if probability > 0.7 else 'MEDIUM' if probability > 0.4 else 'LOW',
            'model_type': 'ml_model'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================
# LOAN PREDICTION ENDPOINT
# ==========================================
@app.route('/predict_loan', methods=['POST'])
def predict_loan():
    """
    Predict loan eligibility.
    
    Expected input (JSON):
    {
        "Gender": "Male" | "Female",
        "Married": "Yes" | "No",
        "Dependents": 0 | 1 | 2 | 3,
        "Education": "Graduate" | "Not Graduate",
        "Self_Employed": "Yes" | "No",
        "ApplicantIncome": float,
        "CoapplicantIncome": float,
        "LoanAmount": float,
        "Loan_Amount_Term": float,  # in months (e.g., 360)
        "Credit_History": 0 | 1,
        "Property_Area": "Urban" | "Rural" | "Semiurban"
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        # Extract and validate input
        applicant_income = float(data.get('ApplicantIncome', 0))
        coapplicant_income = float(data.get('CoapplicantIncome', 0))
        loan_amount = float(data.get('LoanAmount', 0))
        loan_term = float(data.get('Loan_Amount_Term', 360))
        credit_history = float(data.get('Credit_History', 1))
        dependents = data.get('Dependents', 0)
        
        # Handle '3+' dependents
        if isinstance(dependents, str):
            dependents = 3 if dependents == '3+' else int(dependents)
        else:
            dependents = int(dependents)
        
        # Feature engineering (matching training pipeline)
        total_income = applicant_income + coapplicant_income
        
        # Avoid division by zero
        if loan_term == 0:
            loan_term = 360
        if loan_amount == 0:
            loan_amount = 1
            
        emi = loan_amount / loan_term
        income_to_loan = total_income / (loan_amount + 1)
        loan_per_person = loan_amount / (dependents + 1)
        
        # If model is loaded, use it
        if loan_model is not None:
            try:
                # Build features matching the model's expected input
                # One-hot encoded features from training
                features = {
                    'ApplicantIncome': applicant_income,
                    'CoapplicantIncome': coapplicant_income,
                    'LoanAmount': loan_amount,
                    'Loan_Amount_Term': loan_term,
                    'Credit_History': credit_history,
                    'Dependents': float(dependents),
                    'Total_Income': total_income,
                    'EMI': emi,
                    'Income_to_Loan': income_to_loan,
                    'Loan_per_person': loan_per_person,
                    # One-hot encoded categorical features
                    'Gender_Male': 1 if data.get('Gender', 'Male') == 'Male' else 0,
                    'Married_Yes': 1 if data.get('Married', 'No') == 'Yes' else 0,
                    'Education_Not Graduate': 1 if data.get('Education', 'Graduate') == 'Not Graduate' else 0,
                    'Self_Employed_Yes': 1 if data.get('Self_Employed', 'No') == 'Yes' else 0,
                    'Property_Area_Semiurban': 1 if data.get('Property_Area', 'Urban') == 'Semiurban' else 0,
                    'Property_Area_Urban': 1 if data.get('Property_Area', 'Urban') == 'Urban' else 0,
                }
                
                # Create DataFrame
                X = pd.DataFrame([features])
                
                # Predict
                prediction = int(loan_model.predict(X)[0])
                
                # Get probability if available
                try:
                    probability = float(loan_model.predict_proba(X)[0][1])
                except:
                    probability = float(prediction)
                
                return jsonify({
                    'is_approved': bool(prediction),
                    'approval_probability': round(probability, 4),
                    'risk_assessment': get_risk_factors(data, emi, income_to_loan, credit_history),
                    'model_type': 'ml_model'
                })
                
            except Exception as model_error:
                print(f"Model prediction error: {model_error}")
                # Fall through to heuristic model
        
        # Heuristic-based prediction (fallback)
        score = 0.5  # Base score
        
        # Credit history is the strongest predictor
        if credit_history == 1:
            score += 0.25
        else:
            score -= 0.35
        
        # Income to loan ratio
        if income_to_loan > 10:
            score += 0.15
        elif income_to_loan > 5:
            score += 0.1
        elif income_to_loan > 2:
            score += 0.05
        elif income_to_loan < 1:
            score -= 0.15
        
        # EMI affordability (EMI should be < 40% of monthly income)
        monthly_income = total_income / 12
        if monthly_income > 0:
            emi_ratio = emi / monthly_income
            if emi_ratio < 0.2:
                score += 0.1
            elif emi_ratio < 0.4:
                score += 0.05
            elif emi_ratio > 0.5:
                score -= 0.1
        
        # Education bonus
        if data.get('Education', 'Graduate') == 'Graduate':
            score += 0.05
        
        # Married with coapplicant income
        if data.get('Married', 'No') == 'Yes' and coapplicant_income > 0:
            score += 0.05
        
        # Property area (semiurban has highest approval rate historically)
        property_area = data.get('Property_Area', 'Urban')
        if property_area == 'Semiurban':
            score += 0.05
        elif property_area == 'Rural':
            score -= 0.05
        
        # Clamp score
        score = max(0.05, min(0.95, score))
        
        return jsonify({
            'is_approved': score >= 0.5,
            'approval_probability': round(score, 4),
            'risk_assessment': get_risk_factors(data, emi, income_to_loan, credit_history),
            'model_type': 'heuristic'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_risk_factors(data, emi, income_to_loan, credit_history):
    """Generate risk assessment breakdown"""
    factors = []
    
    # Credit history
    if credit_history == 1:
        factors.append({
            'factor': 'Credit History',
            'status': 'positive',
            'message': 'Good credit history'
        })
    else:
        factors.append({
            'factor': 'Credit History',
            'status': 'negative',
            'message': 'No credit history or defaults'
        })
    
    # Income to loan ratio
    if income_to_loan > 5:
        factors.append({
            'factor': 'Income-to-Loan Ratio',
            'status': 'positive',
            'message': f'Strong ratio: {income_to_loan:.1f}x'
        })
    elif income_to_loan > 2:
        factors.append({
            'factor': 'Income-to-Loan Ratio',
            'status': 'neutral',
            'message': f'Adequate ratio: {income_to_loan:.1f}x'
        })
    else:
        factors.append({
            'factor': 'Income-to-Loan Ratio',
            'status': 'negative',
            'message': f'Low ratio: {income_to_loan:.1f}x'
        })
    
    # EMI analysis
    monthly_income = (float(data.get('ApplicantIncome', 0)) + float(data.get('CoapplicantIncome', 0))) / 12
    if monthly_income > 0:
        emi_percent = (emi / monthly_income) * 100
        if emi_percent < 30:
            factors.append({
                'factor': 'EMI Affordability',
                'status': 'positive',
                'message': f'EMI is {emi_percent:.1f}% of monthly income'
            })
        elif emi_percent < 50:
            factors.append({
                'factor': 'EMI Affordability',
                'status': 'neutral',
                'message': f'EMI is {emi_percent:.1f}% of monthly income'
            })
        else:
            factors.append({
                'factor': 'EMI Affordability',
                'status': 'negative',
                'message': f'EMI is {emi_percent:.1f}% of monthly income (high)'
            })
    
    return factors


# ==========================================
# BATCH PREDICTION ENDPOINT
# ==========================================
@app.route('/predict_fraud_batch', methods=['POST'])
def predict_fraud_batch():
    """Batch prediction for multiple transactions"""
    try:
        data = request.json
        transactions = data.get('transactions', [])
        
        results = []
        for tx in transactions:
            # Use simplified scoring for batch
            amount = float(tx.get('Amount', tx.get('amount', 0)))
            
            risk_score = 0.0
            if amount > 5000:
                risk_score += 0.3
            elif amount > 2000:
                risk_score += 0.15
            if amount < 1 or amount > 10000:
                risk_score += 0.2
            if tx.get('is_foreign', False):
                risk_score += 0.15
                
            risk_score = min(risk_score, 0.95)
            
            results.append({
                'transaction_id': tx.get('id', tx.get('transaction_id')),
                'is_fraud': risk_score > 0.5,
                'fraud_probability': round(risk_score, 4),
                'risk_level': 'HIGH' if risk_score > 0.7 else 'MEDIUM' if risk_score > 0.4 else 'LOW'
            })
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'flagged': sum(1 for r in results if r['is_fraud'])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================
# LOAN CALCULATOR ENDPOINT
# ==========================================
@app.route('/calculate_loan', methods=['POST'])
def calculate_loan():
    """Calculate loan EMI and total payment"""
    try:
        data = request.json
        
        principal = float(data.get('principal', data.get('LoanAmount', 0)))
        annual_rate = float(data.get('rate', data.get('interest_rate', 12))) / 100
        months = int(data.get('months', data.get('Loan_Amount_Term', 360)))
        
        if principal <= 0 or months <= 0:
            return jsonify({'error': 'Invalid loan amount or term'}), 400
        
        # Monthly interest rate
        monthly_rate = annual_rate / 12
        
        # EMI calculation: P × r × (1 + r)^n / ((1 + r)^n - 1)
        if monthly_rate > 0:
            emi = principal * monthly_rate * pow(1 + monthly_rate, months) / (pow(1 + monthly_rate, months) - 1)
        else:
            emi = principal / months
        
        total_payment = emi * months
        total_interest = total_payment - principal
        
        return jsonify({
            'emi': round(emi, 2),
            'total_payment': round(total_payment, 2),
            'total_interest': round(total_interest, 2),
            'principal': principal,
            'rate': annual_rate * 100,
            'months': months
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================
# EXPENSE CATEGORIZATION ENDPOINT
# ==========================================

# Category mappings for icons/colors in frontend
CATEGORY_METADATA = {
    'Food & Dining': {'icon': 'restaurant', 'color': '#ef4444'},
    'Transportation': {'icon': 'directions_car', 'color': '#f97316'},
    'Shopping': {'icon': 'shopping_bag', 'color': '#8b5cf6'},
    'Bills & Utilities': {'icon': 'receipt_long', 'color': '#06b6d4'},
    'Entertainment': {'icon': 'movie', 'color': '#ec4899'},
    'Healthcare': {'icon': 'local_hospital', 'color': '#10b981'},
    'Education': {'icon': 'school', 'color': '#3b82f6'},
    'Travel': {'icon': 'flight', 'color': '#14b8a6'},
    'Personal Care': {'icon': 'spa', 'color': '#f472b6'},
    'Others': {'icon': 'category', 'color': '#6b7280'}
}

def get_category_fallback(description: str) -> tuple:
    """Fallback keyword-based categorization when ML model unavailable"""
    description_lower = description.lower()
    
    # Food & Dining keywords
    if any(kw in description_lower for kw in ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'pizza', 
                                               'burger', 'coffee', 'dinner', 'lunch', 'breakfast', 
                                               'mcdonald', 'starbucks', 'domino', 'kfc', 'subway']):
        return 'Food & Dining', 0.85
    
    # Transportation
    if any(kw in description_lower for kw in ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 
                                               'gas station', 'parking', 'toll', 'cab', 'taxi', 
                                               'bus', 'train', 'flight', 'airline']):
        return 'Transportation', 0.85
    
    # Shopping
    if any(kw in description_lower for kw in ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 
                                               'mart', 'purchase', 'order', 'delivery', 'grocery']):
        return 'Shopping', 0.85
    
    # Bills & Utilities
    if any(kw in description_lower for kw in ['electricity', 'water bill', 'internet', 'broadband', 
                                               'mobile recharge', 'rent', 'maintenance', 'utility', 
                                               'gas bill', 'phone bill', 'dth']):
        return 'Bills & Utilities', 0.85
    
    # Entertainment
    if any(kw in description_lower for kw in ['netflix', 'spotify', 'movie', 'cinema', 'game', 
                                               'hotstar', 'prime', 'youtube', 'concert', 'show']):
        return 'Entertainment', 0.85
    
    # Healthcare
    if any(kw in description_lower for kw in ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical', 
                                               'clinic', 'health', 'dental', 'lab test']):
        return 'Healthcare', 0.85
    
    # Education
    if any(kw in description_lower for kw in ['course', 'tuition', 'school', 'college', 'book', 
                                               'udemy', 'coursera', 'education', 'training']):
        return 'Education', 0.85
    
    # Travel
    if any(kw in description_lower for kw in ['hotel', 'booking', 'airbnb', 'makemytrip', 
                                               'goibibo', 'travel', 'vacation', 'trip']):
        return 'Travel', 0.85
    
    # Default
    return 'Others', 0.50


@app.route('/categorize_expense', methods=['POST'])
def categorize_expense():
    """
    Categorize a transaction description using TF-IDF + Logistic Regression.
    Falls back to keyword matching if model not loaded.
    
    Request body: {
        "description": "Swiggy order delivered Rs 450"
    }
    
    Response: {
        "category": "Food & Dining",
        "confidence": 92.5,
        "icon": "restaurant",
        "color": "#ef4444"
    }
    """
    try:
        data = request.json
        description = data.get('description', '')
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        if expense_classifier is not None and expense_vectorizer is not None:
            # Use ML model
            input_tfidf = expense_vectorizer.transform([description])
            prediction = expense_classifier.predict(input_tfidf)[0]
            confidence = float(expense_classifier.predict_proba(input_tfidf).max() * 100)
        else:
            # Fallback to keyword matching
            prediction, confidence = get_category_fallback(description)
            confidence = confidence * 100
        
        # Get metadata for the category
        metadata = CATEGORY_METADATA.get(prediction, CATEGORY_METADATA['Others'])
        
        return jsonify({
            'category': prediction,
            'confidence': round(confidence, 2),
            'icon': metadata['icon'],
            'color': metadata['color'],
            'model_used': 'ml' if expense_classifier is not None else 'fallback'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/categorize_batch', methods=['POST'])
def categorize_batch():
    """
    Categorize multiple transaction descriptions at once.
    
    Request body: {
        "transactions": [
            {"id": "txn1", "description": "Uber ride to airport"},
            {"id": "txn2", "description": "Netflix subscription"}
        ]
    }
    
    Response: {
        "results": [
            {"id": "txn1", "category": "Transportation", "confidence": 88.5, ...},
            {"id": "txn2", "category": "Entertainment", "confidence": 95.2, ...}
        ]
    }
    """
    try:
        data = request.json
        transactions = data.get('transactions', [])
        
        if not transactions:
            return jsonify({'error': 'Transactions array is required'}), 400
        
        results = []
        for txn in transactions:
            txn_id = txn.get('id', '')
            description = txn.get('description', '')
            
            if expense_classifier is not None and expense_vectorizer is not None:
                input_tfidf = expense_vectorizer.transform([description])
                prediction = expense_classifier.predict(input_tfidf)[0]
                confidence = float(expense_classifier.predict_proba(input_tfidf).max() * 100)
            else:
                prediction, confidence = get_category_fallback(description)
                confidence = confidence * 100
            
            metadata = CATEGORY_METADATA.get(prediction, CATEGORY_METADATA['Others'])
            
            results.append({
                'id': txn_id,
                'description': description,
                'category': prediction,
                'confidence': round(confidence, 2),
                'icon': metadata['icon'],
                'color': metadata['color']
            })
        
        return jsonify({
            'results': results,
            'count': len(results),
            'model_used': 'ml' if expense_classifier is not None else 'fallback'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🏦 Aura Bank ML API Server")
    print("="*50)
    print(f"Fraud Model:   {'✓ Loaded' if fraud_model else '✗ Not found'}")
    print(f"Loan Model:    {'✓ Loaded' if loan_model else '✗ Not found'}")
    print(f"Expense Model: {'✓ Loaded' if expense_classifier else '✗ Not found'}")
    print("="*50)
    print("Starting server on http://localhost:5001")
    print("="*50 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
