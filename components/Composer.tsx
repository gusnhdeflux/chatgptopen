'use client';

import { useState } from 'react';

type ComposerProps = {
  onSend: (value: string) => Promise<void>;
  disabled?: boolean;
};

export default function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState('');

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    await onSend(text);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 p-3 shadow-soft backdrop-blur">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        rows={3}
        placeholder="Напишите сообщение…"
        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => void submit()}
          disabled={disabled}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
