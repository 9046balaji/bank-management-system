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

export default router;
