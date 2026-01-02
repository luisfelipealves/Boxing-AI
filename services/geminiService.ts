
import { GoogleGenAI, Chat } from "@google/genai";

const getAiClient = () => {
  // Use import.meta.env for Vite
  const apiKey = import.meta.env.API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave da API não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

export const createInventoryChat = (inventoryContext: string): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Você é o Assistente BoxWise. Ajude o usuário a encontrar itens em seu inventário de caixas e locais. Contexto atual do inventário: ${inventoryContext}`,
    }
  });
};