
import { GoogleGenAI, Chat } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
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