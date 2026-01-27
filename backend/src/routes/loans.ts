import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// Get all loans
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT l.*, u.full_name, u.email
       FROM loans l
       JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loans',
    });
  }
});

// Get loan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT l.*, u.full_name, u.email
       FROM loans l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loan',
    });
  }
});

// Get loans by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user loans:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loans',
    });
  }
});

// Create new loan
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      loan_reference_id,
      type = 'Personal Loan',
      loan_amount,
      outstanding_balance,
      interest_rate,
      term_months,
      start_date,
      next_emi_date = null,
      emi_amount = null,
      status = 'ACTIVE',
    } = req.body;

    if (!user_id || !loan_amount || !interest_rate || !term_months || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const result = await query(
      `INSERT INTO loans (user_id, loan_reference_id, type, loan_amount, outstanding_balance, 
                         interest_rate, term_months, start_date, next_emi_date, emi_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        user_id,
        loan_reference_id || null,
        type,
        loan_amount,
        outstanding_balance || loan_amount,
        interest_rate,
        term_months,
        start_date,
        next_emi_date,
        emi_amount,
        status,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Loan created successfully',
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create loan',
    });
  }
});

// Get loan applications
router.get('/applications/all', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT la.*, u.full_name, u.email
       FROM loan_applications la
       JOIN users u ON la.user_id = u.id
       ORDER BY la.applied_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching loan applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch applications',
    });
  }
});

// Create loan application
router.post('/applications/create', async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      requested_amount,
      monthly_income = null,
      credit_score = null,
      ai_risk_score = null,
    } = req.body;

    if (!user_id || !requested_amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, requested_amount',
      });
    }

    const result = await query(
      `INSERT INTO loan_applications (user_id, requested_amount, monthly_income, credit_score, ai_risk_score, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [user_id, requested_amount, monthly_income, credit_score, ai_risk_score]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Loan application created successfully',
    });
  } catch (error) {
    console.error('Error creating loan application:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create application',
    });
  }
});

// Update loan status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const result = await query(
      'UPDATE loans SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Loan status updated',
    });
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update loan',
    });
  }
});

// Pay EMI for a loan
router.post('/:id/pay-emi', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { account_id, amount } = req.body;

    if (!account_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Account ID and amount are required',
      });
    }

    // Get loan details
    const loanResult = await query('SELECT * FROM loans WHERE id = $1', [id]);
    if (loanResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Loan is not active',
      });
    }

    // Check account balance
    const accountResult = await query('SELECT * FROM accounts WHERE id = $1', [account_id]);
    if (accountResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const account = accountResult.rows[0];
    if (parseFloat(account.balance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // Calculate new outstanding balance
    const newOutstanding = Math.max(0, parseFloat(loan.outstanding_balance) - parseFloat(amount));
    const newStatus = newOutstanding === 0 ? 'CLOSED' : 'ACTIVE';

    // Calculate next EMI date (30 days from now)
    const nextEmiDate = new Date();
    nextEmiDate.setDate(nextEmiDate.getDate() + 30);

    // Begin transaction - deduct from account
    await query(
      'UPDATE accounts SET balance = balance - $2 WHERE id = $1',
      [account_id, amount]
    );

    // Update loan
    const updatedLoan = await query(
      `UPDATE loans SET 
        outstanding_balance = $2,
        next_emi_date = $3,
        status = $4
       WHERE id = $1 RETURNING *`,
      [id, newOutstanding, newStatus === 'ACTIVE' ? nextEmiDate : null, newStatus]
    );

    // Record transaction
    await query(
      `INSERT INTO transactions (account_id, type, amount, description, recipient_name, status)
       VALUES ($1, 'Withdrawal', $2, $3, 'Aura Bank Loans', 'Completed')`,
      [account_id, amount, `EMI Payment - Loan ${loan.loan_reference_id || id}`]
    );

    // Record loan payment
    await query(
      `INSERT INTO loan_payments (loan_id, amount, paid_at)
       VALUES ($1, $2, NOW())`,
      [id, amount]
    );

    res.json({
      success: true,
      data: updatedLoan.rows[0],
      message: newStatus === 'CLOSED' ? 'Loan fully paid off!' : 'EMI payment successful',
      new_outstanding: newOutstanding,
    });
  } catch (error) {
    console.error('Error processing EMI payment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
    });
  }
});

// Get loan payment history
router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY paid_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching loan payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payments',
    });
  }
});

// Approve/Reject loan application
router.patch('/applications/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by, interest_rate, term_months } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be APPROVED or REJECTED',
      });
    }

    // Get application details
    const appResult = await query('SELECT * FROM loan_applications WHERE id = $1', [id]);
    if (appResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }

    const application = appResult.rows[0];

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Application has already been reviewed',
      });
    }

    // Update application status
    await query(
      `UPDATE loan_applications SET status = $2, reviewed_at = NOW() WHERE id = $1`,
      [id, status]
    );

    // If approved, create the loan
    if (status === 'APPROVED') {
      const rate = interest_rate || 12.5; // Default interest rate
      const months = term_months || 12; // Default term
      const amount = parseFloat(application.requested_amount);
      
      // Calculate EMI: P × r × (1 + r)^n / ((1 + r)^n - 1)
      const monthlyRate = rate / 100 / 12;
      const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);

      const startDate = new Date();
      const nextEmiDate = new Date();
      nextEmiDate.setDate(nextEmiDate.getDate() + 30);

      // Generate loan reference
      const loanRef = `LOAN-${Date.now().toString(36).toUpperCase()}`;

      await query(
        `INSERT INTO loans (user_id, loan_reference_id, type, loan_amount, outstanding_balance, 
                           interest_rate, term_months, start_date, next_emi_date, emi_amount, status)
         VALUES ($1, $2, 'Personal Loan', $3, $3, $4, $5, $6, $7, $8, 'ACTIVE')`,
        [
          application.user_id,
          loanRef,
          amount,
          rate,
          months,
          startDate,
          nextEmiDate,
          emi.toFixed(2)
        ]
      );
    }

    res.json({
      success: true,
      message: `Application ${status.toLowerCase()}`,
      status: status,
    });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review application',
    });
  }
});

// AI Risk Analysis endpoint
router.post('/applications/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { credit_score, monthly_income, loan_amount } = req.body;

    // Get application
    const appResult = await query('SELECT * FROM loan_applications WHERE id = $1', [id]);
    if (appResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }

    // Simple risk scoring algorithm (placeholder for AI integration)
    // In production, this would call Google GenAI or similar
    let riskScore = 50; // Base score

    // Credit score impact (0-30 points)
    if (credit_score) {
      if (credit_score >= 750) riskScore += 30;
      else if (credit_score >= 700) riskScore += 20;
      else if (credit_score >= 650) riskScore += 10;
      else if (credit_score >= 600) riskScore += 0;
      else riskScore -= 20;
    }

    // Debt-to-income ratio (0-20 points)
    if (monthly_income && loan_amount) {
      const monthlyPayment = loan_amount / 12; // Simplified
      const ratio = monthlyPayment / monthly_income;
      if (ratio < 0.2) riskScore += 20;
      else if (ratio < 0.3) riskScore += 15;
      else if (ratio < 0.4) riskScore += 10;
      else if (ratio < 0.5) riskScore += 5;
      else riskScore -= 10;
    }

    // Clamp to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Update application with risk score
    await query(
      'UPDATE loan_applications SET ai_risk_score = $2 WHERE id = $1',
      [id, riskScore]
    );

    // Generate recommendation
    let recommendation = '';
    if (riskScore >= 75) recommendation = 'STRONG_APPROVE';
    else if (riskScore >= 60) recommendation = 'APPROVE';
    else if (riskScore >= 45) recommendation = 'MANUAL_REVIEW';
    else recommendation = 'REJECT';

    res.json({
      success: true,
      data: {
        risk_score: riskScore,
        recommendation: recommendation,
        factors: [
          { name: 'Credit Score', impact: credit_score ? (credit_score >= 700 ? 'positive' : 'negative') : 'neutral' },
          { name: 'Debt-to-Income', impact: monthly_income ? 'analyzed' : 'not_available' },
          { name: 'Loan Amount', impact: 'analyzed' },
        ],
      },
    });
  } catch (error) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze application',
    });
  }
});

// Get loan calculator
router.post('/calculator', async (req: Request, res: Response) => {
  try {
    const { principal, rate, term_months } = req.body;

    if (!principal || !rate || !term_months) {
      return res.status(400).json({
        success: false,
        error: 'Principal, rate, and term_months are required',
      });
    }

    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, term_months)) / 
                (Math.pow(1 + monthlyRate, term_months) - 1);
    
    const totalPayment = emi * term_months;
    const totalInterest = totalPayment - principal;

    // Generate amortization schedule
    const schedule = [];
    let balance = principal;
    
    for (let month = 1; month <= term_months; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;
      
      schedule.push({
        month,
        emi: emi.toFixed(2),
        principal: principalPayment.toFixed(2),
        interest: interestPayment.toFixed(2),
        balance: Math.max(0, balance).toFixed(2),
      });
    }

    res.json({
      success: true,
      data: {
        emi: emi.toFixed(2),
        total_payment: totalPayment.toFixed(2),
        total_interest: totalInterest.toFixed(2),
        principal: principal,
        rate: rate,
        term_months: term_months,
        schedule: schedule,
      },
    });
  } catch (error) {
    console.error('Error calculating loan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate loan',
    });
  }
});

export default router;
