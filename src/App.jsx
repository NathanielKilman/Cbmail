import { useEffect, useState, useCallback } from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import EmailList from './components/EmailList.jsx';
import EmailDetail from './components/EmailDetail.jsx';
import ComposeModal from './components/ComposeModal.jsx';
import { fetchEmails, fetchEmail, markRead, trashEmail, restoreEmail, deleteEmailForever } from './lib/api.js';

const INBOX_IDS = ['business', 'mechanical', 'code', 'general'];
const SENDERS = ['business@cybearbots.org', 'mechanical@cybearbots.org', 'code@cybearbots.org'];

export default function App() {
  const [activeInbox, setActiveInbox] = useState('general');
  const [emails, setEmails] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [compose, setCompose] = useState(null); // null or { from, to, subject, body, replyToEmailId }

  const loadInbox = useCallback(async (inbox) => {
    setListLoading(true);
    try {
      const data = await fetchEmails(inbox);
      setEmails(data);
    } catch {
      setEmails([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadUnreadCounts = useCallback(async () => {
    const counts = {};
    await Promise.all(
      INBOX_IDS.map(async (id) => {
        try {
          const data = await fetchEmails(id);
          counts[id] = data.filter((e) => !e.is_read).length;
        } catch {
          counts[id] = 0;
        }
      })
    );
    setUnreadCounts(counts);
  }, []);

  useEffect(() => {
    loadInbox(activeInbox);
    setSelectedId(null);
    setSelectedEmail(null);
  }, [activeInbox, loadInbox]);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  async function handleSelectEmail(id) {
    setSelectedId(id);
    setShowDetailOnMobile(true);
    setDetailLoading(true);
    try {
      const email = await fetchEmail(id);
      setSelectedEmail(email);
      if (!email.is_read) {
        await markRead(id, true);
        setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: 1 } : e)));
        loadUnreadCounts();
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function handleReply(email) {
    const isSent = email.direction === 'outbound';
    const from = isSent
      ? email.from_address
      : (SENDERS.includes(email.to_address) ? email.to_address : SENDERS[0]);
    const to = isSent ? email.to_address : email.from_address;

    setCompose({
      from,
      to,
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
      body: '',
      replyToEmailId: email.id,
    });
  }

  function handleCompose() {
    setCompose({ from: SENDERS[0], to: '', subject: '', body: '', replyToEmailId: null });
  }

  function handleSent() {
    setCompose(null);
    loadInbox(activeInbox);
  }

  async function clearSelectionIfSelected(id) {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedEmail(null);
      setShowDetailOnMobile(false);
    }
  }

  async function handleTrash(id) {
    await trashEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    clearSelectionIfSelected(id);
    loadUnreadCounts();
  }

  async function handleRestore(id) {
    await restoreEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    clearSelectionIfSelected(id);
    loadUnreadCounts();
  }

  async function handleDeleteForever(id) {
    await deleteEmailForever(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    clearSelectionIfSelected(id);
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        activeInbox={activeInbox}
        onSelectInbox={(id) => {
          setActiveInbox(id);
          setMobileSidebarOpen(false);
          setShowDetailOnMobile(false);
        }}
        unreadCounts={unreadCounts}
        onCompose={handleCompose}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="h-16 shrink-0 flex items-center gap-3 px-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden text-[var(--text-muted)]"
          >
            <Menu size={20} />
          </button>
          <span className="label-mono">{activeInbox}</span>
          <button
            onClick={() => {
              loadInbox(activeInbox);
              loadUnreadCounts();
            }}
            className="ml-auto text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div
            className={`w-full lg:w-80 shrink-0 border-r flex flex-col ${
              showDetailOnMobile ? 'hidden lg:flex' : 'flex'
            }`}
            style={{ borderColor: 'var(--border)' }}
          >
            <EmailList
              emails={emails}
              loading={listLoading}
              selectedId={selectedId}
              onSelect={handleSelectEmail}
              sent={activeInbox === 'sent'}
              isTrash={activeInbox === 'trash'}
              onDelete={handleTrash}
              onRestore={handleRestore}
              onDeleteForever={handleDeleteForever}
            />
          </div>

          <div className={`flex-1 min-w-0 ${showDetailOnMobile ? 'flex' : 'hidden lg:flex'}`}>
            <EmailDetail
              email={selectedEmail}
              loading={detailLoading}
              onReply={handleReply}
              onBack={() => setShowDetailOnMobile(false)}
              onDelete={activeInbox === 'trash' ? null : handleTrash}
            />
          </div>
        </div>
      </div>

      {compose && (
        <ComposeModal
          initial={compose}
          onClose={() => setCompose(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
