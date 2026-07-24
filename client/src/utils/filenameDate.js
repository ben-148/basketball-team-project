// Extracts a session date from a PDF filename like "סטטיסטיקה_18_05_26.pdf", "18.05.26.pdf",
// or "19_1_25.pdf" — day/month can be one or two digits, separated consistently by "." or "_",
// with a 2- or 4-digit year. A 2-digit year is assumed to be 2000+YY. Returns "YYYY-MM-DD" for
// use as an <input type="date"> value, or null if no plausible date pattern is found.
export function parseDateFromFilename(filename) {
  const match = filename.match(/(\d{1,2})[._](\d{1,2})[._](\d{2}|\d{4})/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
