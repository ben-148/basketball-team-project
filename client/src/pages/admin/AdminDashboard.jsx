import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/admin/players",
    icon: "⛹️‍♂️",
    title: "ניהול שחקנים",
    subtitle: "נהל שחקנים, תמונות וביוגרפיות",
  },
  {
    to: "/admin/sessions",
    icon: "📅",
    title: "ניהול סשנים",
    subtitle: "נהל סשנים, משחקונים וייבוא נתונים מ-PDF",
  },
  {
    to: "/admin/videos",
    icon: "🎥",
    title: "וידאו",
    subtitle: "נהל סרטוני שחקנים",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="section-title">לוח בקרה</h1>
      <div className="admin-dashboard-grid">
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="admin-dashboard-card">
            <span className="admin-dashboard-card-icon">{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
