// src/services/searchAgent.ts
import { ChatOllama } from "@langchain/ollama";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

// 1. Initialize the Search Tool
// We limit results to 3 to keep the context window small for the local model
const searchTool = new DuckDuckGoSearch({
  maxResults: 3,
});

// 2. Initialize the Model
// Note: We use temperature 0 to make the model factual and less creative
const model = new ChatOllama({
  baseUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "gemma3:4b",
  temperature: 0,
});

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Fallback knowledge base for common banking queries when web search fails
 */
const fallbackKnowledge: Record<string, string> = {
  'rbi': `The Reserve Bank of India (RBI) is India's central bank. As of recent updates:
- Repo Rate: 6.50% (as per latest RBI MPC decision)
- Reverse Repo Rate: 3.35%
- CRR (Cash Reserve Ratio): 4.50%
- SLR (Statutory Liquidity Ratio): 18%
Note: These rates may have been updated. Please check the official RBI website for the latest rates.`,

  'interest': `Current indicative interest rates in India:
- Savings Account: 2.70% - 4.00% p.a.
- Fixed Deposit (1 year): 6.50% - 7.50% p.a.
- Home Loan: 8.50% - 10.00% p.a.
- Personal Loan: 10.50% - 15.00% p.a.
Note: Rates vary by bank. Check with your specific bank for exact rates.`,

  'gold': `Gold prices in India fluctuate based on international markets:
- 24 Karat Gold: ~₹7,500 - ₹7,800 per gram
- 22 Karat Gold: ~₹6,900 - ₹7,200 per gram
Note: Prices change daily. Check current rates on financial websites.`,
};

/**
 * Get fallback response based on query keywords
 */
function getFallbackResponse(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  for (const [key, value] of Object.entries(fallbackKnowledge)) {
    if (lowerQuery.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Main function to handle user queries with live web search
 * Uses a simpler approach without the ReAct agent pattern
 */
export async function handleLiveQuery(userQuestion: string, context?: string): Promise<string> {
  console.log(`🕵️ Processing query: "${userQuestion}"`);

  let searchResults: string | null = null;
  let isFromFallback = false;

  try {
    // First, try to search the web with retry
    console.log('🔍 Searching web...');
    searchResults = await retryWithBackoff(
      () => searchTool.invoke(userQuestion),
      2, // 2 retries
      2000 // 2 second initial delay
    );
    console.log('📄 Search results received');
  } catch (error) {
    console.warn('⚠️ Web search failed:', (error as Error).message);

    // Try fallback knowledge
    searchResults = getFallbackResponse(userQuestion);
    if (searchResults) {
      console.log('📚 Using fallback knowledge base');
      isFromFallback = true;
    } else {
      // Use the AI model's built-in knowledge
      console.log('🧠 Using AI model knowledge (no web search)');
      searchResults = "No web search results available. Please answer based on your training knowledge, and indicate that this is from your knowledge base, not live data.";
      isFromFallback = true;
    }
  }

  // Define a system prompt to guide the model's behavior
  const systemMessage = `You are an intelligent banking assistant for Aura Bank.
${isFromFallback
      ? 'Note: Live web search was unavailable. The following information is from the knowledge base or your training data. Please indicate this to the user.'
      : 'You have been provided with search results from the web. Use this information to answer the user\'s question.'}

RULES:
1. ${isFromFallback ? 'Use the provided information or your training knowledge.' : 'Use the search results to provide accurate, current information.'}
2. Do not guess numbers or make up data. ${isFromFallback ? 'Indicate that rates may have changed.' : 'Only cite information from the search results.'}
3. If you don't have relevant information, say so clearly.
4. Be concise and professional.
5. Current Date: ${new Date().toLocaleDateString()}
${context ? `\nContext: ${context}` : ''}

${isFromFallback ? 'KNOWLEDGE BASE INFORMATION' : 'SEARCH RESULTS'}:
${searchResults}

Now answer the user's question based on the above information.`;

  try {
    // Use the model to synthesize a response
    const response = await model.invoke([
      { role: "system", content: systemMessage },
      { role: "user", content: userQuestion }
    ]);

    // Extract the content from the response
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    return 'I processed your request but couldn\'t format the response properly.';
  } catch (error) {
    console.error('Model invocation error:', error);
    throw error;
  }
}

/**
 * Simple search without model synthesis
 * Useful for quick lookups
 */
export async function quickSearch(query: string): Promise<string> {
  try {
    const results = await retryWithBackoff(
      () => searchTool.invoke(query),
      2,
      2000
    );
    return results;
  } catch (error) {
    console.error('Quick search error:', error);

    // Return fallback if available
    const fallback = getFallbackResponse(query);
    if (fallback) {
      return `[From Knowledge Base]\n${fallback}`;
    }

    throw new Error('Web search is temporarily unavailable. DuckDuckGo may be rate limiting requests. Please try again in a few minutes.');
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
