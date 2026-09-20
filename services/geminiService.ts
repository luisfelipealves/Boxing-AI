
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AIAnalysisResult } from "../types";
import { getGeminiApiKey } from "./geminiKeyService";

// Always use a named parameter for API key initialization
const getAiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error("API_KEY is missing");
    throw new Error("API Key is missing. Configure a Gemini API key to use AI features.");
  }
  return new GoogleGenAI({ apiKey });
};

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

const RESPONSE_SCHEMA = {
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

  const base64Data = base64Image.split(',')[1];
  const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

  const prompt = "Analise esta imagem. Identifique o objeto principal. Forneça um nome curto (máx. 3 palavras), uma breve descrição (máx. 1 frase), o material principal (ex: plástico, madeira) e a cor principal. Se o material ou a cor não puderem ser claramente determinados, retorne uma string vazia para esses campos. Não invente informações. Responda APENAS em Português.";

  try {
    // Using gemini-3-flash-preview as per task requirements
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    // Access .text property directly (not a function)
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

  const base64Data = base64Audio.split(',')[1];
  let mimeType = 'audio/mp3';
  const mimeMatch = base64Audio.match(/data:([^;]+)/);
  if (mimeMatch && mimeMatch[1]) {
    mimeType = mimeMatch[1];
  }

  const prompt = "Ouça esta descrição de áudio de um item. Extraia os seguintes detalhes: um nome curto (máx. 3 palavras), uma breve descrição (máx. 1 frase), o material principal e a cor principal. Se detalhes específicos não forem mencionados explicitamente, retorne uma string vazia. Não adivinhe informações. Responda APENAS em Português.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Você é o Assistente BoxTrack, uma IA útil e amigável para gerenciamento de inventário doméstico. 
      
      Aqui estão os dados atuais do inventário do usuário em formato JSON:
      ${inventoryContext}

      Regras:
      1. Use os dados fornecidos para responder perguntas sobre onde os itens estão localizados, o que está dentro de caixas específicas ou listar itens em locais.
      2. Se um item não for encontrado nos dados, diga isso claramente, mas com educação.
      3. Mantenha as respostas concisas e diretas.
      4. Se o usuário perguntar "Onde está [item]?", diga o Nome da Caixa e o Nome do Local.
      5. Se o usuário perguntar "O que tem em [Local]?", liste as caixas e um resumo de seus conteúdos.
      6. Responda SEMPRE em Português do Brasil.
      `,
    }
  });
};
