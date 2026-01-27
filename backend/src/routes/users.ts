import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import crypto from 'crypto';

const router: Router = express.Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, full_name, email, role, kyc_status, created_at FROM users ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

// Create new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { full_name, email, password_hash, phone_number, address } = req.body;

    if (!full_name || !email || !password_hash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: full_name, email, password_hash',
      });
    }

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, address, kyc_status, role)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', 'USER')
       RETURNING id, full_name, email, role, kyc_status, created_at`,
      [full_name, email, password_hash, phone_number || null, address || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
      });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  }
});

// Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, phone_number, address, kyc_status } = req.body;

    const result = await query(
      `UPDATE users 
       SET full_name = COALESCE($2, full_name),
           phone_number = COALESCE($3, phone_number),
           address = COALESCE($4, address),
           kyc_status = COALESCE($5, kyc_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, email, role, kyc_status, updated_at`,
      [id, full_name, phone_number, address, kyc_status]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
});

// Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user by email
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];

    // In production, use bcrypt.compare() - for demo, simple comparison
    // Note: password_hash should be hashed with bcrypt in production
    if (user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Get user's accounts
    const accountsResult = await query(
      'SELECT * FROM accounts WHERE user_id = $1',
      [user.id]
    );

    // Get user's transactions (last 50)
    const transactionsResult = await query(
      `SELECT t.* FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [user.id]
    );

    // Get user's loans
    const loansResult = await query(
      'SELECT * FROM loans WHERE user_id = $1',
      [user.id]
    );

    // Get user's cards
    const cardsResult = await query(
      `SELECT c.* FROM cards c
       JOIN accounts a ON c.account_id = a.id
       WHERE a.user_id = $1`,
      [user.id]
    );

    // Get user's support tickets
    const ticketsResult = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    // Create session token (simplified - use JWT in production)
    const sessionToken = `session_${user.id}_${Date.now()}`;

    // Store session (optional - for session management)
    try {
      await query(
        `INSERT INTO user_sessions (user_id, session_token, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [user.id, sessionToken]
      );
    } catch (sessionError) {
      // Session table might not exist, continue anyway
      console.log('Session storage skipped:', sessionError);
    }

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          accounts: accountsResult.rows,
          transactions: transactionsResult.rows,
          loans: loansResult.rows,
          cards: cardsResult.rows,
          tickets: ticketsResult.rows,
        },
        token: sessionToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required',
      });
    }

    // Check if email exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Create user (in production, hash password with bcrypt)
    const userResult = await query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, kyc_status, role)
       VALUES ($1, $2, $3, $4, 'PENDING', 'USER')
       RETURNING id, full_name, email, role, kyc_status, created_at`,
      [full_name, email, password, phone_number || null]
    );

    const newUser = userResult.rows[0];

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Registration successful. Please complete KYC verification.',
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

// Logout user
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // Invalidate session
      await query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [token]
      ).catch(() => {
        // Session table might not exist
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

// Validate session and get fresh user data (for page refresh)
router.post('/validate-session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Extract user ID from token (format: session_<userId>_<timestamp>)
    const tokenParts = token.split('_');
    if (tokenParts.length < 2) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const userId = tokenParts[1];

    // Check if session exists and is valid
    const sessionResult = await query(
      `SELECT * FROM user_sessions 
       WHERE session_token = $1 
       AND expires_at > NOW()
       AND is_active = true`,
      [token]
    ).catch(() => ({ rows: [], rowCount: 0 }));

    // Even if session table doesn't exist, try to get user by ID from token
    // This is a fallback for simpler session management

    // Get user data
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get user's accounts with fresh balances
    const accountsResult = await query(
      'SELECT * FROM accounts WHERE user_id = $1',
      [user.id]
    );

    // Get user's transactions (last 50)
    const transactionsResult = await query(
      `SELECT t.* FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [user.id]
    );

    // Get user's loans
    const loansResult = await query(
      'SELECT * FROM loans WHERE user_id = $1',
      [user.id]
    );

    // Get user's cards
    const cardsResult = await query(
      `SELECT c.* FROM cards c
       JOIN accounts a ON c.account_id = a.id
       WHERE a.user_id = $1`,
      [user.id]
    );

    // Get user's support tickets
    const ticketsResult = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    // Update last activity
    await query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = $1',
      [token]
    ).catch(() => {});

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          accounts: accountsResult.rows,
          transactions: transactionsResult.rows,
          loans: loansResult.rows,
          cards: cardsResult.rows,
          tickets: ticketsResult.rows,
        },
        token: token,
      },
      message: 'Session valid',
    });
  } catch (error) {
    console.error('Error validating session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Session validation failed',
    });
  }
});

// Get user by email (for login check)
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const result = await query(
      'SELECT id, full_name, email, role, kyc_status FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
});

// Complete KYC and create account
router.post('/:id/complete-kyc', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address, phone_number } = req.body;

    // Update user's KYC status
    const userResult = await query(
      `UPDATE users 
       SET kyc_status = 'VERIFIED',
           address = COALESCE($2, address),
           phone_number = COALESCE($3, phone_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, address, phone_number]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate account number (10 digits)
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    const user = userResult.rows[0];
    delete user.password_hash;

    // Create savings account for user
    const accountResult = await query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance)
       VALUES ($1, $2, 'SAVINGS', 0)
       RETURNING *`,
      [id, accountNumber]
    );

    const account = accountResult.rows[0];

    // Generate card for the account
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const cardNumberMasked = `•••• •••• •••• ${last4}`;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 4);
    const expiryStr = `${String(expiryDate.getMonth() + 1).padStart(2, '0')}/${String(expiryDate.getFullYear()).slice(-2)}`;
    const defaultPin = '0000';
    const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');

    const cardResult = await query(
      `INSERT INTO cards (account_id, card_number_masked, card_holder_name, expiry_date, pin_hash, status, daily_limit, is_international_enabled, is_online_enabled)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 1500.00, true, true)
       RETURNING *`,
      [account.id, cardNumberMasked, user.full_name.toUpperCase(), expiryStr, pinHash]
    );

    res.json({
      success: true,
      data: {
        user,
        account: account,
        card: cardResult.rows[0],
      },
      message: 'KYC completed successfully. Your account and card have been created.',
    });
  } catch (error) {
    console.error('Error completing KYC:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete KYC',
    });
  }
});

// Update user password
router.patch('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    // Verify current password
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (userResult.rows[0].password_hash !== current_password) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Update password (in production, hash with bcrypt)
    await query(
      `UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, new_password]
    );

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password',
    });
  }
});

// Update notification preferences
router.patch('/:id/notifications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notification_preferences } = req.body;

    const result = await query(
      `UPDATE users 
       SET notification_preferences = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, notification_preferences`,
      [id, JSON.stringify(notification_preferences)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Notification preferences updated',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences',
    });
  }
});

export default router;
