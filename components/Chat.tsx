'use client';

import { useState } from 'react';
import Composer from '@/components/Composer';
import MessageList, { UIMessage } from '@/components/MessageList';

export default function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    setError(null);
    const nextMessages: UIMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      setMessages((current) => [...current, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });
        setMessages((current) => {
          const updated = [...current];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить ответ';
      setError(message);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur">
        <h1 className="text-base font-medium text-slate-100">Chat + Supabase data viewer</h1>
        <p className="mt-1 text-sm text-slate-400">Polza.ai streaming + server-side tool calling + secure Supabase access</p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-600/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>
      )}

      <MessageList messages={messages} isTyping={isTyping} />
      <Composer onSend={sendMessage} disabled={isTyping} />
    </div>
  );
}
