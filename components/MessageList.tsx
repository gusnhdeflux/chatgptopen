'use client';

import { useEffect, useRef } from 'react';
import DataTable from '@/components/DataTable';

export type UIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type MessageListProps = {
  messages: UIMessage[];
  isTyping: boolean;
};

const TABLE_BLOCK_REGEX = /```supabase-data\n([\s\S]*?)\n```/m;

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft backdrop-blur">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const { text, rows } = parseMessage(message.content);

        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                isUser
                  ? 'max-w-[85%] rounded-2xl rounded-br-md border border-indigo-300/20 bg-indigo-500/25 px-4 py-3 text-sm text-indigo-50'
                  : 'max-w-[92%] rounded-2xl rounded-bl-md border border-slate-600/40 bg-slate-900/70 px-4 py-3 text-sm text-slate-100'
              }
            >
              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
              {!isUser && rows && <DataTable rows={rows} />}
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-600/40 bg-slate-900/70 px-4 py-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
          </div>
        </div>
      )}
      <div ref={anchorRef} />
    </div>
  );
}

function parseMessage(content: string) {
  const match = content.match(TABLE_BLOCK_REGEX);
  if (!match) {
    return { text: content, rows: null as Record<string, unknown>[] | null };
  }

  const text = content.replace(TABLE_BLOCK_REGEX, '').trim();

  try {
    const parsed = JSON.parse(match[1]);
    return {
      text,
      rows: Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : null
    };
  } catch {
    return { text: content, rows: null as Record<string, unknown>[] | null };
  }
}
