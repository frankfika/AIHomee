
import React from 'react';
import { WebTool } from '../types';
import { ExternalLinkIcon } from './Icons';

interface WebToolViewProps {
  tool: WebTool;
}

const WebToolView: React.FC<WebToolViewProps> = ({ tool }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tool.icon}</span>
          <h2 className="font-bold text-slate-800">{tool.name}</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded truncate max-w-xs hidden sm:block">
            {tool.url}
          </span>
        </div>
        <div className="flex gap-2">
            <a 
              href={tool.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
               Open in New Tab <ExternalLinkIcon className="w-4 h-4" />
            </a>
        </div>
      </div>
      <div className="flex-1 relative bg-white">
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 z-0">
           <div className="text-center p-8">
              <p className="mb-2">Loading {tool.name}...</p>
              <p className="text-sm opacity-70">If it doesn't load, the site may not allow embedding.</p>
           </div>
        </div>
        <iframe 
          src={tool.url} 
          className="w-full h-full border-none relative z-10 bg-white" 
          title={tool.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

export default WebToolView;
