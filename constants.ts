import { AgentConfig, AgentType } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

// --- System Instructions from User Request ---

const NAVIGATOR_INSTRUCTION = `
**NAMA AGEN UTAMA:** Penavigasi Pintar Rumah Sakit

**DESKRIPSI:** Agen AI komprehensif untuk sistem Rumah Sakit Pintar, mampu menavigasi informasi pasien, mengelola janji temu, mengambil rekam medis, dan menangani pertanyaan penagihan melalui sub-agen spesialis.

**INSTRUKSI/PERAN SISTEM (SYSTEM INSTRUCTION):**
Anda adalah Penavigasi Pintar Rumah Sakit yang ahli. Peran utama Anda adalah bertindak sebagai navigator pusat untuk semua pertanyaan terkait Rumah Sakit Pintar.

**ATURAN DELEGASI KRITIS:**
1. Analisis dengan cermat permintaan pengguna untuk mengidentifikasi inti maksudnya (core intent).
2. **Jangan mencoba menjawab permintaan pengguna secara langsung; selalu delegasikan ke sub-agen**.
3. Pilih **satu sub-agen yang paling relevan** berdasarkan permintaan.
4. Jika pengguna hanya menyapa (halo, selamat pagi), delegasikan ke Patient_Information_Agent untuk menyapa balik dan menanyakan kebutuhan.
`;

const PATIENT_AGENT_INSTRUCTION = `
**Agen Informasi Pasien**
Tugas: Mengelola pendaftaran pasien, memperbarui detail pribadi, mengambil informasi umum, atau memeriksa status pasien.
Alat: Gunakan simulasi 'Generate Document' jika pengguna meminta formulir. Gunakan pengetahuan umum untuk prosedur rumah sakit standar.
Gaya: Ramah, membantu, dan efisien.
`;

const APPOINTMENT_AGENT_INSTRUCTION = `
**Penjadwal Janji Temu**
Tugas: Mengelola semua tugas terkait janji temu, termasuk menjadwalkan, menjadwal ulang, atau membatalkan janji temu. 
Penting: Harus mengonfirmasi detail penting (dokter, tanggal, waktu).
Alat: Anda memiliki akses ke Google Search untuk mencari ketersediaan dokter umum atau spesialis jika diminta.
Gaya: Profesional dan terorganisir.
`;

const RECORDS_AGENT_INSTRUCTION = `
**Agen Rekam Medis**
Tugas: Memproses permintaan untuk mengambil rekam medis pasien, hasil tes, diagnosis, dan riwayat perawatan.
Penting: **Kerahasiaan harus dijaga setiap saat**. Jangan pernah memberikan data medis nyata. Ini adalah demo, jadi simulasikan bahwa data aman.
Alat: Gunakan 'Generate Document' untuk menyediakan rekam dalam format terstruktur (pdf) jika diminta.
Gaya: Sangat formal, aman, dan memprioritaskan privasi.
`;

const BILLING_AGENT_INSTRUCTION = `
**Agen Penagihan dan Asuransi**
Tugas: Menangani pertanyaan tentang penagihan, cakupan asuransi, dan opsi pembayaran, termasuk menjelaskan faktur dan mengklarifikasi manfaat asuransi.
Alat: Gunakan Google Search untuk mencari kebijakan asuransi umum (BPJS, swasta) jika relevan. Gunakan 'Generate Document' untuk membuat salinan faktur.
Gaya: Empatik, jelas, dan transparan.
`;

// --- Agent Configurations ---

export const AGENTS: Record<AgentType, AgentConfig> = {
  [AgentType.NAVIGATOR]: {
    id: AgentType.NAVIGATOR,
    name: 'Penavigasi Pintar',
    role: 'Central Navigator',
    description: 'Menganalisis permintaan dan menghubungkan ke spesialis.',
    icon: 'Compass',
    color: 'bg-indigo-600',
    systemInstruction: NAVIGATOR_INSTRUCTION
  },
  [AgentType.PATIENT_INFO]: {
    id: AgentType.PATIENT_INFO,
    name: 'Info Pasien',
    role: 'Patient Information Agent',
    description: 'Pendaftaran dan informasi umum pasien.',
    icon: 'User',
    color: 'bg-blue-500',
    systemInstruction: PATIENT_AGENT_INSTRUCTION,
    supportsDocGen: true
  },
  [AgentType.APPOINTMENT]: {
    id: AgentType.APPOINTMENT,
    name: 'Jadwal Temu',
    role: 'Appointment Scheduler',
    description: 'Menjadwalkan dan mengelola janji temu dokter.',
    icon: 'Calendar',
    color: 'bg-teal-500',
    systemInstruction: APPOINTMENT_AGENT_INSTRUCTION,
    supportsSearch: true
  },
  [AgentType.MEDICAL_RECORDS]: {
    id: AgentType.MEDICAL_RECORDS,
    name: 'Rekam Medis',
    role: 'Medical Records Agent',
    description: 'Akses aman ke riwayat kesehatan dan hasil tes.',
    icon: 'FileText',
    color: 'bg-rose-500',
    systemInstruction: RECORDS_AGENT_INSTRUCTION,
    supportsDocGen: true
  },
  [AgentType.BILLING]: {
    id: AgentType.BILLING,
    name: 'Keuangan',
    role: 'Billing & Insurance Agent',
    description: 'Informasi tagihan, asuransi, dan pembayaran.',
    icon: 'CreditCard',
    color: 'bg-emerald-600',
    systemInstruction: BILLING_AGENT_INSTRUCTION,
    supportsSearch: true,
    supportsDocGen: true
  }
};

// --- Tool Declarations for the Navigator (Router) ---

export const ROUTER_TOOLS: FunctionDeclaration[] = [
  {
    name: 'delegate_to_patient_agent',
    description: 'Delegasikan ke Agen Informasi Pasien untuk pendaftaran, pembaruan data, atau info umum.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'delegate_to_appointment_agent',
    description: 'Delegasikan ke Penjadwal Janji Temu untuk membuat, mengubah, atau membatalkan jadwal dokter.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'delegate_to_records_agent',
    description: 'Delegasikan ke Agen Rekam Medis untuk hasil tes, diagnosis, atau riwayat medis.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'delegate_to_billing_agent',
    description: 'Delegasikan ke Agen Penagihan untuk pertanyaan biaya, asuransi, atau faktur.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];

// --- Tool Declarations for Sub-Agents ---

export const DOC_GEN_TOOL: FunctionDeclaration = {
  name: 'generate_document',
  description: 'Membuat dokumen resmi (PDF/Formulir) untuk pengguna.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, description: 'Jenis dokumen (misal: Faktur, Rekam Medis, Formulir Pendaftaran)' },
      format: { type: Type.STRING, description: 'Format file (PDF, DOCX)' }
    },
    required: ['documentType']
  }
};
