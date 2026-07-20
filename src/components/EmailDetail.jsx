import { Reply, ArrowLeft, Trash2 } from 'lucide-react';

export default function EmailDetail({ email, loading, onReply, onBack, onDelete }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] text-sm">
        Loading…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 hidden lg:flex items-center justify-center text-[var(--text-faint)] text-sm">
        Select an email to read it.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="p-5 border-b flex items-start gap-3" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onBack} className="lg:hidden shrink-0 p-1 -ml-1 text-[var(--text-muted)]">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate">{email.subject || '(no subject)'}</h2>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            <span className="text-[var(--text)]">{email.from_address}</span>
            <span className="mx-1.5 text-[var(--text-faint)]">→</span>
            <span>{email.to_address}</span>
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-faint)]">
            {new Date(email.received_at).toLocaleString()}
          </div>
        </div>
        <button
          onClick={() => onReply(email)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <Reply size={14} />
          Reply
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(email.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium hover:border-red-400 hover:text-red-400 transition-colors"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="p-5 flex-1">
        {email.html_body ? (
          <div
            className="text-sm text-[var(--text)] [&_a]:text-[var(--accent-strong)]"
            dangerouslySetInnerHTML={{ __html: email.html_body }}
          />
        ) : (
          <div className="text-sm text-[var(--text)] whitespace-pre-wrap">{email.body}</div>
        )}
      </div>
    </div>
  );
}
