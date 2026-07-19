function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function EmailList({ emails, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] text-sm">
        Loading…
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] text-sm">
        No emails in this inbox yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((e) => {
        const active = e.id === selectedId;
        const unread = !e.is_read;
        return (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={`w-full text-left px-4 py-3 border-b flex items-start gap-3 transition-colors ${
              active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                unread ? 'bg-[var(--accent-strong)]' : 'bg-transparent'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-sm ${
                    unread ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {e.from_address}
                </span>
                <span className="text-xs text-[var(--text-faint)] shrink-0">
                  {timeAgo(e.received_at)}
                </span>
              </div>
              <div
                className={`truncate text-sm ${
                  unread ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {e.subject || '(no subject)'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
