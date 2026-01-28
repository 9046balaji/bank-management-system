"""
Script to retrain the expense categorization model
This will regenerate the expense_classifier_clean.pkl and tfidf_vectorizer_clean.pkl files
"""

import pandas as pd
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import os

# Get the directory where this script is located
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(MODEL_DIR, 'backup', 'Smart-Expense-Categorizer-master')

print("="*50)
print("    Retraining Expense Categorization Model")
print("="*50)

# Load the training data
data_path = os.path.join(BACKUP_DIR, 'transactions_clean.csv')
print(f"\n📂 Loading data from: {data_path}")

try:
    df = pd.read_csv(data_path)
    print(f"✅ Loaded {len(df)} transactions")
    print(f"   Columns: {list(df.columns)}")
except Exception as e:
    print(f"❌ Failed to load data: {e}")
    exit(1)

# Identify the columns
# Common column names: 'description', 'category', 'text', 'label'
description_col = None
category_col = None

for col in df.columns:
    col_lower = col.lower()
    if 'desc' in col_lower or 'text' in col_lower or 'transaction' in col_lower:
        description_col = col
    if 'cat' in col_lower or 'label' in col_lower or 'class' in col_lower:
        category_col = col

if description_col is None:
    # Try first column
    description_col = df.columns[0]
if category_col is None:
    # Try second column
    category_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

print(f"\n📊 Using columns:")
print(f"   Description: '{description_col}'")
print(f"   Category: '{category_col}'")

# Clean the data
df = df.dropna(subset=[description_col, category_col])
print(f"\n🧹 After cleaning: {len(df)} transactions")

# Show category distribution
print(f"\n📈 Category distribution:")
for cat, count in df[category_col].value_counts().items():
    print(f"   {cat}: {count}")

# Prepare the data
X = df[description_col].astype(str)
y = df[category_col].astype(str)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"\n🔀 Split: {len(X_train)} train, {len(X_test)} test")

# Create TF-IDF vectorizer
print("\n🔧 Training TF-IDF Vectorizer...")
vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2),
    stop_words='english'
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)
print(f"   Vocabulary size: {len(vectorizer.vocabulary_)}")

# Train classifier
print("\n🤖 Training Logistic Regression Classifier...")
classifier = LogisticRegression(
    max_iter=1000,
    multi_class='multinomial',
    solver='lbfgs',
    random_state=42
)
classifier.fit(X_train_tfidf, y_train)

# Evaluate
train_score = classifier.score(X_train_tfidf, y_train)
test_score = classifier.score(X_test_tfidf, y_test)
print(f"   Train accuracy: {train_score:.2%}")
print(f"   Test accuracy: {test_score:.2%}")

# Save models
print("\n💾 Saving models...")

vectorizer_path = os.path.join(MODEL_DIR, 'tfidf_vectorizer_clean.pkl')
classifier_path = os.path.join(MODEL_DIR, 'expense_classifier_clean.pkl')

with open(vectorizer_path, 'wb') as f:
    pickle.dump(vectorizer, f)
print(f"   ✅ Saved: tfidf_vectorizer_clean.pkl")

with open(classifier_path, 'wb') as f:
    pickle.dump(classifier, f)
print(f"   ✅ Saved: expense_classifier_clean.pkl")

# Test the models by loading them back
print("\n🔍 Verifying models...")
with open(vectorizer_path, 'rb') as f:
    loaded_vectorizer = pickle.load(f)
with open(classifier_path, 'rb') as f:
    loaded_classifier = pickle.load(f)

# Test prediction
test_descriptions = [
    "Swiggy order delivered",
    "Uber ride to airport",
    "Netflix subscription",
    "Amazon shopping",
    "Electricity bill payment"
]

print("\n📋 Test Predictions:")
for desc in test_descriptions:
    tfidf = loaded_vectorizer.transform([desc])
    pred = loaded_classifier.predict(tfidf)[0]
    prob = loaded_classifier.predict_proba(tfidf).max()
    print(f"   '{desc}' → {pred} ({prob:.1%})")

print("\n" + "="*50)
print("    ✅ Model Retraining Complete!")
print("="*50 + "\n")
