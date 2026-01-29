import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// Ollama API endpoint (local)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

// Type for Ollama response
interface OllamaResponse {
  response: string;
  model?: string;
  done?: boolean;
}

// System prompt for feedback analysis
const FEEDBACK_ANALYSIS_PROMPT = `You are a Banking Product Manager analyzing customer feedback.
Analyze the following customer feedback and provide insights.
Pay attention to the 'Status' of each feedback item.
Output ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "summary": "2-3 sentence executive summary of the feedback",
  "sentiment": "POSITIVE" or "NEUTRAL" or "NEGATIVE",
  "solved_issues": ["issue 1 that is marked resolved", "issue 2 that is fixed"],
  "unsolved_issues": ["issue 3 that is new or pending", "issue 4 that needs attention"],
  "key_issues": ["issue 3", "issue 4"],
  "action_items": ["action 1", "action 2", "action 3"],
  "priority": "HIGH" or "MEDIUM" or "LOW"
}`;

// ==========================================
// GET ALL FEEDBACK (Admin View)
// ==========================================
router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const { status, type, category, limit = 50, offset = 0, sort = 'created_at', order = 'DESC' } = req.query;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      whereConditions.push(`f.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (type && type !== 'ALL') {
      whereConditions.push(`f.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (category && category !== 'ALL') {
      whereConditions.push(`f.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['created_at', 'rating', 'status', 'type'];
    const sortColumn = validSortColumns.includes(sort as string) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT f.*, 
              u.full_name as user_name, 
              u.email as user_email,
              responder.full_name as responder_name
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN users responder ON f.responded_by = responder.id
       ${whereClause}
       ORDER BY f.${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM feedback f ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    });
  }
});

// ==========================================
// CREATE FEEDBACK (Admin/Seed)
// ==========================================
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { user_id, type, category, subject, description, rating, status, is_public } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'subject and description are required',
      });
    }

    const result = await query(
      `INSERT INTO feedback (user_id, type, category, subject, description, rating, status, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        user_id || null,
        type || 'OTHER',
        category || 'APP',
        subject,
        description,
        rating || 3,
        status || 'NEW',
        is_public || false
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Feedback created successfully',
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create feedback',
    });
  }
});

// ==========================================
// GET FEEDBACK STATISTICS
// ==========================================
router.get('/feedback/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalResult,
      byStatusResult,
      byTypeResult,
      byCategoryResult,
      avgRatingResult,
      recentResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as total FROM feedback'),
      query(`SELECT status, COUNT(*) as count FROM feedback GROUP BY status`),
      query(`SELECT type, COUNT(*) as count FROM feedback GROUP BY type`),
      query(`SELECT category, COUNT(*) as count FROM feedback WHERE category IS NOT NULL GROUP BY category`),
      query(`SELECT AVG(rating) as avg_rating, COUNT(rating) as rated_count FROM feedback WHERE rating IS NOT NULL`),
      query(`SELECT COUNT(*) as count FROM feedback WHERE created_at > NOW() - INTERVAL '7 days'`)
    ]);

    const statusCounts: Record<string, number> = {};
    byStatusResult.rows.forEach((row: any) => {
      statusCounts[row.status] = parseInt(row.count);
    });

    const typeCounts: Record<string, number> = {};
    byTypeResult.rows.forEach((row: any) => {
      typeCounts[row.type] = parseInt(row.count);
    });

    const categoryCounts: Record<string, number> = {};
    byCategoryResult.rows.forEach((row: any) => {
      categoryCounts[row.category] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0]?.total || '0'),
        by_status: statusCounts,
        by_type: typeCounts,
        by_category: categoryCounts,
        average_rating: parseFloat(avgRatingResult.rows[0]?.avg_rating || '0').toFixed(1),
        rated_count: parseInt(avgRatingResult.rows[0]?.rated_count || '0'),
        recent_week: parseInt(recentResult.rows[0]?.count || '0'),
      },
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback statistics',
    });
  }
});

// ==========================================
// UPDATE FEEDBACK STATUS (Admin Response)
// ==========================================
router.patch('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, admin_response, responded_by } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (admin_response !== undefined) {
      updates.push(`admin_response = $${paramIndex}`);
      params.push(admin_response);
      paramIndex++;
      updates.push(`responded_at = NOW()`);
    }

    if (responded_by) {
      updates.push(`responded_by = $${paramIndex}`);
      params.push(responded_by);
      paramIndex++;
    }

    updates.push('updated_at = NOW()');

    if (updates.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    params.push(id);

    const result = await query(
      `UPDATE feedback SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Feedback updated successfully',
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feedback',
    });
  }
});

// ==========================================
// AI SUMMARIZE FEEDBACK (Using Ollama)
// ==========================================
router.post('/feedback/summarize', async (req: Request, res: Response) => {
  try {
    const { feedback_ids, admin_id } = req.body;

    if (!feedback_ids || !Array.isArray(feedback_ids) || feedback_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'feedback_ids array is required',
      });
    }

    // 1. Fetch the feedback content from database
    const feedbackResult = await query(
      `SELECT id, subject, description, type, category, rating, status
       FROM feedback 
       WHERE id = ANY($1::uuid[])`,
      [feedback_ids]
    );

    if (feedbackResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No feedback found with the provided IDs',
      });
    }

    // 2. Combine feedback text for the LLM
    const combinedText = feedbackResult.rows.map((f: any, idx: number) =>
      `[Feedback ${idx + 1}]
Type: ${f.type || 'N/A'}
Status: ${f.status || 'NEW'}
Category: ${f.category || 'N/A'}
Rating: ${f.rating ? `${f.rating}/5` : 'N/A'}
Subject: ${f.subject}
Description: ${f.description}`
    ).join('\n\n---\n\n');

    // 3. Call Local Ollama
    let aiInsight;
    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: `${FEEDBACK_ANALYSIS_PROMPT}\n\n=== FEEDBACK DATA (${feedback_ids.length} items) ===\n${combinedText}`,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as OllamaResponse;

      // Parse the AI response
      try {
        aiInsight = JSON.parse(data.response);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiInsight = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }
    } catch (ollamaError) {
      console.error('Ollama API error:', ollamaError);

      // Fallback: Generate a basic summary without AI
      aiInsight = {
        summary: `Analysis of ${feedback_ids.length} feedback items. Types: ${[...new Set(feedbackResult.rows.map((f: any) => f.type))].join(', ')}. Average rating: ${(feedbackResult.rows.reduce((acc: number, f: any) => acc + (f.rating || 0), 0) / feedbackResult.rows.filter((f: any) => f.rating).length || 0).toFixed(1)}/5`,
        sentiment: 'NEUTRAL',
        solved_issues: [],
        unsolved_issues: feedbackResult.rows.map((f: any) => f.subject),
        key_issues: feedbackResult.rows.slice(0, 3).map((f: any) => f.subject),
        action_items: ['Review individual feedback items', 'Respond to users', 'Track resolution'],
        priority: 'MEDIUM',
        ai_available: false,
      };
    }

    // 4. Save the insight to database
    const insertResult = await query(
      `INSERT INTO feedback_insights 
       (admin_id, source_feedback_ids, summary_text, sentiment, key_issues, solved_issues, unsolved_issues, action_items, model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        admin_id || null,
        feedback_ids,
        aiInsight.summary,
        aiInsight.sentiment,
        aiInsight.key_issues || [],
        aiInsight.solved_issues || [],
        aiInsight.unsolved_issues || [],
        aiInsight.action_items || [],
        aiInsight.ai_available === false ? 'fallback' : OLLAMA_MODEL,
      ]
    );

    res.json({
      success: true,
      data: {
        insight: insertResult.rows[0],
        ai_response: aiInsight,
        feedback_count: feedback_ids.length,
      },
      message: 'Feedback summarized successfully',
    });
  } catch (error) {
    console.error('Error summarizing feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize feedback',
    });
  }
});

// ==========================================
// GET SAVED INSIGHTS
// ==========================================
router.get('/feedback/insights', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const result = await query(
      `SELECT fi.*, u.full_name as admin_name
       FROM feedback_insights fi
       LEFT JOIN users u ON fi.admin_id = u.id
       ORDER BY fi.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch insights',
    });
  }
});

// ==========================================
// GET ALL LOAN PAYMENTS (Admin View)
// ==========================================
router.get('/loans/payments', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, loan_id } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (loan_id) {
      whereClause = 'WHERE lp.loan_id = $1';
      params.push(loan_id);
    }

    const result = await query(
      `SELECT lp.*, 
              l.loan_reference_id,
              l.loan_amount,
              l.interest_rate,
              l.term_months,
              l.outstanding_balance,
              l.type as loan_type,
              u.full_name as borrower_name,
              u.email as borrower_email
       FROM loan_payments lp
       JOIN loans l ON lp.loan_id = l.id
       JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY lp.paid_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // Get summary stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_collected,
        COALESCE(SUM(interest_amount), 0) as total_interest_collected,
        COALESCE(SUM(principal_amount), 0) as total_principal_collected
       FROM loan_payments`
    );

    res.json({
      success: true,
      data: result.rows,
      stats: {
        total_payments: parseInt(statsResult.rows[0]?.total_payments || '0'),
        total_collected: parseFloat(statsResult.rows[0]?.total_collected || '0'),
        total_interest_collected: parseFloat(statsResult.rows[0]?.total_interest_collected || '0'),
        total_principal_collected: parseFloat(statsResult.rows[0]?.total_principal_collected || '0'),
      },
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching loan payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loan payments',
    });
  }
});

// ==========================================
// GET LOAN PAYMENT ANALYTICS
// ==========================================
router.get('/loans/analytics', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    // Daily payment trends
    const trendsResult = await query(
      `SELECT 
        DATE(paid_at) as date,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount,
        SUM(interest_amount) as interest_amount,
        SUM(principal_amount) as principal_amount
       FROM loan_payments
       WHERE paid_at > NOW() - INTERVAL '${parseInt(days as string)} days'
       GROUP BY DATE(paid_at)
       ORDER BY date ASC`
    );

    // Loan status distribution
    const statusResult = await query(
      `SELECT status, COUNT(*) as count, SUM(outstanding_balance) as total_outstanding
       FROM loans
       GROUP BY status`
    );

    // Top borrowers by payment
    const topBorrowersResult = await query(
      `SELECT 
        u.id,
        u.full_name,
        COUNT(lp.id) as payment_count,
        SUM(lp.amount) as total_paid
       FROM loan_payments lp
       JOIN loans l ON lp.loan_id = l.id
       JOIN users u ON l.user_id = u.id
       GROUP BY u.id, u.full_name
       ORDER BY total_paid DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        daily_trends: trendsResult.rows,
        loan_status: statusResult.rows,
        top_borrowers: topBorrowersResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching loan analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loan analytics',
    });
  }
});

// ==========================================
// FEEDBACK-ONLY CHAT SYSTEM PROMPT
// ==========================================
const FEEDBACK_CHAT_PROMPT = `You are a Feedback Analysis Assistant for Aura Bank administrators.

IMPORTANT RESTRICTIONS:
- You ONLY answer questions related to customer feedback, feedback analysis, and feedback summaries
- You can help summarize feedback, analyze sentiment, identify trends, and retrieve feedback information
- If asked about ANYTHING not related to feedback (banking operations, loans, transfers, accounts, etc.), politely decline and explain you only handle feedback-related queries

Your capabilities:
1. Summarize feedback data provided in context
2. Analyze sentiment and trends in feedback
3. Identify common issues and complaints
4. Suggest action items based on feedback
5. Answer questions about feedback categories, ratings, and status
6. Help retrieve and filter feedback by various criteria

When declining non-feedback questions, say:
"I'm specialized in feedback analysis only. I can help you with:
- Summarizing customer feedback
- Analyzing feedback trends and sentiment  
- Identifying common issues from feedback
- Retrieving feedback by status, category, or rating
Please ask a feedback-related question, or use other tools for banking operations."`;

// Helper function to check if a query is feedback-related
function isFeedbackRelated(message: string): boolean {
  const feedbackKeywords = [
    'feedback', 'complaint', 'review', 'rating', 'comment', 'suggestion',
    'issue', 'problem', 'bug', 'feature request', 'praise', 'sentiment',
    'summarize', 'summary', 'analyze', 'trend', 'satisfaction', 'unhappy',
    'happy', 'resolved', 'unresolved', 'pending', 'new feedback', 'recent',
    'top issues', 'common problems', 'user complaints', 'customer feedback',
    'what are', 'how many', 'show me', 'list', 'get', 'retrieve', 'find',
    'status', 'category', 'type', 'insight', 'action item',
    'user', 'about', 'tell me', 'from'
  ];
  
  const lowerMessage = message.toLowerCase();
  return feedbackKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to extract user name from a query
function extractUserNameFromQuery(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Patterns to detect user-specific queries
  const patterns = [
    /(?:tell me about|about|feedback from|from user|user)\s+(\w+)/i,
    /(?:what did|what has|show me)\s+(\w+)\s+(?:say|said|submit|feedback)/i,
    /(\w+)(?:'s| 's|s)\s+feedback/i,
    /feedback\s+(?:from|by|of)\s+(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Exclude common words that aren't user names
      const excludeWords = ['the', 'all', 'new', 'recent', 'latest', 'resolved', 'pending', 'this', 'that', 'user', 'users'];
      if (!excludeWords.includes(match[1].toLowerCase())) {
        return match[1];
      }
    }
  }
  
  return null;
}

// ==========================================
// CHAT WITH AI (Feedback-Only Assistant)
// ==========================================
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Check if user wants to retrieve feedback from database
    const lowerMessage = message.toLowerCase();
    const wantsRetrieval = lowerMessage.includes('retrieve') || 
                          lowerMessage.includes('show me') || 
                          lowerMessage.includes('list') ||
                          lowerMessage.includes('get feedback') ||
                          lowerMessage.includes('find feedback') ||
                          lowerMessage.includes('fetch') ||
                          lowerMessage.includes('tell me about') ||
                          lowerMessage.includes('about user');

    let feedbackContext = context || '';
    let retrievedFeedback: any[] = [];

    // Check if asking about a specific user
    const userName = extractUserNameFromQuery(message);

    // If user asks to retrieve feedback, fetch from database
    if (wantsRetrieval || isFeedbackRelated(message)) {
      try {
        // Determine filters based on message
        let statusFilter = null;
        let typeFilter = null;
        let limit = 10;

        if (lowerMessage.includes('resolved')) statusFilter = 'RESOLVED';
        else if (lowerMessage.includes('new') || lowerMessage.includes('pending')) statusFilter = 'NEW';
        else if (lowerMessage.includes('in progress')) statusFilter = 'IN_PROGRESS';
        
        if (lowerMessage.includes('complaint')) typeFilter = 'COMPLAINT';
        else if (lowerMessage.includes('bug')) typeFilter = 'BUG';
        else if (lowerMessage.includes('feature')) typeFilter = 'FEATURE';
        else if (lowerMessage.includes('praise')) typeFilter = 'PRAISE';

        // If asking about a specific user, get ALL their feedback
        if (userName) {
          limit = 100; // Get all feedback from this user
        } else if (lowerMessage.includes('all')) {
          limit = 50;
        } else if (lowerMessage.includes('recent') || lowerMessage.includes('latest')) {
          limit = 5;
        }

        // Build query - include user information
        let queryStr = `SELECT f.id, f.subject, f.description, f.type, f.category, f.rating, f.status, f.created_at,
                        u.full_name as user_name, u.email as user_email
                        FROM feedback f
                        LEFT JOIN users u ON f.user_id = u.id
                        WHERE 1=1`;
        const params: any[] = [];
        let paramIndex = 1;

        // If asking about a specific user, filter by user name
        if (userName) {
          queryStr += ` AND LOWER(u.full_name) LIKE LOWER($${paramIndex})`;
          params.push(`%${userName}%`);
          paramIndex++;
        }

        if (statusFilter) {
          queryStr += ` AND f.status = $${paramIndex}`;
          params.push(statusFilter);
          paramIndex++;
        }
        if (typeFilter) {
          queryStr += ` AND f.type = $${paramIndex}`;
          params.push(typeFilter);
          paramIndex++;
        }

        queryStr += ` ORDER BY f.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const feedbackResult = await query(queryStr, params);
        retrievedFeedback = feedbackResult.rows;

        // Add retrieved feedback to context
        if (retrievedFeedback.length > 0) {
          if (userName) {
            feedbackContext += `\n\n=== ALL FEEDBACK FROM USER "${userName.toUpperCase()}" (${retrievedFeedback.length} items) ===\n`;
          } else {
            feedbackContext += `\n\n=== RETRIEVED FEEDBACK (${retrievedFeedback.length} items) ===\n`;
          }
          retrievedFeedback.forEach((f: any, idx: number) => {
            feedbackContext += `\n[${idx + 1}] Subject: ${f.subject}
   User: ${f.user_name || 'Anonymous'} (${f.user_email || 'No email'})
   Type: ${f.type} | Status: ${f.status} | Rating: ${f.rating || 'N/A'}/5
   Category: ${f.category || 'N/A'}
   Description: ${f.description?.substring(0, 300)}${f.description?.length > 300 ? '...' : ''}
   Date: ${new Date(f.created_at).toLocaleDateString()}\n`;
          });
        } else if (userName) {
          feedbackContext += `\n\nNo feedback found from user matching "${userName}". The user may not have submitted any feedback or the name may be spelled differently.`;
        }
      } catch (dbError) {
        console.error('Error fetching feedback for chat:', dbError);
      }
    }

    // Check if the question is feedback-related
    if (!isFeedbackRelated(message) && !wantsRetrieval && !userName) {
      return res.json({
        success: true,
        data: {
          response: `I'm specialized in feedback analysis only. I can help you with:

• **Summarizing customer feedback** - "Summarize recent complaints"
• **Analyzing feedback trends** - "What are the top issues?"
• **Retrieving feedback** - "Show me resolved feedback" or "List new complaints"
• **User-specific feedback** - "Tell me about user John" or "Show feedback from Balaji"
• **Sentiment analysis** - "How is user satisfaction trending?"
• **Identifying issues** - "What are common problems reported?"

Please ask a feedback-related question. For banking operations, loans, or account management, please use the appropriate sections of the admin panel.`,
          model: 'feedback-guard',
          feedback_only: true,
        },
      });
    }

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: `${FEEDBACK_CHAT_PROMPT}\n\n${feedbackContext ? `Context:\n${feedbackContext}\n\n` : ''}User Query: ${message}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as OllamaResponse;

      res.json({
        success: true,
        data: {
          response: data.response,
          model: OLLAMA_MODEL,
          retrieved_count: retrievedFeedback.length,
        },
      });
    } catch (ollamaError) {
      // Fallback response if Ollama is not available
      let fallbackResponse = "I apologize, but the AI service is currently unavailable. Please check that Ollama is running locally.";
      
      // If we have retrieved feedback, still provide useful info
      if (retrievedFeedback.length > 0) {
        fallbackResponse = `AI service is offline, but here's what I found in the database:\n\n`;
        fallbackResponse += `📊 **Retrieved ${retrievedFeedback.length} feedback items:**\n\n`;
        retrievedFeedback.slice(0, 5).forEach((f: any, idx: number) => {
          fallbackResponse += `${idx + 1}. **${f.subject}** (${f.status})\n   Type: ${f.type} | Rating: ${f.rating || 'N/A'}/5\n\n`;
        });
        if (retrievedFeedback.length > 5) {
          fallbackResponse += `...and ${retrievedFeedback.length - 5} more items.`;
        }
      }

      res.json({
        success: true,
        data: {
          response: fallbackResponse,
          model: 'fallback',
          ai_available: false,
          retrieved_count: retrievedFeedback.length,
        },
      });
    }
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat',
    });
  }
});

export default router;
