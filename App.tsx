
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Recorder from './components/Recorder';
import MeetingDetail from './components/MeetingDetail';
import SettingsModal from './components/SettingsModal';
import ChatInterface from './components/ChatInterface';
import WebToolView from './components/WebToolView';
import { MeetingData, MeetingStatus, UserSettings, DEFAULT_AGENTS, DEFAULT_WEB_TOOLS, Agent, ChatMessage } from './types';
import { processMeetingAudio } from './services/geminiService';
import { SettingsIcon, ChatBubbleIcon, ArchiveIcon, RobotIcon, MicIcon, GlobeIcon } from './components/Icons';

const LANGUAGES = [
  { code: 'auto', label: 'Auto-Detect' },
  { code: 'zh-CN', label: 'Chinese (中文)' },
  { code: 'en-US', label: 'English' },
  { code: 'ja-JP', label: 'Japanese (日本語)' },
];

type AppMode = 'chat' | 'vault' | 'webtool';

function App() {
  // --- State ---
  const [mode, setMode] = useState<AppMode>('vault');
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  // Chat History per Agent
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  
  // Web Tool State
  const [activeWebToolId, setActiveWebToolId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<UserSettings>({
    googleDriveConnected: false,
    apiKeys: { google: '', openai: '', anthropic: '' },
    agents: DEFAULT_AGENTS,
    webTools: DEFAULT_WEB_TOOLS,
    activeAgentId: DEFAULT_AGENTS[0].id
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  
  // Recording State
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh-CN');

  // --- Persistence ---
  useEffect(() => {
    const savedMeetings = localStorage.getItem('nexus_meetings');
    const savedSettings = localStorage.getItem('nexus_settings');
    const savedChats = localStorage.getItem('nexus_chats');

    if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
    if (savedSettings) {
       const parsed = JSON.parse(savedSettings);
       setSettings({
         ...parsed,
         webTools: parsed.webTools || DEFAULT_WEB_TOOLS
       });
    }
    if (savedChats) setChatHistories(JSON.parse(savedChats));
  }, []);

  useEffect(() => {
    // Don't save audio blobs to local storage, just metadata
    const toSave = meetings.map(({ audioBlob, audioUrl, ...rest }) => rest);
    localStorage.setItem('nexus_meetings', JSON.stringify(toSave));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem('nexus_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('nexus_chats', JSON.stringify(chatHistories));
  }, [chatHistories]);

  // --- Handlers ---

  const activeAgent = settings.agents.find(a => a.id === settings.activeAgentId) || settings.agents[0];
  const activeWebTool = settings.webTools?.find(t => t.id === activeWebToolId);

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    const newId = uuidv4();
    const audioUrl = URL.createObjectURL(blob);
    const languageLabel = LANGUAGES.find(l => l.code === selectedLanguage)?.label || 'Auto';
    
    // Switch to Vault mode
    setMode('vault');

    const newMeeting: MeetingData = {
      id: newId,
      title: "Analyzing Audio...",
      date: Date.now(),
      duration,
      status: MeetingStatus.PROCESSING,
      tags: [],
      suggestedTags: [], 
      audioBlob: blob,
      audioUrl: audioUrl,
      language: languageLabel
    };

    setMeetings(prev => [newMeeting, ...prev]);
    setSelectedMeetingId(newId);
    setIsProcessing(true);

    try {
      const result = await processMeetingAudio(
        blob, 
        activeAgent, 
        selectedLanguage, 
        settings.apiKeys.google
      );

      setMeetings(prev => prev.map(m => {
        if (m.id === newId) {
          return {
            ...m,
            status: MeetingStatus.COMPLETED,
            title: result.title,
            transcription: result.transcription,
            report: result.report,
            suggestedTags: result.suggestedTags,
            language: result.language,
          };
        }
        return m;
      }));
      
    } catch (error) {
      console.error("Processing failed", error);
      setMeetings(prev => prev.map(m => {
        if (m.id === newId) return { ...m, status: MeetingStatus.ERROR, title: "Error Processing" };
        return m;
      }));
      alert("Processing failed. Please check your API Keys in settings.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMeeting = (id: string, updates: Partial<MeetingData>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };
  
  const deleteMeeting = (id: string) => {
      setMeetings(prev => prev.filter(m => m.id !== id));
      if (selectedMeetingId === id) setSelectedMeetingId(null);
  };

  const handleAgentSelect = (agentId: string) => {
    setSettings(s => ({...s, activeAgentId: agentId}));
    setIsAgentMenuOpen(false);
  };
  
  const handleWebToolClick = (toolId: string) => {
    setActiveWebToolId(toolId);
    setMode('webtool');
  };

  const updateChatHistory = (messages: ChatMessage[]) => {
    setChatHistories(prev => ({ ...prev, [activeAgent.id]: messages }));
  };

  // --- Render ---

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* 1. Sidebar */}
      <div className="w-20 lg:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all z-20">
        {/* Brand */}
        <div className="p-4 lg:p-6 flex items-center gap-3 mb-6">
           <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">N</div>
           <span className="font-bold text-white text-xl tracking-tight hidden lg:block">Nexus</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-2 lg:px-4 space-y-2 overflow-y-auto">
           <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:block mb-2">Modes</p>
           
           <button 
             onClick={() => { setMode('chat'); setSelectedMeetingId(null); }}
             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${mode === 'chat' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
             <ChatBubbleIcon className="w-6 h-6" />
             <span className="font-medium hidden lg:block">Live Chat</span>
           </button>

           <button 
             onClick={() => { setMode('vault'); }}
             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${mode === 'vault' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
             <ArchiveIcon className="w-6 h-6" />
             <span className="font-medium hidden lg:block">Vault</span>
           </button>
           
           <div className="pt-4 mt-4 border-t border-slate-800">
             <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:block mb-2">Web Apps</p>
             <div className="space-y-1">
               {(settings.webTools || []).map(tool => (
                 <button
                   key={tool.id}
                   onClick={() => handleWebToolClick(tool.id)}
                   className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${mode === 'webtool' && activeWebToolId === tool.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                   title={tool.name}
                 >
                   <span className="text-xl w-6 text-center">{tool.icon}</span>
                   <span className="font-medium hidden lg:block truncate text-sm">{tool.name}</span>
                 </button>
               ))}
               <button 
                 onClick={() => setShowSettings(true)}
                 className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all border border-dashed border-slate-700 mt-2"
               >
                 <span className="text-xl w-6 text-center">+</span>
                 <span className="font-medium hidden lg:block text-sm">Add App</span>
               </button>
             </div>
           </div>
        </div>

        {/* Active Agent Display (Sidebar Footer) */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/50">
           <div className="flex items-center gap-3">
             <div className="text-2xl bg-slate-700 w-10 h-10 flex items-center justify-center rounded-full">
                {activeAgent.icon}
             </div>
             <div className="hidden lg:block overflow-hidden">
                <p className="text-xs text-slate-400">Current Agent</p>
                <p className="text-sm font-bold text-white truncate">{activeAgent.name}</p>
             </div>
           </div>
           <button 
              onClick={() => setShowSettings(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors border border-slate-700"
           >
             <SettingsIcon className="w-4 h-4" /> <span className="hidden lg:inline">Configure</span>
           </button>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* Top Bar: Global Agent Switcher (Visible unless in full-screen WebTool) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
           <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-500 hidden md:inline">I am currently helping you as:</span>
              <div className="relative">
                 <button 
                    onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors active:scale-95"
                 >
                    <span className="text-lg">{activeAgent.icon}</span>
                    <span className="font-bold text-slate-700">{activeAgent.name}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isAgentMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </button>
                 
                 {isAgentMenuOpen && (
                   <div className="fixed inset-0 z-40" onClick={() => setIsAgentMenuOpen(false)}></div>
                 )}

                 {isAgentMenuOpen && (
                   <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-2 animate-fade-in z-50">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">Select Agent</div>
                      <div className="max-h-[60vh] overflow-y-auto space-y-1">
                        {settings.agents.map(agent => (
                          <button 
                            key={agent.id}
                            onClick={() => handleAgentSelect(agent.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${activeAgent.id === agent.id ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                          >
                             <span className="text-lg w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100">{agent.icon}</span>
                             <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{agent.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{agent.provider} • {agent.modelId}</div>
                             </div>
                             {activeAgent.id === agent.id && (
                               <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                             )}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => { setShowSettings(true); setIsAgentMenuOpen(false); }}
                        className="w-full text-center text-xs text-brand-600 font-bold py-3 mt-2 border-t border-slate-100 hover:bg-slate-50 rounded-b-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <SettingsIcon className="w-3 h-3" /> Manage Agents
                      </button>
                   </div>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              {mode === 'vault' && (
                 <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer hover:text-brand-600 border border-transparent hover:border-slate-200 rounded px-2 py-1 transition-colors"
                 >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                 </select>
              )}
           </div>
        </header>

        {/* Dynamic View with Keep-Alive */}
        <main className="flex-1 overflow-hidden relative">
           
           {/* MODE: CHAT */}
           <div className={`absolute inset-0 bg-slate-50 flex flex-col ${mode === 'chat' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
             <ChatInterface 
                agent={activeAgent} 
                userSettings={settings} 
                history={chatHistories[activeAgent.id] || []}
                onUpdateHistory={updateChatHistory}
             />
           </div>

           {/* MODE: VAULT */}
           <div className={`absolute inset-0 bg-slate-50 flex flex-col ${mode === 'vault' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
             <div className="flex h-full">
                {/* List of Meetings */}
                <div className={`${selectedMeetingId ? 'hidden md:block w-80' : 'w-full'} bg-white border-r border-slate-200 overflow-y-auto`}>
                   <div className="p-4 sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-slate-100">
                      <h2 className="font-bold text-slate-800 text-lg mb-1">Vault</h2>
                      <p className="text-xs text-slate-500">Your digital memory & recordings</p>
                   </div>
                   
                   <div className="p-3 space-y-2">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center gap-3 mb-4">
                         <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
                      </div>

                      {meetings.length === 0 && !isProcessing && (
                        <div className="text-center p-8 text-slate-400">
                           <p className="text-sm">No recordings yet.</p>
                        </div>
                      )}

                      {meetings.map(meeting => (
                         <div 
                           key={meeting.id}
                           onClick={() => setSelectedMeetingId(meeting.id)}
                           className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedMeetingId === meeting.id ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-slate-100 hover:border-brand-200 hover:shadow-sm'}`}
                         >
                            <div className="flex justify-between items-start mb-1">
                               <h3 className={`font-semibold text-sm truncate pr-2 ${selectedMeetingId === meeting.id ? 'text-brand-700' : 'text-slate-700'}`}>{meeting.title}</h3>
                               <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(meeting.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 h-8">{meeting.report ? meeting.report.substring(0, 80) : "Processing..."}</p>
                            <div className="flex gap-1 mt-2 flex-wrap h-4 overflow-hidden">
                               {meeting.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] px-1.5 rounded-full bg-slate-100 text-slate-500">#{t}</span>)}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Meeting Detail View */}
                {selectedMeetingId ? (
                   <div className="flex-1 h-full overflow-hidden">
                      {meetings.find(m => m.id === selectedMeetingId) && (
                         <MeetingDetail 
                           key={selectedMeetingId}
                           meeting={meetings.find(m => m.id === selectedMeetingId)!} 
                           onClose={() => setSelectedMeetingId(null)}
                           onUpdateTags={(tags, suggested) => updateMeeting(selectedMeetingId, { tags, suggestedTags: suggested })}
                           onUpdateReport={(newReport) => updateMeeting(selectedMeetingId, { report: newReport })}
                           onUpdateTitle={(newTitle) => updateMeeting(selectedMeetingId, { title: newTitle })}
                           onDelete={() => deleteMeeting(selectedMeetingId)}
                         />
                      )}
                   </div>
                ) : (
                   <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 text-slate-400 flex-col gap-4">
                      <ArchiveIcon className="w-16 h-16 opacity-20" />
                      <p>Select a record to view details</p>
                   </div>
                )}
             </div>
           </div>

           {/* MODE: WEB TOOLS (Browser Tabs) */}
           {/* We render ALL active web tools but hide them, so iframes don't reload when switching tabs */}
           {(settings.webTools || []).map(tool => (
             <div 
               key={tool.id} 
               className={`absolute inset-0 bg-white flex flex-col ${mode === 'webtool' && activeWebToolId === tool.id ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
             >
               <WebToolView tool={tool} />
             </div>
           ))}

        </main>
      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
         <SettingsModal 
           settings={settings} 
           onUpdateSettings={setSettings} 
           onClose={() => setShowSettings(false)} 
           meetings={meetings}
           onImportMeetings={(newMeetings) => setMeetings(newMeetings)}
           chatHistories={chatHistories}
           onImportChats={(newChats) => setChatHistories(newChats)}
         />
      )}
    </div>
  );
}

export default App;
