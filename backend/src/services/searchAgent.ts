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
  model: process.env.OLLAMA_MODEL || "llama3:4b",
  temperature: 0,
});

/**
 * Main function to handle user queries with live web search
 * Uses a simpler approach without the ReAct agent pattern
 */
export async function handleLiveQuery(userQuestion: string, context?: string): Promise<string> {
  console.log(`🕵️ Processing query: "${userQuestion}"`);

  try {
    // First, search the web for relevant information
    console.log('🔍 Searching web...');
    const searchResults = await searchTool.invoke(userQuestion);
    console.log('📄 Search results received');

    // Define a system prompt to guide the model's behavior
    const systemMessage = `You are an intelligent banking assistant for Aura Bank.
You have been provided with search results from the web. Use this information to answer the user's question.

RULES:
1. Use the search results to provide accurate, current information.
2. Do not guess numbers or make up data. Only cite information from the search results.
3. If the search results don't contain relevant information, say you don't know.
4. Be concise and professional.
5. Current Date: ${new Date().toLocaleDateString()}
${context ? `\nContext: ${context}` : ''}

SEARCH RESULTS:
${searchResults}

Now answer the user's question based on the above search results.`;

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
    console.error('Search Agent Error:', error);
    throw error;
  }
}

/**
 * Simple search without model synthesis
 * Useful for quick lookups
 */
export async function quickSearch(query: string): Promise<string> {
  try {
    const results = await searchTool.invoke(query);
    return results;
  } catch (error) {
    console.error('Quick search error:', error);
    throw error;
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
