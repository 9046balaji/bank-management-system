"""
Script to create a simple fraud detection model
Since we don't have the original credit card dataset, we'll create a simple sklearn model
that can be loaded by ml_api.py and will work with simplified fraud scoring.
"""

import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import os

# Get the directory where this script is located
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

print("="*50)
print("    Creating Fraud Detection Model")
print("="*50)

# Create synthetic training data for fraud detection
# Features: Time, V1-V28 (PCA components), Amount
np.random.seed(42)

n_samples = 1000
n_fraud = 50  # Imbalanced like real fraud data

# Generate normal transactions
normal_data = np.random.randn(n_samples - n_fraud, 30)
normal_data[:, 0] = np.random.uniform(0, 172800, n_samples - n_fraud)  # Time
normal_data[:, 29] = np.abs(np.random.exponential(100, n_samples - n_fraud))  # Amount

# Generate fraudulent transactions (slightly different patterns)
fraud_data = np.random.randn(n_fraud, 30) * 1.5  # Higher variance
fraud_data[:, 0] = np.random.uniform(0, 172800, n_fraud)  # Time
fraud_data[:, 29] = np.abs(np.random.exponential(500, n_fraud))  # Higher amounts

# Combine data
X = np.vstack([normal_data, fraud_data])
y = np.array([0] * (n_samples - n_fraud) + [1] * n_fraud)

# Shuffle
indices = np.random.permutation(len(y))
X = X[indices]
y = y[indices]

print(f"\n📊 Training data:")
print(f"   Total samples: {len(y)}")
print(f"   Normal: {sum(y == 0)}")
print(f"   Fraud: {sum(y == 1)}")

# Train the model
print("\n🤖 Training Random Forest Classifier...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'
)
model.fit(X, y)

# Check model accuracy
train_accuracy = model.score(X, y)
print(f"   Train accuracy: {train_accuracy:.2%}")

# Save the model
model_path = os.path.join(MODEL_DIR, 'credit_card_model.pkl')
print(f"\n💾 Saving model to: credit_card_model.pkl")

with open(model_path, 'wb') as f:
    pickle.dump(model, f)

print("   ✅ Model saved successfully!")

# Verify it loads correctly
print("\n🔍 Verifying model...")
with open(model_path, 'rb') as f:
    loaded_model = pickle.load(f)

# Test prediction
test_sample = np.random.randn(1, 30)
test_sample[0, 29] = 100  # Normal amount
pred = loaded_model.predict(test_sample)
prob = loaded_model.predict_proba(test_sample)[0][1]
print(f"   Test prediction: {'Fraud' if pred[0] == 1 else 'Normal'} (probability: {prob:.2%})")

# Test with high amount
test_sample[0, 29] = 5000  # High amount
pred = loaded_model.predict(test_sample)
prob = loaded_model.predict_proba(test_sample)[0][1]
print(f"   High amount test: {'Fraud' if pred[0] == 1 else 'Normal'} (probability: {prob:.2%})")

print("\n" + "="*50)
print("    ✅ Fraud Model Creation Complete!")
print("="*50 + "\n")
