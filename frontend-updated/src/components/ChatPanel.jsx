import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

const roleStyles = {
  customer: 'bg-[#2563EB] text-white',
  staff: 'bg-[#B5651D] text-white',
  admin: 'bg-[#1E2422] text-white',
  system: 'bg-[#EDEFEF] text-[#525F58]',
};

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Generic message-thread widget shared by the customer, staff, and admin
 * portals. `currentRole` decides which bubbles render as "mine" (right,
 * coloured) vs "theirs" (left, grey) — pass the role of whoever is viewing.
 */
export default function ChatPanel({
  messages = [],
  currentRole,
  onSend,
  placeholder = 'Write a message...',
  emptyText = 'No messages yet.',
  heightClass = 'h-[380px]',
  title,
  icon: Icon = MessageCircle,
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-[#EDEFEF] flex items-center gap-2">
          <Icon size={16} className="text-[#8A938D]" />
          <p className="text-sm font-semibold text-[#1E2422]">{title}</p>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto p-5 space-y-3 ${heightClass}`}>
        {messages.length === 0 && (
          <p className="text-sm text-[#8A938D] text-center py-10">{emptyText}</p>
        )}
        {messages.map((m) => {
          const mine = m.role === currentRole;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? roleStyles[m.role] || 'bg-[#2563EB] text-white' : 'bg-[#F7F8F6] text-[#1E2422]'
                }`}
              >
                {!mine && <p className="text-xs font-semibold mb-0.5 opacity-70">{m.author}</p>}
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
              <span className="text-[11px] text-[#8A938D] mt-1 px-1">{formatTime(m.time)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#EDEFEF] p-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          className="flex-1 bg-[#F7F8F6] border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-md transition flex items-center gap-1.5"
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}
