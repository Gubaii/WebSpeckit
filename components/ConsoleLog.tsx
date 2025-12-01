import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

const ConsoleLog: React.FC<{ logs: string[] }> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-300 font-mono text-sm">
      <div className="p-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950">
        <Terminal size={14} />
        <span className="text-xs font-bold uppercase">System Console</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.length === 0 && <div className="text-slate-600 italic">Ready for input...</div>}
        {logs.map((log, idx) => (
          <div key={idx} className="break-all">
            <span className="text-blue-500 mr-2">{'>'}</span>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default ConsoleLog;