// src/routes/chat.ts
import express, { Router, Request, Response } from 'express';
import { handleLiveQuery, quickSearch, checkOllamaHealth } from '../services/searchAgent';

const router: Router = express.Router();

/**
 * POST /api/chat/live
 * Live web search endpoint using LangChain + DuckDuckGo
 */
router.post('/live', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: "Message is required" 
      });
    }

    console.log(`📡 Live search request: "${message}"`);

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaHealth();
    if (!ollamaAvailable) {
      return res.status(503).json({
        success: false,
        error: "AI service unavailable",
        fallback_message: "The AI service (Ollama) is not running. Please start Ollama with `ollama serve` and ensure you have the llama3 model pulled."
      });
    }

    // Call the agent
    const response = await handleLiveQuery(message, context);

    res.json({
      success: true,
      data: response,
      source: "live_web_search"
    });

  } catch (error) {
    console.error("Search Agent Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch live data",
      fallback_message: "I'm having trouble connecting to the internet right now. Please try again later."
    });
  }
});

/**
 * POST /api/chat/search
 * Quick search without agent reasoning (faster but less intelligent)
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        success: false,
        error: "Query is required" 
      });
    }

    const results = await quickSearch(query);

    res.json({
      success: true,
      data: results,
      source: "duckduckgo_search"
    });

  } catch (error) {
    console.error("Quick search error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Search failed"
    });
  }
});

/**
 * GET /api/chat/health
 * Check AI service availability
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const ollamaAvailable = await checkOllamaHealth();
    
    res.json({
      success: true,
      services: {
        ollama: ollamaAvailable,
        duckduckgo: true // DuckDuckGo doesn't need auth, always available
      },
      message: ollamaAvailable 
        ? "All AI services are operational"
        : "Ollama is not running. Start it with `ollama serve`"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Health check failed"
    });
  }
});

// Ollama API endpoint (local)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

// System prompt for general banking assistant (NO FEEDBACK ACCESS)
const GENERAL_BANKING_PROMPT = `You are a General Banking AI Assistant for Aura Bank administrators.

IMPORTANT RESTRICTIONS:
- You do NOT have access to customer feedback data
- You CANNOT retrieve, summarize, or analyze feedback
- If asked about feedback, politely redirect to the Feedback section

Your capabilities:
1. Answer general banking questions about policies, procedures, and regulations
2. Explain banking concepts (loans, interest rates, KYC, etc.)
3. Provide guidance on banking operations
4. Discuss industry trends and best practices
5. Help with general administrative queries

When asked about feedback, say:
"I don't have access to feedback data. Please use the **Feedback Management** section in the admin panel to view and analyze customer feedback. The Feedback Analysis Assistant there can help you with:
- Summarizing feedback
- Analyzing trends
- Retrieving specific user feedback"

Current Date: ${new Date().toLocaleDateString()}`;

/**
 * POST /api/chat/general
 * General banking chat WITHOUT feedback access
 */
router.post('/general', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    console.log(`💬 General chat request: "${message}"`);

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaHealth();
    if (!ollamaAvailable) {
      return res.status(503).json({
        success: false,
        error: "AI service unavailable",
        fallback_message: "The AI service (Ollama) is not running. Please start Ollama with `ollama serve` and ensure you have the model pulled."
      });
    }

    // Check if asking about feedback - redirect them
    const lowerMessage = message.toLowerCase();
    const feedbackKeywords = ['feedback', 'complaint', 'review', 'customer issue', 'summarize feedback', 'feedback from'];
    const isFeedbackQuestion = feedbackKeywords.some(keyword => lowerMessage.includes(keyword));

    if (isFeedbackQuestion) {
      return res.json({
        success: true,
        data: {
          response: `I don't have access to feedback data. Please use the **Feedback Management** section in the admin panel to view and analyze customer feedback.

The Feedback Analysis Assistant there can help you with:
• **Summarizing feedback** - "Summarize recent complaints"
• **Analyzing trends** - "What are the top issues?"
• **User-specific feedback** - "Tell me about user John"
• **Filtering** - "Show me resolved feedback"

Navigate to **Admin Panel → Feedback** to access the dedicated feedback assistant.`,
          model: 'redirect',
          feedback_access: false,
        },
      });
    }

    // Call Ollama for general banking queries
    try {
      const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: `${GENERAL_BANKING_PROMPT}\n\n${context ? `Context: ${context}\n\n` : ''}User Question: ${message}`,
          stream: false,
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.status}`);
      }

      const data = await ollamaResponse.json() as { response: string };

      res.json({
        success: true,
        data: {
          response: data.response,
          model: OLLAMA_MODEL,
        },
        source: "local_ai"
      });
    } catch (ollamaError) {
      console.error('Ollama error:', ollamaError);
      res.json({
        success: true,
        data: {
          response: "I apologize, but the AI service is currently unavailable. Please check that Ollama is running locally with the required model.",
          model: 'fallback',
          ai_available: false,
        },
      });
    }
  } catch (error) {
    console.error("General chat error:", error);
    res.status(500).json({
      success: false,
      error: "Chat request failed"
    });
  }
});

export default router;
