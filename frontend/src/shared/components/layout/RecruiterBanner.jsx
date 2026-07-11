import React, { useState } from 'react';
import { AlertCircle, X, Github } from 'lucide-react';

export default function RecruiterBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 fixed top-0 left-0 w-full z-[9999] backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
        <div className="flex-shrink-0 pt-0.5 sm:pt-0">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1 text-sm text-yellow-700 dark:text-yellow-400">
          <span className="font-semibold mr-1">Note to Recruiters:</span> 
          This application uses a heavy Microservices Architecture (8 Services + Kafka + Postgres). To optimize AWS EC2 costs, the backend servers may be in a stopped state. If the live demo is unresponsive, please check the source code and architecture diagrams on GitHub.
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <a
            href="https://github.com/aapka-username/AI-Screaming-Project"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 rounded-md transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View GitHub</span>
          </a>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 text-yellow-600 hover:bg-yellow-500/20 rounded-md transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
