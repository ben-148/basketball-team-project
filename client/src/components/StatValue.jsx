export default function StatValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="stat-na">N/A</span>;
  }
  return value;
}
