import { Wrench, Code2, Briefcase, Inbox as InboxIcon, PenSquare, Send, Trash2 } from 'lucide-react';

const INBOXES = [
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'mechanical', label: 'Mechanical', icon: Wrench },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'general', label: 'General', icon: InboxIcon },
];

export default function Sidebar({ activeInbox, onSelectInbox, unreadCounts, onCompose, mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-[var(--nav-bg)] border-r flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="h-16 flex items-center px-5 shrink-0">
          <span className="font-display font-black tracking-tight text-lg text-[var(--text)]">
            CB<span className="text-[var(--accent-strong)]">MAIL</span>
          </span>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent)] text-[#08130e] font-semibold text-sm hover:bg-[var(--accent-strong)] transition-colors"
          >
            <PenSquare size={16} />
            Compose
          </button>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1">
          <span className="label-mono px-3 mb-1">Inboxes</span>
          {INBOXES.map(({ id, label, icon: Icon }) => {
            const active = activeInbox === id;
            const count = unreadCounts[id] || 0;
            return (
              <button
                key={id}
                onClick={() => onSelectInbox(id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-[11px] font-bold transition-colors ${
                  active
                    ? 'text-[var(--accent-strong)] bg-[var(--accent-soft)]'
                    : 'text-[var(--text)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{label.toUpperCase()}</span>
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <span className="label-mono px-3 mt-3 mb-1">History</span>
          <button
            onClick={() => onSelectInbox('sent')}
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-[11px] font-bold transition-colors ${
              activeInbox === 'sent'
                ? 'text-[var(--accent-strong)] bg-[var(--accent-soft)]'
                : 'text-[var(--text)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Send size={15} />
            <span className="flex-1 text-left">SENT</span>
          </button>

          <button
            onClick={() => onSelectInbox('trash')}
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-[11px] font-bold transition-colors ${
              activeInbox === 'trash'
                ? 'text-[var(--accent-strong)] bg-[var(--accent-soft)]'
                : 'text-[var(--text)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Trash2 size={15} />
            <span className="flex-1 text-left">TRASH</span>
          </button>
        </nav>

        <div className="p-4 label-mono">CyBearBots #7504</div>
      </aside>
    </>
  );
}
