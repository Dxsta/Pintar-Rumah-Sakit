import React, { useState, useEffect, useRef } from 'react';
import { AgentType, Message } from './types';
import { AGENTS } from './constants';
import { routeUserIntent, runSpecialistAgent } from './services/geminiService';
import { Icon } from './components/Icon';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Halo! Selamat datang di Pintar Rumah Sakit. Saya adalah Penavigasi Sistem. Apa yang bisa saya bantu hari ini? (Contoh: "Saya ingin buat janji temu", "Lihat tagihan saya")',
      agentId: AgentType.NAVIGATOR,
      timestamp: Date.now()
    }
  ]);
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.NAVIGATOR);
  const [isRouting, setIsRouting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRouting, isGenerating]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !process.env.API_KEY) {
      if (!process.env.API_KEY) alert("API_KEY is missing in environment variables.");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsRouting(true);

    try {
      // 1. Route Intent
      const targetAgentId = await routeUserIntent(userMsg.text);
      setActiveAgent(targetAgentId);
      setIsRouting(false);
      setIsGenerating(true);

      // 2. Generate Response with Specialist
      const response = await runSpecialistAgent(targetAgentId, messages, userMsg.text);
      
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        agentId: targetAgentId,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
        generatedDocument: response.generatedDocument
      };

      setMessages(prev => [...prev, agentMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        text: 'Maaf, terjadi kesalahan pada sistem.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsRouting(false);
      setIsGenerating(false);
      // Reset to Navigator after interaction is "complete" for the turn, 
      // though typically we might keep context. For this demo, visual switch back helps show the "Navigator" role.
      // However, keeping the specialist active looks better for continuity.
    }
  };

  const activeAgentConfig = AGENTS[activeAgent];

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden">
      
      {/* Sidebar - Agents Status */}
      <div className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-6 shadow-sm z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded-md">
              <Icon name="Compass" className="w-5 h-5" />
            </span>
            Pintar RS
          </h1>
          <p className="text-xs text-slate-500 mt-1">Sistem Navigasi Rumah Sakit Cerdas</p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agen Aktif</h2>
          
          {Object.values(AGENTS).map((agent) => {
            const isActive = activeAgent === agent.id;
            return (
              <div 
                key={agent.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? `bg-slate-50 border border-slate-200 shadow-sm translate-x-1` 
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`p-2 rounded-lg text-white shadow-sm ${agent.color}`}>
                  <Icon name={agent.icon} className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                    {agent.name}
                  </p>
                  {isActive && <span className="text-[10px] text-green-600 font-medium animate-pulse">● Sedang Melayani</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Info Sistem:</strong> Agen Navigator secara otomatis mendeteksi kebutuhan Anda dan menghubungkan ke spesialis yang tepat.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* Header (Mobile Only) */}
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
          <h1 className="font-bold text-slate-800">Pintar RS</h1>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium text-white ${activeAgentConfig.color}`}>
             <Icon name={activeAgentConfig.icon} className="w-3 h-3" />
             {activeAgentConfig.name}
          </div>
        </div>

        {/* Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide bg-slate-50/50">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const agent = msg.agentId ? AGENTS[msg.agentId] : AGENTS[AgentType.NAVIGATOR];

            return (
              <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white shadow-sm ${
                    isUser ? 'bg-slate-700' : agent.color
                  }`}>
                    <Icon name={isUser ? 'User' : agent.icon} className="w-4 h-4 md:w-5 md:h-5" />
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {!isUser && (
                      <span className="text-xs text-slate-500 mb-1 ml-1">{agent.name}</span>
                    )}
                    <div className={`p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      <ReactMarkdown 
                         components={{
                           ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
                           ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2" {...props} />,
                           strong: ({node, ...props}) => <strong className="font-bold" {...props} />
                         }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {/* Generated Document Card */}
                      {msg.generatedDocument && (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                          <div className="bg-red-500 text-white p-2 rounded">
                            <Icon name="FileCheck" className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{msg.generatedDocument}</p>
                            <p className="text-xs text-slate-500">Siap diunduh</p>
                          </div>
                          <button className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 text-slate-600 font-medium">
                            Unduh
                          </button>
                        </div>
                      )}

                      {/* Search Grounding Sources */}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100/20">
                           <p className="text-xs opacity-70 mb-2 font-semibold flex items-center gap-1">
                             <Icon name="ExternalLink" className="w-3 h-3" /> Sumber Informasi:
                           </p>
                           <div className="flex flex-wrap gap-2">
                             {msg.groundingUrls.map((g, idx) => (
                               <a 
                                 key={idx} 
                                 href={g.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-xs bg-black/10 hover:bg-black/20 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
                               >
                                 {g.title}
                               </a>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading States */}
          {isRouting && (
            <div className="flex justify-start w-full">
               <div className="flex max-w-[70%] gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white animate-pulse">
                    <Icon name="Compass" className="w-5 h-5" />
                 </div>
                 <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <Icon name="Loader" className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-slate-500">Menganalisis kebutuhan Anda...</span>
                 </div>
               </div>
            </div>
          )}

          {isGenerating && !isRouting && (
             <div className="flex justify-start w-full">
              <div className="flex max-w-[70%] gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${activeAgentConfig.color}`}>
                   <Icon name={activeAgentConfig.icon} className="w-5 h-5" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                   <Icon name="Loader" className="w-4 h-4 animate-spin text-slate-400" />
                   <span className="text-sm text-slate-500">{activeAgentConfig.name} sedang mengetik...</span>
                </div>
              </div>
           </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ketik pesan Anda di sini (misal: Saya mau daftar pasien baru)..."
              disabled={isRouting || isGenerating}
              className="w-full pl-5 pr-14 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-700 placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isRouting || isGenerating}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
            >
              <Icon name="Send" className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">
              Didukung oleh Google Gemini • Pintar Rumah Sakit Demo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}