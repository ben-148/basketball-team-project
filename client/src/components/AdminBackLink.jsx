import { Link } from 'react-router-dom';

export default function AdminBackLink() {
  return (
    <Link to="/admin" className="back-link">
      ← חזרה לדשבורד
    </Link>
  );
}
