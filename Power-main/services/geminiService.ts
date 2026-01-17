
import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

// Check for API key presence to help debug issues
if (!process.env.API_KEY) {
  console.warn("⚠️ Warning: Gemini API Key is missing in environment variables (VITE_API_KEY). AI features will fail.");
}

// Initialize AI client as per @google/genai guidelines using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to format inventory for the model to understand
const formatInventoryContext = (items: InventoryItem[]): string => {
  return JSON.stringify(items.map(item => ({
    name: item.name,
    sku: item.sku,
    qty: item.quantity,
    min: item.minLevel,
    price: item.unitPrice,
    val: item.quantity * item.unitPrice,
    cat: item.category,
    loc: item.location
  })));
};

/**
 * Generates inventory insights using the Gemini 3 Flash model.
 * Complies with strict SDK guidelines: exclusive use of process.env.API_KEY.
 */
export const getInventoryInsights = async (items: InventoryItem[]): Promise<string> => {
  try {
    const inventoryData = formatInventoryContext(items);
    
    // Using gemini-3-flash-preview for summarization task as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Act as a Warehouse Inventory Analyst. Analyze the following inventory data in JSON format:
        ${inventoryData}

        Provide a concise executive summary (max 300 words) that covers:
        1. Overall stock health (Are we overstocked/understocked?).
        2. Identify top 3 items that need immediate attention (reorder or liquidation).
        3. A quick financial valuation summary.
        
        Format the output as clean Markdown.
      `,
    });

    // Access .text property directly as per @google/genai documentation
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Failed to generate insights. Check if your API Key is valid and set in .env";
  }
};

/**
 * Facilitates a chat session with the "SmartStock Agent".
 * Uses a persistent chat session for multi-turn conversations if needed.
 */
export const chatWithInventoryBot = async (
  query: string, 
  items: InventoryItem[]
): Promise<string> => {
  try {
    const inventoryData = formatInventoryContext(items);
    
    // Creating chat with specific system instructions
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          You are "SmartStock Agent", a highly intelligent and capable AI assistant for a warehouse manager.

          **YOUR CAPABILITIES:**
          1. **General Intelligence:** You can answer general questions, solve math problems, write professional emails to suppliers, explain concepts, writes code, or chat casually. You are NOT limited to inventory topics.
          2. **Inventory Expert:** You have real-time access to the warehouse inventory data provided below. When the user asks about stock, prices, or locations, USE this data to be accurate.

          **CURRENT INVENTORY CONTEXT (JSON):**
          ${inventoryData}
          
          **GUIDELINES:**
          - If the user asks about "stock", "quantities", "value", or "items", strictly use the JSON data provided above.
          - If the user asks to "Write an email to a supplier" or "Calculate potential profit markup", use your general capabilities.
          - If the user asks general questions (e.g., "What is the capital of France?", "Help me debug this Python code"), answer them helpfully using your general training.
          - Be professional, concise, and helpful.
          - Format currency in USD.
        `,
      },
    });

    // sendMessage automatically manages message contents
    const response = await chat.sendMessage({ message: query });
    
    // Access .text property directly
    return response.text || "I didn't catch that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I'm having trouble connecting to Gemini. Please check your API Key configuration in .env";
  }
};
