import { Trash2, RotateCcw, X } from 'lucide-react';

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

function daysLeft(deletedAt) {
  const purgeAt = new Date(deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(remaining, 0);
}

export default function EmailList({
  emails,
  loading,
  selectedId,
  onSelect,
  sent,
  isTrash,
  onDelete,
  onRestore,
  onDeleteForever,
}) {
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
        {isTrash ? 'Trash is empty.' : 'No emails in this inbox yet.'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((e) => {
        const active = e.id === selectedId;
        const unread = !e.is_read;
        return (
          <div
            key={e.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(e.id)}
            onKeyDown={(ev) => ev.key === 'Enter' && onSelect(e.id)}
            className={`w-full text-left px-4 py-3 border-b flex items-start gap-3 transition-colors cursor-pointer group ${
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
                  {sent || isTrash ? `To: ${e.to_address}` : e.from_address}
                </span>
                <span className="text-xs text-[var(--text-faint)] shrink-0">
                  {isTrash ? `${daysLeft(e.deleted_at)}d left` : timeAgo(e.received_at)}
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

            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isTrash ? (
                <>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onRestore(e.id);
                    }}
                    title="Restore"
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-strong)] hover:bg-[var(--bg-card)]"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (confirm('Delete this email forever? This cannot be undone.')) {
                        onDeleteForever(e.id);
                      }
                    }}
                    title="Delete forever"
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-card)]"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onDelete(e.id);
                  }}
                  title="Delete"
                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-card)]"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
