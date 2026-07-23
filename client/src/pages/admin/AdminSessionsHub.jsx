import { useState } from 'react';
import AdminBackLink from '../../components/AdminBackLink.jsx';
import AdminSessions from './AdminSessions.jsx';
import AdminImport from './AdminImport.jsx';

const TABS = [
  { key: 'sessions', label: 'סשנים' },
  { key: 'import', label: 'ייבוא מ-PDF' },
];

export default function AdminSessionsHub() {
  const [tab, setTab] = useState('sessions');

  return (
    <div>
      <AdminBackLink />
      <h1 className="section-title">ניהול סשנים</h1>
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="admin-content">{tab === 'sessions' ? <AdminSessions /> : <AdminImport />}</div>
    </div>
  );
}
