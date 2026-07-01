'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; text: string };

const API_STATUS = '/api/assist/status';
const API_QUERY = '/api/assist/query';

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function buildTranscriptPrompt(messages: Message[], latestUser: string, maxPairs = 6) {
  const pairs: string[] = [];
  for (let i = messages.length - 1; i >= 0 && pairs.length < maxPairs; i--) {
    const m = messages[i];
    if (m.role === 'assistant') {
      const prev = messages[i - 1];
      if (prev?.role === 'user') {
        pairs.unshift(`User: ${prev.text}\nAssistant: ${m.text}`);
        i -= 1;
      }
    }
  }
  const history = pairs.join('\n\n');
  return (history ? history + '\n\n' : '') + `User: ${latestUser}\nAssistant:`;
}

export const AssistChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: 'assistant',
      text: 'Hi! I can help with:\n• Finding invoices and MRNs\n• Preparing evidence packs\n• Duty rate lookups\n• Claim suggestions\n\nTry: "Find MRN 23GB001XYZ" or "Evidence for tariff error"',
    },
  ]);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_STATUS, { cache: 'no-store' });
        if (!alive) return;
        setBackendOnline(r.ok);
      } catch {
        if (!alive) return;
        setBackendOnline(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;

    const text = input.trim();
    setInput('');
    setError(null);

    const userMsg: Message = { id: uid(), role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setSending(true);

    try {
      const prompt = buildTranscriptPrompt(updatedMessages, text);
      const context: Record<string, string> = {};

      try {
        const m = window.location.pathname.match(/\/claims\/([^/]+)/);
        if (m?.[1]) context.claimId = m[1];
      } catch {
        // Ignore pathname errors
      }

      const res = await fetch(API_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!res.ok) {
        let message = `Assistant request failed (${res.status})`;
        try {
          const j = (await res.json()) as { message?: string | string[] };
          if (j?.message) {
            message = Array.isArray(j.message) ? j.message.join(', ') : j.message;
          }
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(message);
      }

      const data = (await res.json()) as { response?: string; message?: string };
      const replyText: string =
        data?.response ||
        data?.message ||
        'I am sorry - I could not generate a response at this time.';

      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: replyText }]);
      setBackendOnline(true);
    } catch (err: unknown) {
      console.error(err);
      setBackendOnline(false);
      const error =
        err instanceof Error ? err : new Error('Could not reach the Arcanus Assist backend.');
      setError(error.message ?? 'Could not reach the Arcanus Assist backend.');
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: 'I could not contact the backend right now. Please verify your API is reachable at /api/assist/query.',
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {backendOnline === false && (
        <div
          className="suite-chat-error"
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 193, 7, 0.15)',
            color: '#ffd166',
            borderBottom: '1px solid rgba(255, 193, 7, 0.25)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Arcanus Assist can't reach the backend. Check your API server.
        </div>
      )}

      <div
        ref={listRef}
        className="suite-chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'transparent',
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`suite-message suite-message-${m.role}`}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '10px 12px',
              borderRadius: 12,
              lineHeight: 1.45,
              color: m.role === 'user' ? '#111' : '#f5f5f5',
              background:
                m.role === 'user'
                  ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  : 'rgba(255,255,255,0.08)',
              border:
                m.role === 'user'
                  ? '1px solid rgba(0,0,0,0.15)'
                  : '1px solid rgba(212,175,55,0.25)',
              boxShadow:
                m.role === 'user' ? '0 2px 10px rgba(0,0,0,0.25)' : '0 1px 8px rgba(0,0,0,0.25)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              animation: 'suite-message-fade-in 0.3s ease-in-out',
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {error && (
        <div
          className="suite-chat-error-message"
          style={{
            padding: '8px 12px',
            color: '#ffb3b3',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.25)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={send}
        style={{
          borderTop: '1px solid rgba(212,175,55,0.25)',
          padding: 10,
          display: 'flex',
          gap: 8,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Arcanus Assist… (Shift+Enter for newline)"
          className="suite-chat-input"
          style={{
            flex: 1,
            height: 44,
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.25)',
            padding: '0 12px',
            outline: 'none',
            color: '#f9f9f9',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="suite-chat-send"
          style={{
            height: 44,
            padding: '0 16px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.1)',
            background: canSend
              ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
              : 'linear-gradient(135deg, #8b5cf680, #6d28d980)',
            color: '#111',
            fontWeight: 700,
            cursor: canSend ? 'pointer' : 'not-allowed',
            minWidth: 96,
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>

      <style>{`
        @keyframes suite-message-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AssistChat;
