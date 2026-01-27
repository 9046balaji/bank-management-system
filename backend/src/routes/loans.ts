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

export default router;
