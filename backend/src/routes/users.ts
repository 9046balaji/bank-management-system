import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

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

export default router;
