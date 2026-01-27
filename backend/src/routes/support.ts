import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// ==========================================
// GET ALL TICKETS (Admin) or filtered
// ==========================================
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    let queryText = `
      SELECT t.*, u.full_name, u.email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
    `;
    const params: string[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status as string);
      conditions.push(`t.status = $${params.length}`);
    }
    if (category) {
      params.push(category as string);
      conditions.push(`t.category = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }
    queryText += ' ORDER BY t.created_at DESC';

    const result = await query(queryText, params);
    res.json({ 
      success: true, 
      data: result.rows, 
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch tickets' 
    });
  }
});

// ==========================================
// GET TICKETS BY USER ID
// ==========================================
router.get('/tickets/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ 
      success: true, 
      data: result.rows,
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch tickets' 
    });
  }
});

// ==========================================
// GET SINGLE TICKET WITH COMMENTS
// ==========================================
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ticket = await query(
      `SELECT t.*, u.full_name, u.email
       FROM support_tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`, 
      [id]
    );
    
    if (ticket.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Get comments for this ticket
    const comments = await query(
      `SELECT tc.*, u.full_name as author_name
       FROM ticket_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = $1 
       ORDER BY tc.created_at ASC`,
      [id]
    );

    res.json({ 
      success: true, 
      data: { 
        ...ticket.rows[0], 
        comments: comments.rows 
      }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch ticket' 
    });
  }
});

// ==========================================
// CREATE NEW TICKET
// ==========================================
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { user_id, subject, category, description } = req.body;

    if (!user_id || !subject || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, subject, category'
      });
    }

    // Generate unique reference ID
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const refId = `TK-${timestamp}${random}`;

    const result = await query(
      `INSERT INTO support_tickets (user_id, ticket_reference_id, subject, category, description, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING *`,
      [user_id, refId, subject, category, description || null]
    );

    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create ticket' 
    });
  }
});

// ==========================================
// UPDATE TICKET STATUS
// ==========================================
router.patch('/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await query(
      'UPDATE support_tickets SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Ticket status updated'
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update ticket' 
    });
  }
});

// ==========================================
// ADD COMMENT TO TICKET
// ==========================================
router.post('/tickets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, comment, is_staff = false } = req.body;

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Comment is required'
      });
    }

    // Verify ticket exists
    const ticketCheck = await query('SELECT id FROM support_tickets WHERE id = $1', [id]);
    if (ticketCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    const result = await query(
      `INSERT INTO ticket_comments (ticket_id, user_id, comment, is_staff)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, user_id || null, comment, is_staff]
    );

    // If staff is replying, update ticket status to IN_PROGRESS if it was OPEN
    if (is_staff) {
      await query(
        `UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = $1 AND status = 'OPEN'`,
        [id]
      );
    }

    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add comment' 
    });
  }
});

// ==========================================
// GET TICKET COMMENTS
// ==========================================
router.get('/tickets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT tc.*, u.full_name as author_name
       FROM ticket_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = $1 
       ORDER BY tc.created_at ASC`,
      [id]
    );

    res.json({ 
      success: true, 
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch comments' 
    });
  }
});

// ==========================================
// GET TICKET STATISTICS (Admin Dashboard)
// ==========================================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'OPEN') as open_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_count,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d
      FROM support_tickets
    `);

    res.json({ 
      success: true, 
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch statistics' 
    });
  }
});

export default router;
