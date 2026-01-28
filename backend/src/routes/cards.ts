import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import crypto from 'crypto';

const router: Router = express.Router();

// ==========================================
// GET ALL CARDS
// ==========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT c.*, a.account_number, a.user_id, u.full_name as user_name
       FROM cards c
       JOIN accounts a ON c.account_id = a.id
       JOIN users u ON a.user_id = u.id
       ORDER BY c.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cards',
    });
  }
});

// ==========================================
// GET CARD BY ID
// ==========================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, a.account_number, a.balance as account_balance
       FROM cards c
       JOIN accounts a ON c.account_id = a.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch card',
    });
  }
});

// ==========================================
// GET CARDS BY ACCOUNT ID
// ==========================================
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const result = await query(
      `SELECT c.*, a.account_number
       FROM cards c
       JOIN accounts a ON c.account_id = a.id
       WHERE c.account_id = $1
       ORDER BY c.created_at DESC`,
      [accountId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching account cards:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cards',
    });
  }
});

// ==========================================
// GET CARDS BY USER ID
// ==========================================
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT c.*, a.account_number, a.account_type
       FROM cards c
       JOIN accounts a ON c.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cards',
    });
  }
});

// ==========================================
// CREATE NEW CARD
// ==========================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      account_id,
      card_holder_name,
      expiry_date,
      daily_limit = 1500.00,
      is_international_enabled = true,
      is_online_enabled = true,
    } = req.body;

    if (!account_id || !card_holder_name || !expiry_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: account_id, card_holder_name, expiry_date',
      });
    }

    // Verify account exists
    const accountCheck = await query('SELECT id FROM accounts WHERE id = $1', [account_id]);
    if (accountCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Generate masked card number (last 4 digits random)
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const cardNumberMasked = `•••• •••• •••• ${last4}`;

    // Generate default PIN hash (in production, user should set their own PIN)
    const defaultPin = '0000';
    const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');

    const result = await query(
      `INSERT INTO cards (account_id, card_number_masked, card_holder_name, expiry_date, pin_hash, daily_limit, is_international_enabled, is_online_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [account_id, cardNumberMasked, card_holder_name.toUpperCase(), expiry_date, pinHash, daily_limit, is_international_enabled, is_online_enabled]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Card created successfully. Default PIN is 0000 - please change it immediately.',
    });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create card',
    });
  }
});

// ==========================================
// UPDATE CARD SETTINGS
// ==========================================
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { daily_limit, is_international_enabled, is_online_enabled, status } = req.body;

    // Check if card exists
    const cardCheck = await query('SELECT id, status FROM cards WHERE id = $1', [id]);
    if (cardCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    // Don't allow changes to blocked cards (except unblocking by admin)
    if (cardCheck.rows[0].status === 'BLOCKED' && status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Card is blocked. Contact support to unblock.',
      });
    }

    const result = await query(
      `UPDATE cards SET 
        daily_limit = COALESCE($2, daily_limit),
        is_international_enabled = COALESCE($3, is_international_enabled),
        is_online_enabled = COALESCE($4, is_online_enabled),
        status = COALESCE($5, status)
       WHERE id = $1
       RETURNING *`,
      [id, daily_limit, is_international_enabled, is_online_enabled, status]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Card settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update card',
    });
  }
});

// ==========================================
// UPDATE CARD PIN
// ==========================================
router.patch('/:id/pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_pin, new_pin } = req.body;

    if (!current_pin || !new_pin) {
      return res.status(400).json({
        success: false,
        error: 'Both current_pin and new_pin are required',
      });
    }

    if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be exactly 4 digits',
      });
    }

    // Get current PIN hash
    const cardResult = await query('SELECT pin_hash, status FROM cards WHERE id = $1', [id]);
    if (cardResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    const card = cardResult.rows[0];
    if (card.status === 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: 'Card is blocked. Contact support.',
      });
    }

    // Verify current PIN
    const currentPinHash = crypto.createHash('sha256').update(current_pin).digest('hex');
    if (card.pin_hash && currentPinHash !== card.pin_hash) {
      return res.status(401).json({
        success: false,
        error: 'Current PIN is incorrect',
      });
    }

    // Update to new PIN
    const newPinHash = crypto.createHash('sha256').update(new_pin).digest('hex');
    await query('UPDATE cards SET pin_hash = $2 WHERE id = $1', [id, newPinHash]);

    res.json({
      success: true,
      message: 'PIN updated successfully',
    });
  } catch (error) {
    console.error('Error updating PIN:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update PIN',
    });
  }
});

// ==========================================
// VERIFY CARD PIN
// ==========================================
router.post('/:id/verify-pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN is required',
      });
    }

    const cardResult = await query('SELECT pin_hash, status FROM cards WHERE id = $1', [id]);
    if (cardResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    const card = cardResult.rows[0];
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    if (pinHash !== card.pin_hash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
        valid: false,
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'PIN verified successfully',
    });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify PIN',
    });
  }
});

// ==========================================
// REPORT CARD LOST/STOLEN
// ==========================================
router.post('/:id/report-lost', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason = 'Lost or stolen' } = req.body;

    const cardResult = await query('SELECT id, status FROM cards WHERE id = $1', [id]);
    if (cardResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
      });
    }

    if (cardResult.rows[0].status === 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: 'Card is already blocked',
      });
    }

    // Block the card immediately
    await query(
      'UPDATE cards SET status = $2 WHERE id = $1',
      [id, 'BLOCKED']
    );

    // In a real system, you would also:
    // 1. Create a support ticket
    // 2. Send notification to user
    // 3. Log this for security audit

    res.json({
      success: true,
      message: `Card has been blocked. Reason: ${reason}. Please contact support for a replacement card.`,
    });
  } catch (error) {
    console.error('Error reporting lost card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report lost card',
    });
  }
});

// ==========================================
// CARD APPLICATIONS - ADMIN ROUTES
// ==========================================

// Get all card applications (admin)
router.get('/applications/all', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT ca.*, u.full_name, u.email, a.account_number
       FROM card_applications ca
       JOIN users u ON ca.user_id = u.id
       LEFT JOIN accounts a ON ca.account_id = a.id
       ORDER BY ca.applied_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching card applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch card applications',
    });
  }
});

// Get pending card applications (admin)
router.get('/applications/pending', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT ca.*, u.full_name, u.email, a.account_number
       FROM card_applications ca
       JOIN users u ON ca.user_id = u.id
       LEFT JOIN accounts a ON ca.account_id = a.id
       WHERE ca.status = 'PENDING'
       ORDER BY ca.applied_at ASC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching pending card applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending card applications',
    });
  }
});

// Create card application (user)
router.post('/applications/create', async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      account_id,
      card_type = 'CREDIT',
      requested_limit,
      monthly_income,
      employment_status,
      credit_score,
      purpose,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Check for existing pending application
    const existingApp = await query(
      `SELECT id FROM card_applications WHERE user_id = $1 AND status = 'PENDING'`,
      [user_id]
    );

    if (existingApp.rowCount && existingApp.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending card application',
      });
    }

    // Simple AI risk score calculation
    let aiRiskScore = 50;
    if (credit_score) {
      if (credit_score >= 750) aiRiskScore += 30;
      else if (credit_score >= 650) aiRiskScore += 15;
      else if (credit_score < 550) aiRiskScore -= 20;
    }
    if (monthly_income) {
      if (monthly_income >= 100000) aiRiskScore += 15;
      else if (monthly_income >= 50000) aiRiskScore += 10;
      else if (monthly_income < 25000) aiRiskScore -= 10;
    }
    if (employment_status === 'EMPLOYED' || employment_status === 'SELF_EMPLOYED') {
      aiRiskScore += 5;
    }
    aiRiskScore = Math.max(0, Math.min(100, aiRiskScore));

    const result = await query(
      `INSERT INTO card_applications 
       (user_id, account_id, card_type, requested_limit, monthly_income, employment_status, credit_score, purpose, ai_risk_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, account_id, card_type, requested_limit, monthly_income, employment_status, credit_score, purpose, aiRiskScore]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Card application submitted successfully',
    });
  } catch (error) {
    console.error('Error creating card application:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit card application',
    });
  }
});

// Review card application (admin - approve/reject)
router.patch('/applications/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by, daily_limit } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be APPROVED or REJECTED',
      });
    }

    // Validate reviewed_by is a valid UUID if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const reviewerId = reviewed_by && uuidRegex.test(reviewed_by) ? reviewed_by : null;

    // Get application details
    const appResult = await query(
      `SELECT ca.*, u.full_name, a.id as account_id
       FROM card_applications ca
       JOIN users u ON ca.user_id = u.id
       LEFT JOIN accounts a ON ca.account_id = a.id OR a.user_id = ca.user_id
       WHERE ca.id = $1`,
      [id]
    );

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
      `UPDATE card_applications SET status = $2, reviewed_at = NOW(), reviewed_by = $3 WHERE id = $1`,
      [id, status, reviewerId]
    );

    // If approved, create the card
    if (status === 'APPROVED') {
      // Get user's account if not specified
      let accountId = application.account_id;
      if (!accountId) {
        const accountResult = await query(
          `SELECT id FROM accounts WHERE user_id = $1 LIMIT 1`,
          [application.user_id]
        );
        if (accountResult.rowCount && accountResult.rowCount > 0) {
          accountId = accountResult.rows[0].id;
        }
      }

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: 'User has no account to link the card to',
        });
      }

      // Generate card details
      const last4 = Math.floor(1000 + Math.random() * 9000).toString();
      const cardNumberMasked = `•••• •••• •••• ${last4}`;
      
      // Expiry date 5 years from now
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 5);
      const expiryDate = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${String(expDate.getFullYear()).slice(-2)}`;

      // Default PIN hash (1234)
      const defaultPin = '1234';
      const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');

      const cardLimit = daily_limit || application.requested_limit || 5000;

      await query(
        `INSERT INTO cards (account_id, card_number_masked, card_holder_name, expiry_date, pin_hash, daily_limit, is_international_enabled, is_online_enabled, status)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, 'ACTIVE')`,
        [accountId, cardNumberMasked, application.full_name.toUpperCase(), expiryDate, pinHash, cardLimit]
      );
    }

    res.json({
      success: true,
      message: `Card application ${status.toLowerCase()}`,
      status: status,
    });
  } catch (error) {
    console.error('Error reviewing card application:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review application',
    });
  }
});

// Get user's card applications
router.get('/applications/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT * FROM card_applications WHERE user_id = $1 ORDER BY applied_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user card applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch card applications',
    });
  }
});

export default router;
