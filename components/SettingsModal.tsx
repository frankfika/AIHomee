
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Agent, UserSettings, ModelProvider, WebTool, MeetingData, ChatMessage } from '../types';
import { KeyIcon, RobotIcon, CloudIcon, GlobeIcon, DownloadIcon, UploadIcon } from './Icons';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onClose: () => void;
  // New props for backup/restore
  meetings: MeetingData[];
  onImportMeetings: (meetings: MeetingData[]) => void;
  chatHistories: Record<string, ChatMessage[]>;
  onImportChats: (chats: Record<string, ChatMessage[]>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, 
  onUpdateSettings, 
  onClose,
  meetings,
  onImportMeetings,
  chatHistories,
  onImportChats
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'agents' | 'webtools' | 'data'>('keys');
  const [editingAgent, setEditingAgent] = useState<Partial<Agent> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Web Tool State
  const [newWebTool, setNewWebTool] = useState<Partial<WebTool>>({ icon: '🌐' });

  const handleKeyChange = (provider: keyof UserSettings['apiKeys'], value: string) => {
    onUpdateSettings({
      ...settings,
      apiKeys: { ...settings.apiKeys, [provider]: value }
    });
  };

  const handleSaveAgent = () => {
    if (!editingAgent || !editingAgent.name || !editingAgent.systemInstruction) return;

    const provider = editingAgent.provider || 'google';
    
    // Validation for API Keys
    if (!settings.apiKeys[provider]) {
        if (!window.confirm(`⚠️ Warning: You have not configured an API Key for ${provider} yet.\n\nThis agent will not work without it. Do you want to proceed saving?`)) {
            setActiveTab('keys');
            return;
        }
    }

    if (editingAgent.id) {
      // Update existing
      const updatedAgents = settings.agents.map(a => 
        a.id === editingAgent.id ? { ...a, ...editingAgent } as Agent : a
      );
      onUpdateSettings({ ...settings, agents: updatedAgents });
    } else {
      // Create new
      const newAgent: Agent = {
        id: uuidv4(),
        name: editingAgent.name,
        description: editingAgent.description || 'Custom Agent',
        icon: editingAgent.icon || '🤖',
        systemInstruction: editingAgent.systemInstruction,
        provider: provider,
        modelId: editingAgent.modelId || 'gemini-2.5-flash',
        isDefault: false
      };
      onUpdateSettings({ ...settings, agents: [...settings.agents, newAgent] });
    }
    setEditingAgent(null);
  };

  const deleteAgent = (id: string) => {
    onUpdateSettings({ ...settings, agents: settings.agents.filter(a => a.id !== id) });
  };

  const handleAddWebTool = () => {
    if (!newWebTool.name || !newWebTool.url) return;
    const tool: WebTool = {
      id: uuidv4(),
      name: newWebTool.name,
      url: newWebTool.url,
      icon: newWebTool.icon || '🌐'
    };
    onUpdateSettings({
      ...settings,
      webTools: [...(settings.webTools || []), tool]
    });
    setNewWebTool({ icon: '🌐', name: '', url: '' });
  };

  const handleDeleteWebTool = (id: string) => {
    onUpdateSettings({
      ...settings,
      webTools: settings.webTools.filter(t => t.id !== id)
    });
  };

  // --- Data Management Functions ---
  const handleExportData = () => {
    const dataToExport = {
      version: 1,
      date: new Date().toISOString(),
      settings: settings,
      meetings: meetings.map(({ audioBlob, audioUrl, ...rest }) => rest), // Exclude blobs/urls
      chatHistories: chatHistories
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.version && json.settings) {
          if (window.confirm("This will overwrite your current settings, agents, and meetings. Are you sure?")) {
            onUpdateSettings(json.settings);
            if (json.meetings) onImportMeetings(json.meetings);
            if (json.chatHistories) onImportChats(json.chatHistories);
            alert("Data imported successfully!");
            onClose();
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm("DANGER: This will permanently delete ALL meetings, chats, and custom agents. This cannot be undone.")) {
       localStorage.clear();
       window.location.reload();
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh] animate-fade-in">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-2">
            <h2 className="text-lg font-bold text-slate-800 mb-6 px-2">Settings</h2>
            
            <button 
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'keys' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <KeyIcon className="w-5 h-5" /> API Keys
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'agents' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <RobotIcon className="w-5 h-5" /> Agents
            </button>
            <button 
              onClick={() => setActiveTab('webtools')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'webtools' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <GlobeIcon className="w-5 h-5" /> Web Apps
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <CloudIcon className="w-5 h-5" /> Data & Storage
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex justify-end">
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'keys' && (
                <div className="space-y-6 max-w-lg">
                  <h3 className="text-xl font-bold text-slate-800">Model Provider Keys</h3>
                  <p className="text-sm text-slate-500">Enter your personal API keys to use different models. Keys are stored locally in your browser.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Google Gemini (Recommended)</label>
                      <input 
                        type="password" 
                        value={settings.apiKeys.google} 
                        onChange={e => handleKeyChange('google', e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI</label>
                      <input 
                        type="password" 
                        value={settings.apiKeys.openai} 
                        onChange={e => handleKeyChange('openai', e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Anthropic</label>
                      <input 
                        type="password" 
                        value={settings.apiKeys.anthropic} 
                        onChange={e => handleKeyChange('anthropic', e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'agents' && (
                <div className="h-full flex gap-6">
                  {/* List */}
                  <div className="w-1/3 border-r border-slate-100 pr-6 overflow-y-auto">
                    <button 
                      onClick={() => setEditingAgent({ provider: 'google', modelId: 'gemini-2.5-flash', icon: '🤖' })}
                      className="w-full py-2 mb-4 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700"
                    >
                      + Create New Agent
                    </button>
                    <div className="space-y-2">
                      {settings.agents.map(agent => (
                        <div 
                          key={agent.id}
                          onClick={() => setEditingAgent(agent)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${editingAgent?.id === agent.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span>{agent.icon}</span>
                            <span className="font-semibold text-sm">{agent.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{agent.provider}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 pl-2">
                    {editingAgent ? (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-4">
                          <div className="w-16">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Icon</label>
                            <input 
                              type="text" 
                              value={editingAgent.icon || ''} 
                              onChange={e => setEditingAgent({...editingAgent, icon: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                            <input 
                              type="text" 
                              value={editingAgent.name || ''} 
                              onChange={e => setEditingAgent({...editingAgent, name: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                            <input 
                              type="text" 
                              value={editingAgent.description || ''} 
                              onChange={e => setEditingAgent({...editingAgent, description: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Provider</label>
                              <select 
                                value={editingAgent.provider} 
                                onChange={e => setEditingAgent({...editingAgent, provider: e.target.value as ModelProvider})}
                                className={`w-full px-3 py-2 border rounded-lg bg-white ${!settings.apiKeys[editingAgent.provider || 'google'] ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-300 focus:ring-brand-500'}`}
                              >
                                <option value="google">Google</option>
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                              </select>
                              {editingAgent.provider && !settings.apiKeys[editingAgent.provider] && (
                                <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠️ No key configured for {editingAgent.provider}</p>
                              )}
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Model ID</label>
                              <input 
                                type="text" 
                                value={editingAgent.modelId || ''} 
                                onChange={e => setEditingAgent({...editingAgent, modelId: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                placeholder="e.g. gemini-2.5-flash"
                              />
                           </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">System Instruction (The "Persona")</label>
                          <textarea 
                            value={editingAgent.systemInstruction || ''} 
                            onChange={e => setEditingAgent({...editingAgent, systemInstruction: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg h-40 font-mono text-sm"
                            placeholder="You are a helpful assistant..."
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          {editingAgent.id && !editingAgent.isDefault && (
                             <button onClick={() => deleteAgent(editingAgent.id!)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium">Delete</button>
                          )}
                          <button onClick={handleSaveAgent} className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">Save Agent</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">Select an agent to edit</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'webtools' && (
                <div>
                   <h3 className="text-xl font-bold text-slate-800 mb-4">Web Apps</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {(settings.webTools || []).map(tool => (
                        <div key={tool.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                           <span className="text-2xl">{tool.icon}</span>
                           <div className="flex-1 min-w-0">
                             <div className="font-bold text-slate-800 truncate">{tool.name}</div>
                             <div className="text-xs text-slate-400 truncate">{tool.url}</div>
                           </div>
                           <button onClick={() => handleDeleteWebTool(tool.id)} className="text-slate-400 hover:text-red-500 p-2">&times;</button>
                        </div>
                      ))}
                   </div>

                   <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Add New Web App</h4>
                      <div className="flex gap-2 mb-2">
                         <input 
                           type="text" 
                           placeholder="Icon"
                           className="w-16 px-3 py-2 border border-slate-300 rounded-lg text-center"
                           value={newWebTool.icon}
                           onChange={e => setNewWebTool({...newWebTool, icon: e.target.value})}
                         />
                         <input 
                           type="text" 
                           placeholder="App Name (e.g. NotebookLLM)"
                           className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                           value={newWebTool.name}
                           onChange={e => setNewWebTool({...newWebTool, name: e.target.value})}
                         />
                      </div>
                      <div className="flex gap-2">
                        <input 
                           type="text" 
                           placeholder="URL (e.g. https://notebooklm.google.com)"
                           className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                           value={newWebTool.url}
                           onChange={e => setNewWebTool({...newWebTool, url: e.target.value})}
                        />
                        <button 
                          onClick={handleAddWebTool}
                          disabled={!newWebTool.name || !newWebTool.url}
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <CloudIcon className="w-5 h-5 text-brand-500" /> Data Management
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-2">Backup & Restore</h4>
                      <p className="text-sm text-slate-500 mb-4">Export all your settings, agents, and meeting notes to a JSON file. Use this to transfer data between devices or keep a safe backup.</p>
                      
                      <div className="flex gap-4">
                        <button 
                          onClick={handleExportData}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors"
                        >
                          <DownloadIcon className="w-4 h-4" /> Export Backup
                        </button>
                        
                        <button 
                          onClick={handleImportClick}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                        >
                          <UploadIcon className="w-4 h-4" /> Import Backup
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".json"
                          className="hidden" 
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-red-50 rounded-xl border border-red-100 mt-8">
                       <h4 className="font-bold text-red-700 mb-2">Danger Zone</h4>
                       <p className="text-sm text-red-600/70 mb-4">Resetting the application will delete all locally stored data, including meetings, chats, and custom agents.</p>
                       <button 
                          onClick={handleClearAllData}
                          className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                       >
                          Reset Application
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
