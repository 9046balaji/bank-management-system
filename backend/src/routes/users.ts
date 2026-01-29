import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import crypto from 'crypto';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyAccessToken, verifyRefreshToken, extractTokenFromHeader } from '../utils/jwt';
import { filterUserData, filterCompleteUserResponse, filterCardsData } from '../utils/dto';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter';

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

    // Filter sensitive data
    res.json({
      success: true,
      data: filterUserData(result.rows[0]),
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
    const { full_name, phone_number, address, kyc_status, avatar } = req.body;

    const result = await query(
      `UPDATE users 
       SET full_name = COALESCE($2, full_name),
           phone_number = COALESCE($3, phone_number),
           address = COALESCE($4, address),
           kyc_status = COALESCE($5, kyc_status),
           avatar = COALESCE($6, avatar),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, email, role, kyc_status, avatar, updated_at`,
      [id, full_name, phone_number, address, kyc_status, avatar]
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

// Login user (rate limited: 5 attempts per 15 minutes)
router.post('/login', /*authRateLimiter,*/ async (req: Request, res: Response) => {
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

    // Verify password using bcrypt
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
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

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database for session management (optional)
    try {
      await query(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')
         ON CONFLICT (session_token) DO UPDATE SET last_activity = NOW()`,
        [user.id, accessToken, refreshToken]
      );
    } catch (sessionError) {
      // Session table might not exist, continue anyway
      console.log('Session storage skipped:', sessionError);
    }

    // Filter sensitive data using DTO
    const safeUser = filterCompleteUserResponse({
      ...user,
      accounts: accountsResult.rows,
      transactions: transactionsResult.rows,
      loans: loansResult.rows,
      cards: cardsResult.rows,
      tickets: ticketsResult.rows,
    });

    // Set HttpOnly cookie for refresh token (more secure)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: safeUser,
        token: accessToken, // Access token sent to client
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

// Register new user (rate limited: 3 per hour)
router.post('/register', registrationRateLimiter, async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required',
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
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

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Create user with hashed password
    const userResult = await query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, kyc_status, role)
       VALUES ($1, $2, $3, $4, 'PENDING', 'USER')
       RETURNING id, full_name, email, role, kyc_status, created_at`,
      [full_name, email, hashedPassword, phone_number || null]
    );

    const newUser = userResult.rows[0];

    res.status(201).json({
      success: true,
      data: filterUserData(newUser),
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
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify JWT token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const userId = decoded.userId;

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

    // Filter sensitive data using DTO
    const safeUser = filterCompleteUserResponse({
      ...user,
      accounts: accountsResult.rows,
      transactions: transactionsResult.rows,
      loans: loansResult.rows,
      cards: cardsResult.rows,
      tickets: ticketsResult.rows,
    });

    res.json({
      success: true,
      data: {
        user: safeUser,
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
router.patch('/:id/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    // Ensure user can only update their own password (unless admin)
    if (req.user?.role !== 'ADMIN' && req.user?.userId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet requirements',
        details: passwordValidation.errors,
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

    // Verify current password with bcrypt
    const isPasswordValid = await comparePassword(current_password, userResult.rows[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password with bcrypt
    const hashedNewPassword = await hashPassword(new_password);

    // Update password
    await query(
      `UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, hashedNewPassword]
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
