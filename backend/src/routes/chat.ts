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

export default router;
