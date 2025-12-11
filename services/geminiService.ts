import { GoogleGenAI, Tool } from '@google/genai';
import { AgentType, Message } from '../types';
import { AGENTS, ROUTER_TOOLS, DOC_GEN_TOOL } from '../constants';

const getApiKey = () => process.env.API_KEY || '';

// 1. Router: Menganalisis Intent dan Memilih Agen
export const routeUserIntent = async (userMessage: string): Promise<AgentType> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // Menggunakan model flash untuk kecepatan routing
  const modelId = 'gemini-2.5-flash'; 

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: userMessage,
      config: {
        systemInstruction: AGENTS[AgentType.NAVIGATOR].systemInstruction,
        tools: [{ functionDeclarations: ROUTER_TOOLS }],
        temperature: 0.0, // Deterministik, kita hanya butuh function call
      }
    });

    const calls = response.functionCalls;
    
    // Mapping nama fungsi dari prompt ke AgentType internal
    if (calls && calls.length > 0) {
      const functionName = calls[0].name;
      console.log("Router decided:", functionName);
      
      switch (functionName) {
        case 'Patient_Information_Agent': return AgentType.PATIENT_INFO;
        case 'Appointment_Scheduler': return AgentType.APPOINTMENT;
        case 'Medical_Records_Agent': return AgentType.MEDICAL_RECORDS;
        case 'Billing_And_Insurance_Agent': return AgentType.BILLING;
        default: return AgentType.PATIENT_INFO;
      }
    }

    // Jika tidak ada function call (fallback), default ke Patient Info atau Navigator lagi
    // Idealnya ini tidak terjadi jika prompt kuat
    console.warn("No function call detected, defaulting to PATIENT_INFO");
    return AgentType.PATIENT_INFO;
  } catch (error) {
    console.error("Routing Error:", error);
    // Jika gagal routing, kembalikan ke Info Pasien sebagai fallback aman
    return AgentType.PATIENT_INFO; 
  }
};

// 2. Executor: Menjalankan Sub-Agen Spesialis
export const runSpecialistAgent = async (
  agentType: AgentType,
  history: Message[],
  userMessage: string
): Promise<{ text: string; groundingUrls?: any[]; generatedDocument?: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const agentConfig = AGENTS[agentType];

  // Konfigurasi Tools berdasarkan tabel "Alat Wajib Digunakan"
  const tools: Tool[] = [];
  
  if (agentConfig.supportsSearch) {
    tools.push({ googleSearch: {} });
  }
  
  if (agentConfig.supportsDocGen) {
    tools.push({ functionDeclarations: [DOC_GEN_TOOL] });
  }

  // Format history untuk Gemini
  const chatContext = history
    .filter(msg => msg.role !== 'system') // Filter pesan error sistem
    .slice(-10) // Ambil 10 pesan terakhir untuk konteks
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  // Tambahkan pesan user saat ini
  chatContext.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
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

    // Cek Function Call untuk Generate Document
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'generate_document') {
           const args = call.args as any;
           const docType = args.documentType || 'Dokumen';
           const format = args.format || 'PDF';
           generatedDocument = `${docType}.${format.toLowerCase()}`;
           
           // Jika model tidak memberikan teks pengantar (hanya func call), tambahkan manual
           if (!finalText) {
             finalText = `Baik, saya telah membuat dokumen **${docType}** dalam format **${format}** untuk Anda.`;
           }
        }
      }
    }

    // Ekstrak Grounding (Google Search)
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
      text: "Maaf, sistem sedang sibuk atau mengalami gangguan koneksi. Silakan coba sesaat lagi.",
    };
  }
};