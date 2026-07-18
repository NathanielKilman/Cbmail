import { useEffect, useState } from 'react';

const INBOXES = ['business', 'mechanical', 'code', 'general'];

// This is a functional stub to confirm the API wiring works end to end.
// The real inbox UI/design is a separate pass.
export default function App() {
  const [inbox, setInbox] = useState('business');
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    fetch(`/api/emails?inbox=${inbox}`)
      .then((r) => r.json())
      .then(setEmails)
      .catch(() => setEmails([]));
  }, [inbox]);

  return (
    <div className="p-6 font-sans">
      <div className="flex gap-2 mb-4">
        {INBOXES.map((i) => (
          <button
            key={i}
            onClick={() => setInbox(i)}
            className={`px-3 py-1 rounded ${i === inbox ? 'bg-black text-white' : 'bg-gray-200'}`}
          >
            {i}
          </button>
        ))}
      </div>
      <ul>
        {emails.map((e) => (
          <li key={e.id} className="border-b py-2">
            <div className="font-semibold">{e.subject}</div>
            <div className="text-sm text-gray-500">{e.from_address}</div>
          </li>
        ))}
        {emails.length === 0 && <li className="text-gray-400">No emails yet.</li>}
      </ul>
    </div>
  );
}
