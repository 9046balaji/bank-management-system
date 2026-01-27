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

// ==========================================
// AI CHATBOT (Ollama Integration)
// ==========================================
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, userId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Construct the prompt with banking context
    const systemPrompt = `You are Aura, the AI Support Assistant for Aura Bank. 
You are helpful, professional, and concise.
Your capabilities:
- Answer questions about banking services (accounts, cards, loans, transfers)
- Help with common issues (blocking cards, checking balances, loan applications)
- Guide users through processes
- Explain banking terms and fees

Rules:
- If you don't know the answer or it requires account-specific data, ask the user to create a support ticket.
- Do not invent or guess banking data like balances or account numbers.
- Keep responses concise (2-3 sentences when possible).
- Be friendly but professional.
- For security-sensitive actions (password reset, card blocking), always recommend using the app features or contacting support.

Current context: User is logged in to Aura Bank app.`;

    const conversation = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    // Call Local Ollama Instance
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b';

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: conversation,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 256 // Limit response length
        }
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama error:', errorText);
      throw new Error('Ollama connection failed');
    }

    const data = await response.json() as { message?: { content?: string } };
    
    res.json({
      success: true,
      reply: data.message?.content || "I'm sorry, I couldn't generate a response."
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    // Provide helpful fallback responses based on common queries
    const userMessage = (req.body.message || '').toLowerCase();
    let fallbackReply = "I'm currently offline (AI service not connected). Please submit a support ticket for assistance, or try again later.";
    
    // Simple keyword-based fallbacks
    if (userMessage.includes('block') && userMessage.includes('card')) {
      fallbackReply = "To block your card: Go to 'My Cards' → Click 'Block Card' → Enter your password to confirm. For immediate assistance, please call our 24/7 helpline.";
    } else if (userMessage.includes('transfer') || userMessage.includes('send money')) {
      fallbackReply = "To transfer money: Go to 'Transfers' → Enter recipient account number → Enter amount → Confirm with your PIN. Need help? Create a support ticket.";
    } else if (userMessage.includes('loan')) {
      fallbackReply = "For loan inquiries: Visit the 'Loans' section to apply for a new loan, check EMI schedule, or make payments. Our AI is offline, so please submit a ticket for specific questions.";
    } else if (userMessage.includes('balance') || userMessage.includes('account')) {
      fallbackReply = "Your account balance is shown on the Dashboard. For detailed statements, visit 'My Cards' → 'Statements'. I'm currently offline - please submit a ticket for account-specific help.";
    }
    
    res.json({
      success: true,
      reply: fallbackReply,
      isOffline: true
    });
  }
});

// ==================== FEEDBACK ROUTES ====================

// Submit new feedback
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { user_id, rating, category, comment } = req.body;
    
    if (!user_id || !rating || !category) {
      return res.status(400).json({ error: 'Missing required fields: user_id, rating, category' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const validCategories = ['SERVICE', 'APP', 'FEATURE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${validCategories.join(', ')}` });
    }

    const result = await query(
      `INSERT INTO user_feedback (user_id, rating, category, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [user_id, rating, category, comment || null]
    );

    res.status(201).json({
      success: true,
      feedback: result.rows[0],
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get all feedback for a user
router.get('/feedback/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      `SELECT * FROM user_feedback 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      feedback: result.rows
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get all feedback (admin)
router.get('/feedback/all', async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    
    let queryText = `
      SELECT uf.*, u.full_name as user_name, u.email as user_email
      FROM user_feedback uf
      JOIN users u ON uf.user_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status === 'resolved') {
      conditions.push(`uf.is_resolved = true`);
    } else if (status === 'unresolved') {
      conditions.push(`uf.is_resolved = false`);
    }

    if (category) {
      params.push(category);
      conditions.push(`uf.category = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY uf.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      feedback: result.rows
    });
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Admin respond to feedback
router.patch('/feedback/:id/respond', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_response, is_resolved } = req.body;

    if (!admin_response) {
      return res.status(400).json({ error: 'Admin response is required' });
    }

    const result = await query(
      `UPDATE user_feedback 
       SET admin_response = $1, 
           is_resolved = $2, 
           responded_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [admin_response, is_resolved || false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({
      success: true,
      feedback: result.rows[0],
      message: 'Response saved successfully'
    });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Get feedback statistics (admin)
router.get('/feedback/stats', async (req: Request, res: Response) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_feedback,
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_count,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_count,
        COUNT(CASE WHEN is_resolved = true THEN 1 END) as resolved_count,
        COUNT(CASE WHEN is_resolved = false THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN category = 'SERVICE' THEN 1 END) as service_count,
        COUNT(CASE WHEN category = 'APP' THEN 1 END) as app_count,
        COUNT(CASE WHEN category = 'FEATURE' THEN 1 END) as feature_count,
        COUNT(CASE WHEN category = 'OTHER' THEN 1 END) as other_count
      FROM user_feedback
    `);

    const ratingDistribution = await query(`
      SELECT rating, COUNT(*) as count
      FROM user_feedback
      GROUP BY rating
      ORDER BY rating
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      ratingDistribution: ratingDistribution.rows
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
