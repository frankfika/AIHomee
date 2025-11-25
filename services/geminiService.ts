
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingResult, Agent, ChatMessage } from "../types";

// Helper to get client with dynamic key
const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API Key is missing. Please check your settings.");
  return new GoogleGenAI({ apiKey: key });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Chat with an Agent
 */
export const chatWithAgent = async (
  agent: Agent,
  history: ChatMessage[],
  newMessage: string,
  apiKey?: string
): Promise<string> => {
  
  if (agent.provider !== 'google') {
    return `[System]: Simulation - Interaction with ${agent.provider} (${agent.modelId}) requires their specific SDK. Since this demo only uses @google/genai, please switch this Agent to use Google Gemini.`;
  }

  const ai = getClient(apiKey);

  try {
    // Construct history for Gemini
    // We strictly use generateContent here for simplicity as per guidelines for text answers
    // But to maintain history context, we construct the prompt with history
    
    const chat = ai.chats.create({
      model: agent.modelId || 'gemini-2.5-flash',
      config: {
        systemInstruction: agent.systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const response = await chat.sendMessage({
      message: newMessage
    });

    return response.text || "No response generated.";

  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * Process Meeting Audio (Agent-aware)
 */
export const processMeetingAudio = async (
  audioBlob: Blob,
  agent: Agent,
  targetLanguage: string = 'auto',
  apiKey?: string
): Promise<ProcessingResult> => {
  
  // Note: Even if the Agent is "OpenAI" or "Anthropic", we must use Gemini 
  // to process the audio in this backend-less demo environment.
  // We will simply use the Agent's SYSTEM INSTRUCTION with a Gemini model.
  const ai = getClient(apiKey);
  const base64Audio = await blobToBase64(audioBlob);
  
  // Determine model: if it's a google agent with a valid model, use it. 
  // Otherwise fallback to a standard Gemini model.
  let model = "gemini-2.5-flash";
  if (agent.provider === 'google' && agent.modelId) {
     model = agent.modelId;
  }
  // If user selected 'gemini-1.5-pro' etc, we might need to be careful with deprecation, 
  // but let's assume valid models from the settings.

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A short, professional title." },
      transcription: { type: Type.STRING, description: "Full transcription." },
      report: { 
        type: Type.STRING, 
        description: "The formatted report/minutes using Markdown." 
      },
      suggestedTags: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of 3-5 relevant tags." 
      },
      language: {
        type: Type.STRING,
        description: "The primary language detected."
      }
    },
    required: ["title", "transcription", "report", "suggestedTags", "language"]
  };

  let languageInstruction = "Detect the language automatically.";
  if (targetLanguage === 'zh-CN') {
    languageInstruction = "The audio is in Chinese. Output the Transcription and Report in Chinese (Simplified).";
  } else if (targetLanguage !== 'auto') {
    languageInstruction = `The audio is in ${targetLanguage}. Output strictly in this language.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: audioBlob.type || 'audio/wav', data: base64Audio } },
          {
            text: `
            You are acting as the following agent: ${agent.name}.
            Agent System Instructions: ${agent.systemInstruction}
            
            Task:
            1. **Language**: ${languageInstruction}
            2. **Output**: Generate a JSON object with title, transcription, report, and tags.
            3. **Report Style**: The 'report' field must reflect your Agent Persona defined above.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");
    return JSON.parse(resultText) as ProcessingResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Refines the existing report based on user instructions
 */
export const refineMeetingReport = async (
  currentReport: string,
  transcription: string,
  instruction: string,
  apiKey?: string
): Promise<string> => {
  
  const ai = getClient(apiKey);
  const model = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{
          text: `
          You are an AI editor.
          **Original Transcription Context**: ${transcription.substring(0, 5000)}...
          **Current Report**: ${currentReport}
          **Instruction**: "${instruction}"
          
          Rewrite the report to satisfy the instruction. Keep markdown. Output ONLY the new report text.
          `
        }]
      }
    });

    return response.text || currentReport;
  } catch (error) {
    console.error("Refinement Error:", error);
    throw error;
  }
};
