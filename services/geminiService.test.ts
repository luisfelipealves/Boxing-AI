import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeItemAudio, analyzeItemImage } from './geminiService';

// Mock the GoogleGenAI client
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
}));

vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            models = {
                generateContent: mockGenerateContent
            };
            chats = {
                create: vi.fn()
            };
        },
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING'
        }
    };
});

describe('Gemini Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Start with a clean slate for mocks
        mockGenerateContent.mockReset();
    });

    it('should analyze audio and return parsed item', async () => {
        const mockResponseText = JSON.stringify({
            name: "Test Item",
            description: "A test description",
            material: "Metal",
            color: "Silver"
        });

        mockGenerateContent.mockResolvedValue({
            text: mockResponseText
        });

        const base64Audio = "data:audio/mp3;base64,SGVsbG8=";
        const result = await analyzeItemAudio(base64Audio);

        expect(result).toEqual({
            name: "Test Item",
            description: "A test description",
            material: "Metal",
            color: "Silver"
        });

        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle analysis errors gracefully', async () => {
        mockGenerateContent.mockRejectedValue(new Error("API Error"));

        const base64Audio = "data:audio/mp3;base64,SGVsbG8=";

        await expect(analyzeItemAudio(base64Audio)).rejects.toThrow("API Error");
    });
});
