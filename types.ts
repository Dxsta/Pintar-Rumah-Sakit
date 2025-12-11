export enum AgentType {
  NAVIGATOR = 'NAVIGATOR',
  PATIENT_INFO = 'PATIENT_INFO',
  APPOINTMENT = 'APPOINTMENT',
  MEDICAL_RECORDS = 'MEDICAL_RECORDS',
  BILLING = 'BILLING'
}

export interface AgentConfig {
  id: AgentType;
  name: string;
  role: string;
  description: string;
  icon: string; // Icon name for lucide-react
  color: string;
  systemInstruction: string;
  supportsSearch?: boolean;
  supportsDocGen?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  agentId?: AgentType; // The agent who generated this message
  timestamp: number;
  isThinking?: boolean;
  groundingUrls?: Array<{title: string, url: string}>;
  generatedDocument?: string; // Name of document if generated
}

export interface RoutingResult {
  targetAgent: AgentType;
  reasoning: string;
}