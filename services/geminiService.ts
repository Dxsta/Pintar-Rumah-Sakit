import { GoogleGenAI, Tool } from '@google/genai';
import { AgentType, Message } from '../types';
import { AGENTS, ROUTER_TOOLS, DOC_GEN_TOOL } from '../constants';

// Helper to get API Key
const getApiKey = () => process.env.API_KEY || '';

// 1. The Router Function: Decides which agent to call
export const routeUserIntent = async (userMessage: string): Promise<AgentType> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // We use a lighter model for routing logic
  const modelId = 'gemini-2.5-flash'; 

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: userMessage,
      config: {
        systemInstruction: AGENTS[AgentType.NAVIGATOR].systemInstruction,
        tools: [{ functionDeclarations: ROUTER_TOOLS }],
        temperature: 0.1, // Low temp for deterministic routing
      }
    });

    const calls = response.functionCalls;
    
    if (calls && calls.length > 0) {
      const functionName = calls[0].name;
      switch (functionName) {
        case 'delegate_to_patient_agent': return AgentType.PATIENT_INFO;
        case 'delegate_to_appointment_agent': return AgentType.APPOINTMENT;
        case 'delegate_to_records_agent': return AgentType.MEDICAL_RECORDS;
        case 'delegate_to_billing_agent': return AgentType.BILLING;
        default: return AgentType.PATIENT_INFO; // Default fallback
      }
    }

    // If no function called (rare given instructions), default based on keywords or fallback
    return AgentType.PATIENT_INFO;
  } catch (error) {
    console.error("Routing Error:", error);
    return AgentType.PATIENT_INFO; // Fail safe
  }
};

// 2. The Execution Function: Runs the specific agent
export const runSpecialistAgent = async (
  agentType: AgentType,
  history: Message[],
  userMessage: string
): Promise<{ text: string; groundingUrls?: any[]; generatedDocument?: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const agentConfig = AGENTS[agentType];

  // Configure tools for this specific agent
  const tools: Tool[] = [];
  
  if (agentConfig.supportsSearch) {
    tools.push({ googleSearch: {} });
  }
  
  if (agentConfig.supportsDocGen) {
    tools.push({ functionDeclarations: [DOC_GEN_TOOL] });
  }

  // Convert app history to Gemini format (simplification for demo: taking last few turns + current)
  // In production, we'd map the full history properly
  const chatContext = history.slice(-6).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  // Add the current user message
  chatContext.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    // We use a stronger model for the actual conversation/reasoning
    // Using gemini-2.5-flash for speed/efficiency, or pro for complex logic
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatContext,
      config: {
        systemInstruction: agentConfig.systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    let finalText = response.text || "";
    let generatedDocument = undefined;

    // Check for Function Calls (Internal Agent Tools like DocGen)
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'generate_document') {
           const docType = (call.args as any).documentType || 'Dokumen';
           generatedDocument = `${docType}.pdf`;
           // We append a confirmation to the text if the model didn't provide one
           if (!finalText) {
             finalText = `Saya telah membuat dokumen ${docType} untuk Anda. Silakan unduh di bawah ini.`;
           }
        }
      }
    }

    // Extract Grounding (Search Results)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let groundingUrls: any[] = [];
    if (groundingChunks) {
      groundingUrls = groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
        .filter(Boolean);
    }

    return {
      text: finalText,
      groundingUrls,
      generatedDocument
    };

  } catch (error) {
    console.error(`Agent ${agentType} Error:`, error);
    return {
      text: "Maaf, saya mengalami kesulitan memproses permintaan Anda saat ini.",
    };
  }
};
