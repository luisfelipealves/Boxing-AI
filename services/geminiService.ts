import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AIAnalysisResult } from "../types";

const getAiClient = () => {
  // Fix: Use `process.env.API_KEY` directly as per guidelines, assuming it is always available.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the item" },
    description: { type: Type.STRING, description: "A brief description of the item" },
    material: { type: Type.STRING, description: "The primary material of the item" },
    color: { type: Type.STRING, description: "The primary color of the item" },
  },
  required: ["name", "description", "material", "color"],
};

export const analyzeItemImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  const ai = getAiClient();
  
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64Image.split(',')[1];
  const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

  const prompt = "Analyze this image. Identify the main object. Provide a short name (max 3 words), a brief description (max 1 sentence), the primary material (e.g., plastic, wood), and the primary color. If the material or color cannot be clearly determined from the image, return an empty string for those fields. Do not invent information.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          fileToGenerativePart(base64Data, mimeType),
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const result = JSON.parse(text) as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw error;
  }
};

export const analyzeItemAudio = async (base64Audio: string): Promise<AIAnalysisResult> => {
  const ai = getAiClient();

  // 1. Strip the Data URL prefix to get raw base64 (e.g. "data:audio/webm;base64,GkX...")
  const base64Data = base64Audio.split(',')[1];

  // 2. Extract the actual MIME type from the header
  // e.g. "data:audio/webm;codecs=opus;base64" -> extract "audio/webm"
  let mimeType = 'audio/mp3'; // default fallback
  const mimeMatch = base64Audio.match(/data:([^;]+)/);
  if (mimeMatch && mimeMatch[1]) {
    mimeType = mimeMatch[1];
  }

  const prompt = "Listen to this audio description of an item. Extract the following details: a short name (max 3 words), a brief description (max 1 sentence), the primary material, and the primary color. If specific details like description, material, or color aren't explicitly mentioned in the audio, return an empty string for those fields. Do not guess or invent information not present in the audio.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          fileToGenerativePart(base64Data, mimeType), 
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const result = JSON.parse(text) as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error("Gemini audio analysis error:", error);
    throw error;
  }
};

export const createInventoryChat = (inventoryContext: string): Chat => {
  const ai = getAiClient();
  
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are BoxTrack Assistant, a helpful and friendly AI for home inventory management. 
      
      Here is the user's current inventory data in JSON format:
      ${inventoryContext}

      Rules:
      1. Use the provided data to answer questions about where items are located, what is inside specific boxes, or listing items in locations.
      2. If an item is not found in the data, say so clearly but politely.
      3. Keep answers concise and direct. 
      4. If the user asks "Where is [item]?", tell them the Box Name and the Location Name.
      5. If the user asks "What is in [Location]?", list the boxes and a summary of their contents.
      `,
    }
  });
};
