import { useState } from 'react';
import AdminBackLink from '../../components/AdminBackLink.jsx';
import AdminSessions from './AdminSessions.jsx';
import AdminImport from './AdminImport.jsx';
import AdminLegacySessions from './AdminLegacySessions.jsx';

const TABS = [
  { key: 'sessions', label: 'סשנים' },
  { key: 'import', label: 'ייבוא מ-PDF' },
  { key: 'legacy', label: 'סשני עבר (Legacy)' },
];

const TAB_COMPONENTS = {
  sessions: AdminSessions,
  import: AdminImport,
  legacy: AdminLegacySessions,
};

export default function AdminSessionsHub() {
  const [tab, setTab] = useState('sessions');
  const TabComponent = TAB_COMPONENTS[tab];

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
      <div className="admin-content">
        <TabComponent />
      </div>
    </div>
  );
}
