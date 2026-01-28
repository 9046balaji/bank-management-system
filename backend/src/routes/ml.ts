import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// ML API Base URL (Python Flask server)
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// Helper to safely merge response data
const mergeResponse = (base: Record<string, any>, data: unknown): Record<string, any> => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...base, ...(data as Record<string, any>) };
  }
  return { ...base, data };
};

// ==========================================
// FRAUD DETECTION
// ==========================================
router.post('/fraud/predict', async (req: Request, res: Response) => {
  try {
    // FIX: Explicitly tell Python to use simplified mode if we lack V1-V28 PCA features
    // Without these features, the ML model would receive zeros and produce garbage predictions
    const hasPcaFeatures = req.body.V1 !== undefined && req.body.V1 !== null;
    const payload = {
      ...req.body,
      simplified: !hasPcaFeatures // Force simplified mode if V1 is missing
    };

    const response = await fetch(`${ML_API_URL}/predict_fraud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), // Send the fixed payload
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Fraud):', error);
    
    // Fallback: Use simple heuristic if ML API is unavailable
    const amount = parseFloat(req.body.Amount || req.body.amount || 0);
    let riskScore = 0.1;
    
    if (amount > 5000) riskScore += 0.3;
    else if (amount > 2000) riskScore += 0.15;
    if (amount < 1 || amount > 10000) riskScore += 0.2;
    if (req.body.is_foreign) riskScore += 0.15;
    
    riskScore = Math.min(riskScore, 0.95);
    
    res.json({
      success: true,
      is_fraud: riskScore > 0.5,
      fraud_probability: riskScore,
      risk_level: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
      model_type: 'fallback',
      note: 'ML service unavailable, using fallback scoring',
    });
  }
});

// Batch fraud detection
router.post('/fraud/batch', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/predict_fraud_batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Batch Fraud):', error);
    
    // Fallback for batch
    const transactions = req.body.transactions || [];
    const results = transactions.map((tx: any) => {
      const amount = parseFloat(tx.Amount || tx.amount || 0);
      let riskScore = 0.1;
      if (amount > 5000) riskScore += 0.3;
      if (amount < 1 || amount > 10000) riskScore += 0.2;
      riskScore = Math.min(riskScore, 0.95);
      
      return {
        transaction_id: tx.id || tx.transaction_id,
        is_fraud: riskScore > 0.5,
        fraud_probability: riskScore,
        risk_level: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
      };
    });
    
    res.json({
      success: true,
      results,
      total: results.length,
      flagged: results.filter((r: any) => r.is_fraud).length,
      model_type: 'fallback',
    });
  }
});

// ==========================================
// LOAN PREDICTION
// ==========================================
router.post('/loan/predict', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/predict_loan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Loan):', error);
    
    // Fallback: Use heuristic scoring
    const {
      ApplicantIncome = 0,
      CoapplicantIncome = 0,
      LoanAmount = 1,
      Loan_Amount_Term = 360,
      Credit_History = 1,
      Education = 'Graduate',
      Married = 'No',
      Property_Area = 'Urban',
    } = req.body;
    
    const totalIncome = parseFloat(ApplicantIncome) + parseFloat(CoapplicantIncome);
    const loanAmount = parseFloat(LoanAmount) || 1;
    const loanTerm = parseFloat(Loan_Amount_Term) || 360;
    const creditHistory = parseFloat(Credit_History);
    
    const incomeToLoan = totalIncome / loanAmount;
    const emi = loanAmount / loanTerm;
    
    let score = 0.5;
    
    // Credit history is most important
    if (creditHistory === 1) score += 0.25;
    else score -= 0.35;
    
    // Income to loan ratio
    if (incomeToLoan > 10) score += 0.15;
    else if (incomeToLoan > 5) score += 0.1;
    else if (incomeToLoan < 1) score -= 0.15;
    
    // Education
    if (Education === 'Graduate') score += 0.05;
    
    // Married with coapplicant
    if (Married === 'Yes' && parseFloat(CoapplicantIncome) > 0) score += 0.05;
    
    // Property area
    if (Property_Area === 'Semiurban') score += 0.05;
    else if (Property_Area === 'Rural') score -= 0.05;
    
    score = Math.max(0.05, Math.min(0.95, score));
    
    const riskFactors = [];
    riskFactors.push({
      factor: 'Credit History',
      status: creditHistory === 1 ? 'positive' : 'negative',
      message: creditHistory === 1 ? 'Good credit history' : 'No credit history or defaults',
    });
    riskFactors.push({
      factor: 'Income-to-Loan Ratio',
      status: incomeToLoan > 5 ? 'positive' : incomeToLoan > 2 ? 'neutral' : 'negative',
      message: `Ratio: ${incomeToLoan.toFixed(1)}x`,
    });
    
    res.json({
      success: true,
      is_approved: score >= 0.5,
      approval_probability: score,
      risk_assessment: riskFactors,
      model_type: 'fallback',
      note: 'ML service unavailable, using fallback scoring',
    });
  }
});

// ==========================================
// LOAN CALCULATOR
// ==========================================
router.post('/loan/calculate', async (req: Request, res: Response) => {
  try {
    const { principal, rate = 12, months = 360 } = req.body;
    
    if (!principal || principal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid loan principal',
      });
    }
    
    const annualRate = parseFloat(rate) / 100;
    const monthlyRate = annualRate / 12;
    const numMonths = parseInt(months);
    const p = parseFloat(principal);
    
    let emi: number;
    if (monthlyRate > 0) {
      emi = p * monthlyRate * Math.pow(1 + monthlyRate, numMonths) / 
            (Math.pow(1 + monthlyRate, numMonths) - 1);
    } else {
      emi = p / numMonths;
    }
    
    const totalPayment = emi * numMonths;
    const totalInterest = totalPayment - p;
    
    res.json({
      success: true,
      emi: Math.round(emi * 100) / 100,
      total_payment: Math.round(totalPayment * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100,
      principal: p,
      rate: parseFloat(rate),
      months: numMonths,
    });
  } catch (error) {
    console.error('Loan calculation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Calculation failed',
    });
  }
});

// ==========================================
// EXPENSE CATEGORIZATION
// ==========================================

// Category metadata for fallback
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'pizza', 'burger', 'coffee', 'dinner', 'lunch', 'breakfast', 'mcdonald', 'starbucks', 'domino', 'kfc', 'subway'],
  'Transportation': ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'gas station', 'parking', 'toll', 'cab', 'taxi', 'bus', 'train', 'flight', 'airline'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'mart', 'purchase', 'order', 'delivery', 'grocery'],
  'Bills & Utilities': ['electricity', 'water bill', 'internet', 'broadband', 'mobile recharge', 'rent', 'maintenance', 'utility', 'gas bill', 'phone bill', 'dth'],
  'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'game', 'hotstar', 'prime', 'youtube', 'concert', 'show'],
  'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical', 'clinic', 'health', 'dental', 'lab test'],
  'Education': ['course', 'tuition', 'school', 'college', 'book', 'udemy', 'coursera', 'education', 'training'],
  'Travel': ['hotel', 'booking', 'airbnb', 'makemytrip', 'goibibo', 'travel', 'vacation', 'trip'],
};

const CATEGORY_METADATA: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'restaurant', color: '#ef4444' },
  'Transportation': { icon: 'directions_car', color: '#f97316' },
  'Shopping': { icon: 'shopping_bag', color: '#8b5cf6' },
  'Bills & Utilities': { icon: 'receipt_long', color: '#06b6d4' },
  'Entertainment': { icon: 'movie', color: '#ec4899' },
  'Healthcare': { icon: 'local_hospital', color: '#10b981' },
  'Education': { icon: 'school', color: '#3b82f6' },
  'Travel': { icon: 'flight', color: '#14b8a6' },
  'Others': { icon: 'category', color: '#6b7280' },
};

function getFallbackCategory(description: string): { category: string; confidence: number } {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return { category, confidence: 85 };
    }
  }
  
  return { category: 'Others', confidence: 50 };
}

router.post('/expense/categorize', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/categorize_expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Expense):', error);
    
    // Fallback: Use keyword matching
    const description = req.body.description || '';
    const { category, confidence } = getFallbackCategory(description);
    const metadata = CATEGORY_METADATA[category] || CATEGORY_METADATA['Others'];
    
    res.json({
      success: true,
      category,
      confidence,
      icon: metadata.icon,
      color: metadata.color,
      model_used: 'fallback',
    });
  }
});

router.post('/expense/categorize-batch', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/categorize_batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Expense Batch):', error);
    
    // Fallback: Process each transaction
    const transactions = req.body.transactions || [];
    const results = transactions.map((txn: { id?: string; description?: string }) => {
      const { category, confidence } = getFallbackCategory(txn.description || '');
      const metadata = CATEGORY_METADATA[category] || CATEGORY_METADATA['Others'];
      
      return {
        id: txn.id || '',
        description: txn.description || '',
        category,
        confidence,
        icon: metadata.icon,
        color: metadata.color,
      };
    });
    
    res.json({
      success: true,
      results,
      count: results.length,
      model_used: 'fallback',
    });
  }
});

// ==========================================
// ML SERVICE HEALTH CHECK
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const data = await response.json();
    
    res.json(mergeResponse({
      success: true,
      ml_service: 'connected',
    }, data));
  } catch (error) {
    res.json({
      success: true,
      ml_service: 'disconnected',
      fraud_model_loaded: false,
      loan_model_loaded: false,
      note: 'ML service unavailable, fallback mode active',
    });
  }
});

// ==========================================
// AI LEARNING / USER CORRECTIONS
// ==========================================

/**
 * Train the AI with a user correction
 * This allows users to teach the expense categorizer their preferences
 */
router.post('/expense/train', async (req: Request, res: Response) => {
  try {
    const { description, correct_category } = req.body;

    if (!description || !correct_category) {
      return res.status(400).json({
        success: false,
        error: 'Both description and correct_category are required',
      });
    }

    const response = await fetch(`${ML_API_URL}/train_correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, correct_category }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Train Correction):', error);
    res.status(503).json({
      success: false,
      error: 'ML service unavailable. Corrections will be applied when service is restored.',
    });
  }
});

/**
 * Get all user corrections
 */
router.get('/expense/corrections', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ML_API_URL}/get_corrections`, {
      method: 'GET',
    });

    const data = await response.json();
    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Get Corrections):', error);
    res.json({
      success: true,
      corrections: {},
      total: 0,
      note: 'ML service unavailable',
    });
  }
});

/**
 * Delete a specific user correction
 */
router.post('/expense/corrections/delete', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    const response = await fetch(`${ML_API_URL}/delete_correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(mergeResponse({ success: true }, data));
  } catch (error) {
    console.error('ML API Error (Delete Correction):', error);
    res.status(503).json({
      success: false,
      error: 'ML service unavailable',
    });
  }
});

export default router;
