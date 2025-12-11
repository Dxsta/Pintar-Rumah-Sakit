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
      text: 'Halo! Saya **Penavigasi Pintar Rumah Sakit**. \n\nSaya dapat membantu menghubungkan Anda dengan layanan yang tepat, seperti:\n* Pendaftaran Pasien\n* Jadwal Dokter\n* Rekam Medis\n* Info Tagihan & Asuransi\n\nSilakan jelaskan kebutuhan Anda, dan saya akan menghubungkan Anda dengan agen spesialis kami.',
      agentId: AgentType.NAVIGATOR,
      timestamp: Date.now()
    }
  ]);
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.NAVIGATOR);
  const [isRouting, setIsRouting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ke bawah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRouting, isGenerating]);

  // Focus input saat load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    // Check for API Key first
    if (!process.env.API_KEY) {
      alert("API Key is missing. Please set the API_KEY environment variable.");
      return;
    }

    if (!input.trim()) {
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
    
    // Reset ke Navigator visual saat mulai request baru
    setActiveAgent(AgentType.NAVIGATOR);

    try {
      // TAHAP 1: Routing (Penavigasi)
      // Memberikan delay sedikit untuk UX agar terlihat "berpikir" dan animasi terlihat
      await new Promise(r => setTimeout(r, 600));
      const targetAgentId = await routeUserIntent(userMsg.text);
      
      setActiveAgent(targetAgentId);
      setIsRouting(false);
      setIsGenerating(true);

      // TAHAP 2: Eksekusi (Sub-Agen)
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
        text: 'Maaf, terjadi kesalahan koneksi ke layanan AI.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsRouting(false);
      setIsGenerating(false);
    }
  };

  const activeAgentConfig = AGENTS[activeAgent];

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-80 bg-white border-r border-slate-200 p-6 shadow-sm z-20">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Icon name="Compass" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pintar RS</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hospital AI System</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status Agen</h2>
          
          {Object.values(AGENTS).map((agent) => {
            const isActive = activeAgent === agent.id;
            return (
              <div 
                key={agent.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border ${
                  isActive 
                    ? `bg-slate-50 border-slate-300 shadow-md translate-x-1` 
                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg text-white shadow-sm transition-transform duration-300 ${isActive ? 'scale-110' : ''} ${agent.color}`}>
                  <Icon name={agent.icon} className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                    {agent.name}
                  </p>
                  {isActive && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] text-green-600 font-medium">Aktif</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Info Sistem:</strong><br/>
              Aplikasi ini menggunakan model Multi-Agent. Penavigasi akan otomatis mendeteksi kebutuhan Anda dan mengalihkannya ke spesialis.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full bg-slate-50/50">
        
        {/* Header Mobile */}
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Icon name="Compass" className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-slate-800 text-sm">Pintar RS</h1>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm ${activeAgentConfig.color}`}>
             <Icon name={activeAgentConfig.icon} className="w-3 h-3" />
             {activeAgentConfig.name}
          </div>
        </div>

        {/* Chat Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scrollbar-hide">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const agent = msg.agentId ? AGENTS[msg.agentId] : AGENTS[AgentType.NAVIGATOR];
            const isLast = idx === messages.length - 1;

            return (
              <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex max-w-[90%] md:max-w-[70%] gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shadow-md ring-2 ring-white ${
                    isUser ? 'bg-slate-700' : agent.color
                  }`}>
                    <Icon name={isUser ? 'User' : agent.icon} className="w-4 h-4 md:w-6 md:h-6" />
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="text-xs font-bold text-slate-700">{agent.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-medium">{agent.role}</span>
                      </div>
                    )}
                    
                    <div className={`p-4 md:p-5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-slate-200'
                    }`}>
                      <ReactMarkdown 
                         className="prose prose-sm max-w-none dark:prose-invert"
                         components={{
                           ul: ({node, ...props}) => <ul className={`list-disc ml-4 my-2 ${isUser ? 'text-white' : 'text-slate-700'}`} {...props} />,
                           ol: ({node, ...props}) => <ol className={`list-decimal ml-4 my-2 ${isUser ? 'text-white' : 'text-slate-700'}`} {...props} />,
                           strong: ({node, ...props}) => <strong className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
                           p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                         }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {/* Attachment: Generated Document */}
                      {msg.generatedDocument && (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 hover:bg-blue-50 transition-colors cursor-pointer group">
                          <div className="bg-red-500 text-white p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <Icon name="FileCheck" className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate text-sm">{msg.generatedDocument}</p>
                            <p className="text-xs text-slate-500">Dokumen Resmi RS • Siap Diunduh</p>
                          </div>
                          <div className="bg-white border border-slate-200 p-1.5 rounded-md text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200">
                             <Icon name="ExternalLink" className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* Footer: Grounding Source */}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100/50">
                           <p className="text-[10px] uppercase font-bold opacity-60 mb-2 flex items-center gap-1">
                             <Icon name="ExternalLink" className="w-3 h-3" /> Sumber Informasi:
                           </p>
                           <div className="flex flex-wrap gap-2">
                             {msg.groundingUrls.map((g, idx) => (
                               <a 
                                 key={idx} 
                                 href={g.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors truncate max-w-[200px] border border-slate-200"
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

          {/* Indicator: Routing Phase */}
          {isRouting && (
            <div className="flex justify-start w-full pl-2 md:pl-0">
               <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
                 <div className="relative">
                   <div className="w-3 h-3 bg-indigo-600 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                   <div className="w-3 h-3 bg-indigo-600 rounded-full relative"></div>
                 </div>
                 <span className="text-sm font-medium text-slate-600">Penavigasi sedang menganalisis permintaan...</span>
               </div>
            </div>
          )}

          {/* Indicator: Generating Phase */}
          {isGenerating && !isRouting && (
             <div className="flex justify-start w-full pl-2 md:pl-0 animate-in fade-in">
              <div className="flex max-w-[70%] gap-3 items-end">
                <div className={`w-8 h-8 mb-1 rounded-full flex items-center justify-center text-white ${activeAgentConfig.color} shadow-sm`}>
                   <Icon name="Loader" className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm">
                   <span className="text-sm text-slate-500 font-medium">{activeAgentConfig.name} sedang memproses...</span>
                </div>
              </div>
           </div>
          )}
          
          <div className="h-4" /> {/* Spacer */}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200 z-20">
          <div className="max-w-4xl mx-auto relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRouting || isGenerating ? "Mohon tunggu..." : "Ketik pesan Anda..."}
              disabled={isRouting || isGenerating}
              className="w-full pl-6 pr-16 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-700 placeholder:text-slate-400 disabled:opacity-60 shadow-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isRouting || isGenerating}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:shadow-none scale-95 hover:scale-100 active:scale-95"
            >
              <Icon name="Send" className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-3 flex justify-center items-center gap-2">
            <p className="text-[10px] text-slate-400 font-medium">
              Powered by Google Gemini • Pintar Rumah Sakit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}