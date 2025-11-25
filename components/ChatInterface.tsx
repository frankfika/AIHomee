
import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, UserSettings } from '../types';
import { chatWithAgent } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { RobotIcon } from './Icons';

interface ChatInterfaceProps {
  agent: Agent;
  userSettings: UserSettings;
  history: ChatMessage[];
  onUpdateHistory: (messages: ChatMessage[]) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ agent, userSettings, history, onUpdateHistory }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const newHistory = [...history, userMsg];
    onUpdateHistory(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // Determine which key to use based on provider
      let apiKey = '';
      if (agent.provider === 'google') apiKey = userSettings.apiKeys.google;
      else if (agent.provider === 'openai') apiKey = userSettings.apiKeys.openai;
      else if (agent.provider === 'anthropic') apiKey = userSettings.apiKeys.anthropic;

      const responseText = await chatWithAgent(agent, newHistory, userMsg.content, apiKey);
      
      const botMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      onUpdateHistory([...newHistory, botMsg]);

    } catch (error) {
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        content: "I encountered an error connecting to the service. Please check your API Keys in settings.",
        timestamp: Date.now()
      };
      onUpdateHistory([...newHistory, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
             <div className="text-6xl mb-4">{agent.icon}</div>
             <p>Start chatting with {agent.name}...</p>
          </div>
        )}
        
        {history.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
               msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
             }`}>
               {msg.role === 'model' && (
                 <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase">
                   <RobotIcon className="w-3 h-3" /> {agent.name}
                 </div>
               )}
               {msg.content}
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 flex gap-1">
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-slate-400">
          Powered by {agent.provider} ({agent.modelId})
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
