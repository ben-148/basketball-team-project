function isPlausible(day, month) {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function toIsoDate(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Extracts a session date from a PDF filename like "סטטיסטיקה_18_05_26.pdf", "18.05.26.pdf",
// or "19_1_25.pdf" — day/month can be one or two digits, separated consistently by "." or "_".
//
// Returns:
//   { date: 'YYYY-MM-DD', day, month, year } — full day/month/year found (2-digit year assumed 2000+YY)
//   { date: null, day, month, year: null }    — only day/month found (e.g. "15.12", "15.12.pdf")
//   null                                       — no plausible date pattern found
export function parseDateFromFilename(filename) {
  const fullMatch = filename.match(/(\d{1,2})[._](\d{1,2})[._](\d{2}|\d{4})/);
  if (fullMatch) {
    const day = Number(fullMatch[1]);
    const month = Number(fullMatch[2]);
    let year = Number(fullMatch[3]);
    if (year < 100) year += 2000;
    if (isPlausible(day, month)) {
      return { date: toIsoDate(year, month, day), day, month, year };
    }
  }

  const partialMatch = filename.match(/(\d{1,2})[._](\d{1,2})(?!\d)/);
  if (partialMatch) {
    const day = Number(partialMatch[1]);
    const month = Number(partialMatch[2]);
    if (isPlausible(day, month)) {
      return { date: null, day, month, year: null };
    }
  }

  return null;
}
