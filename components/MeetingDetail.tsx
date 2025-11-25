
import React, { useState, useRef } from 'react';
import { MeetingData, MeetingStatus } from '../types';
import { TagIcon, SparklesIcon, MicIcon, PencilIcon, TrashIcon } from './Icons';
import { refineMeetingReport } from '../services/geminiService';

interface MeetingDetailProps {
  meeting: MeetingData;
  onClose: () => void;
  onUpdateTags: (tags: string[], suggestedTags?: string[]) => void;
  onUpdateReport: (newReport: string) => void;
  onUpdateTitle: (newTitle: string) => void;
  onDelete: () => void;
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ meeting, onClose, onUpdateTags, onUpdateReport, onUpdateTitle, onDelete }) => {
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'report' | 'transcript'>('report');
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(meeting.title || '');
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editableReport, setEditableReport] = useState(meeting.report || '');
  
  // AI Refine State
  const [aiInstruction, setAiInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !meeting.tags.includes(newTag.trim())) {
      onUpdateTags([...meeting.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTags(meeting.tags.filter(t => t !== tagToRemove));
  };

  const handleAcceptSuggestion = (tag: string) => {
    const updatedTags = [...meeting.tags, tag];
    const updatedSuggestions = meeting.suggestedTags.filter(t => t !== tag);
    onUpdateTags(updatedTags, updatedSuggestions);
  };

  const handleSaveManualEdit = () => {
    onUpdateReport(editableReport);
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    if (window.confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      onDelete();
    }
  };

  const handleAiRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInstruction.trim()) return;

    setIsRefining(true);
    try {
      const newContent = await refineMeetingReport(
        meeting.report || '', 
        meeting.transcription || '', 
        aiInstruction
      );
      onUpdateReport(newContent);
      setEditableReport(newContent);
      setAiInstruction('');
    } catch (err) {
      alert("Failed to refine with AI");
    } finally {
      setIsRefining(false);
    }
  };

  const startEditingTitle = () => {
    setTitleInput(meeting.title);
    setIsEditingTitle(true);
  };

  const saveTitle = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (titleInput.trim()) {
        onUpdateTitle(titleInput);
    }
    setIsEditingTitle(false);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-20">
        <div className="flex-1 min-w-0 mr-4">
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">
            ← Back to list
          </button>
          
          <div className="flex items-center gap-3">
             {isEditingTitle ? (
                <form onSubmit={saveTitle} className="flex-1 max-w-xl">
                    <input 
                        autoFocus
                        type="text" 
                        value={titleInput}
                        onChange={e => setTitleInput(e.target.value)}
                        onBlur={() => saveTitle()}
                        className="text-2xl font-bold text-slate-800 w-full border-b-2 border-brand-500 outline-none bg-transparent px-1 pb-1"
                    />
                </form>
             ) : (
                <div className="flex items-center gap-2 group flex-1 min-w-0">
                     <h1 className="text-2xl font-bold text-slate-800 truncate" onDoubleClick={startEditingTitle}>
                        {meeting.title || "Untitled Meeting"}
                     </h1>
                     <button 
                        onClick={startEditingTitle}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 transition-all p-1"
                        title="Edit Title"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    {meeting.language && (
                       <span className="shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-500 tracking-wider">
                         {meeting.language}
                       </span>
                     )}
                </div>
             )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{formatDate(meeting.date)}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
              meeting.status === MeetingStatus.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' : 
              meeting.status === MeetingStatus.PROCESSING ? 'bg-blue-50 text-blue-700 border-blue-200' : 
              'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {meeting.status}
            </div>
            <button 
              onClick={handleDeleteConfirm}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Delete Meeting"
            >
               <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6 mt-2">
            <button 
              onClick={() => setActiveTab('report')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'report' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Meeting Report
            </button>
            <button 
              onClick={() => setActiveTab('transcript')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transcript' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Original Transcript
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative bg-slate-50/30">
            {activeTab === 'report' ? (
              <div className="max-w-3xl mx-auto space-y-4">
                
                {/* AI Refine Bar */}
                {!isEditing && (
                  <div className="bg-gradient-to-r from-brand-50 to-purple-50 p-1 rounded-xl shadow-sm border border-brand-100 mb-6">
                    <form onSubmit={handleAiRefine} className="flex gap-2 items-center bg-white rounded-lg p-1.5 pl-3">
                      <SparklesIcon className="w-5 h-5 text-purple-500 shrink-0 animate-pulse" />
                      <input 
                        type="text" 
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        placeholder="Ask AI to edit (e.g. 'Make it more formal', 'Translate to English', 'Add a risk section')" 
                        className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                        disabled={isRefining}
                      />
                      <button 
                        type="submit"
                        disabled={isRefining || !aiInstruction}
                        className="bg-brand-600 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-brand-700 disabled:opacity-50 transition-all"
                      >
                        {isRefining ? 'Refining...' : 'Refine'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Report Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                       📝 Minutes
                     </h2>
                     {!isEditing ? (
                       <button onClick={() => { setEditableReport(meeting.report || ''); setIsEditing(true); }} className="text-xs font-medium text-brand-600 hover:text-brand-800">
                         Edit Manually
                       </button>
                     ) : (
                       <div className="flex gap-2">
                         <button onClick={() => setIsEditing(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                         <button onClick={handleSaveManualEdit} className="text-xs font-bold text-brand-600 hover:text-brand-800">Save</button>
                       </div>
                     )}
                   </div>
                   
                   <div className="p-6">
                      {isEditing ? (
                        <textarea 
                          className="w-full h-[60vh] p-4 text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none font-mono"
                          value={editableReport}
                          onChange={(e) => setEditableReport(e.target.value)}
                        />
                      ) : (
                        <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                          {meeting.report || "No report generated."}
                        </div>
                      )}
                   </div>
                </div>

                {meeting.audioUrl && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Original Audio</h3>
                    <audio controls className="w-full h-8" src={meeting.audioUrl} />
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <p className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed font-mono">
                      {meeting.transcription || "Transcription pending..."}
                    </p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Tags */}
        <div className="w-72 bg-white border-l border-slate-100 flex flex-col shrink-0 p-6 space-y-6 overflow-y-auto">
            {/* Tags */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TagIcon className="text-brand-500 w-5 h-5" /> Tags
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {meeting.tags.length === 0 && <span className="text-sm text-slate-400 italic">No tags.</span>}
                {meeting.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-medium border border-brand-100">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-brand-900 ml-1 font-bold">&times;</button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddTag} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button type="submit" disabled={!newTag.trim()} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">+</button>
              </form>

              {meeting.suggestedTags && meeting.suggestedTags.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" /> Suggestions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meeting.suggestedTags.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => handleAcceptSuggestion(tag)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white text-slate-500 rounded border border-slate-200 text-xs hover:border-brand-300 hover:text-brand-600 transition-all border-dashed"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;
