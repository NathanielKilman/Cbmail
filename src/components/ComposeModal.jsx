import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { sendEmail } from '../lib/api';

const SENDERS = ['business@cybearbots.org', 'mechanical@cybearbots.org', 'code@cybearbots.org'];

export default function ComposeModal({ initial, onClose, onSent }) {
  const [from, setFrom] = useState(initial.from || SENDERS[0]);
  const [to, setTo] = useState(initial.to || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.body || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await sendEmail({ from, to, subject, body, replyToEmailId: initial.replyToEmailId });
      onSent();
    } catch (err) {
      setError('Failed to send. Check the console/network tab.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="card w-full sm:max-w-lg max-h-[90vh] flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="label-mono">{initial.replyToEmailId ? 'Reply' : 'New Message'}</span>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          <label className="flex flex-col gap-1 text-sm">
            <span className="label-mono">From</span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-[var(--bg-card)] border rounded-md px-3 py-2 text-[var(--text)]"
              style={{ borderColor: 'var(--border)' }}
            >
              {SENDERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="label-mono">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-[var(--bg-card)] border rounded-md px-3 py-2 text-[var(--text)]"
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="label-mono">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-[var(--bg-card)] border rounded-md px-3 py-2 text-[var(--text)]"
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm flex-1">
            <span className="label-mono">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="bg-[var(--bg-card)] border rounded-md px-3 py-2 text-[var(--text)] resize-none flex-1"
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleSend}
            disabled={sending || !to || !subject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[#08130e] font-semibold text-sm hover:bg-[var(--accent-strong)] disabled:opacity-50 transition-colors"
          >
            <Send size={15} />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
