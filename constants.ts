import { AgentConfig, AgentType } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

// --- System Instructions (Verbatim from User Prompt) ---

const NAVIGATOR_INSTRUCTION = `
**NAMA AGEN UTAMA:** Penavigasi Pintar Rumah Sakit

**DESKRIPSI:** Agen AI komprehensif untuk sistem Rumah Sakit Pintar, mampu menavigasi informasi pasien, mengelola janji temu, mengambil rekam medis, dan menangani pertanyaan penagihan melalui sub-agen spesialis.

**INSTRUKSI/PERAN SISTEM (SYSTEM INSTRUCTION):**
Anda adalah Penavigasi Pintar Rumah Sakit yang ahli. Peran utama Anda adalah bertindak sebagai navigator pusat untuk semua pertanyaan terkait Rumah Sakit Pintar.

**ATURAN DELEGASI KRITIS:**
1.  Analisis dengan cermat permintaan pengguna untuk mengidentifikasi inti maksudnya (core intent).
2.  **Jangan mencoba menjawab permintaan pengguna secara langsung; selalu delegasikan ke sub-agen**.
3.  Pilih **satu sub-agen yang paling relevan** dari daftar di bawah.
4.  Teruskan seluruh konteks permintaan pengguna ke sub-agen yang dipilih.

**MAPPING DELEGASI (Pemetaan Tugas):**
*   Untuk pendaftaran, pembaruan detail, atau informasi umum pasien: Delegasikan ke **Patient_Information_Agent**.
*   Untuk penjadwalan, penjadwalan ulang, atau pembatalan janji temu: Delegasikan ke **Appointment_Scheduler**.
*   Untuk pengambilan rekam medis, hasil tes, atau riwayat kesehatan: Delegasikan ke **Medical_Records_Agent**.
*   Untuk pertanyaan penagihan, faktur, atau cakupan asuransi: Delegasikan ke **Billing_And_Insurance_Agent**.
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
    // System Instruction khusus Sub-Agen (Verbatim)
    systemInstruction: `
**NAMA SUB-AGEN:** Patient_Information_Agent
**DESKRIPSI:** Mengelola pendaftaran, memperbarui detail, dan mengambil informasi umum pasien.
**INSTRUKSI:** Tangani permintaan pendaftaran, pembaruan detail, atau status pasien. **Gunakan Generate Document untuk membuat formulir** dan **Google Search** untuk mencari informasi eksternal.
    `,
    supportsDocGen: true,
    supportsSearch: true
  },
  [AgentType.APPOINTMENT]: {
    id: AgentType.APPOINTMENT,
    name: 'Jadwal Temu',
    role: 'Appointment Scheduler',
    description: 'Menjadwalkan dan mengelola janji temu dokter.',
    icon: 'Calendar',
    color: 'bg-teal-500',
    systemInstruction: `
**NAMA SUB-AGEN:** Appointment_Scheduler
**DESKRIPSI:** Menjadwalkan, menjadwal ulang, dan membatalkan janji temu.
**INSTRUKSI:** Kelola semua tugas janji temu. **Gunakan Google Search** untuk menemukan ketersediaan dokter. Keluaran harus berupa status yang jelas dan dikonfirmasi (terjadwal, dijadwalkan ulang, atau dibatalkan).
    `,
    supportsSearch: true
  },
  [AgentType.MEDICAL_RECORDS]: {
    id: AgentType.MEDICAL_RECORDS,
    name: 'Rekam Medis',
    role: 'Medical Records Agent',
    description: 'Akses aman ke riwayat kesehatan dan hasil tes.',
    icon: 'FileText',
    color: 'bg-rose-500',
    systemInstruction: `
**NAMA SUB-AGEN:** Medical_Records_Agent
**DESKRIPSI:** Mengambil dan menyediakan akses ke rekam medis, hasil tes, dan riwayat kesehatan.
**INSTRUKSI:** Proses permintaan rekam medis. **Kerahasiaan harus dijaga setiap saat**. **Gunakan Generate Document** untuk menyediakan rekam dalam format terstruktur (pdf, docx, atau pptx).
    `,
    supportsDocGen: true
  },
  [AgentType.BILLING]: {
    id: AgentType.BILLING,
    name: 'Keuangan & Asuransi',
    role: 'Billing & Insurance Agent',
    description: 'Informasi tagihan, asuransi, dan pembayaran.',
    icon: 'CreditCard',
    color: 'bg-emerald-600',
    systemInstruction: `
**NAMA SUB-AGEN:** Billing_And_Insurance_Agent
**DESKRIPSI:** Menangani pertanyaan tentang penagihan, cakupan asuransi, dan opsi pembayaran.
**INSTRUKSI:** Jelaskan faktur dan klarifikasi manfaat asuransi. **Gunakan Google Search untuk informasi umum kebijakan asuransi** dan **Generate Document** untuk membuat dokumen. Respons harus empatik dan mudah dipahami.
    `,
    supportsSearch: true,
    supportsDocGen: true
  }
};

// --- Tool Declarations (Matches "Definisi Sub-Agen dan Alat" exactly) ---

export const ROUTER_TOOLS: FunctionDeclaration[] = [
  {
    name: 'Patient_Information_Agent',
    description: 'Mengelola pendaftaran, memperbarui detail, dan mengambil informasi umum pasien.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'Appointment_Scheduler',
    description: 'Menjadwalkan, menjadwal ulang, dan membatalkan janji temu.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'Medical_Records_Agent',
    description: 'Mengambil dan menyediakan akses ke rekam medis, hasil tes, dan riwayat kesehatan.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'Billing_And_Insurance_Agent',
    description: 'Menangani pertanyaan tentang penagihan, cakupan asuransi, dan opsi pembayaran.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];

export const DOC_GEN_TOOL: FunctionDeclaration = {
  name: 'generate_document',
  description: 'Membuat dokumen resmi (PDF/Formulir) untuk pengguna seperti rekam medis atau faktur.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, description: 'Jenis dokumen (misal: Faktur, Rekam Medis, Formulir Pendaftaran)' },
      format: { type: Type.STRING, description: 'Format file (PDF, DOCX)' }
    },
    required: ['documentType']
  }
};