import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/date.js';
import { STAT_FIELDS } from '../../constants.js';
import { toastSuccess, toastError, toastWarning, toastConfirm } from '../../utils/toast.jsx';
import { parseDateFromFilename } from '../../utils/filenameDate.js';

function statusClass(matchType) {
  if (matchType === 'none') return 'row-status-none';
  if (matchType === 'alias') return 'row-status-alias';
  return 'row-status-exact';
}

export default function AdminImport() {
  const [players, setPlayers] = useState([]);

  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [date, setDate] = useState('');
  const [dateWarning, setDateWarning] = useState(false);
  const [dateAutoDetected, setDateAutoDetected] = useState(false);
  const [importing, setImporting] = useState(false);
  const [successSummary, setSuccessSummary] = useState(null);
  const [error, setError] = useState('');

  const [aliases, setAliases] = useState([]);
  const [newAliasText, setNewAliasText] = useState('');
  const [newAliasPlayerId, setNewAliasPlayerId] = useState('');

  useEffect(() => {
    api.players.list().then(setPlayers).catch((err) => setError(err.message));
    loadAliases();
  }, []);

  function loadAliases() {
    api.import.listAliases().then(setAliases).catch(() => {});
  }

  async function handleExtract() {
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const result = await api.import.extract(file);
      const extractedRows = result.rows.map((r) => ({ ...r, draftName: r.nameInFile }));
      setRows(extractedRows);
      setMissingColumns(result.missingColumns || []);
      setStep('review');
      const unmatchedCount = extractedRows.filter((r) => !r.playerId).length;
      if (unmatchedCount > 0) {
        toastWarning(`${unmatchedCount} player${unmatchedCount > 1 ? 's' : ''} could not be matched — review before importing`);
      }

      const detectedDate = parseDateFromFilename(file.name);
      if (detectedDate) {
        setDate(detectedDate);
        setDateAutoDetected(true);
        await checkDateDuplicate(detectedDate);
      }
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function checkDateDuplicate(value) {
    try {
      const result = await api.import.checkDate(value);
      setDateWarning(result.exists);
      if (result.exists) {
        toastWarning('A game already exists for this date');
      }
    } catch {
      setDateWarning(false);
    }
  }

  function updateRowField(index, field, value) {
    const num = Math.max(0, Number(value) || 0);
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: num } : r)));
  }

  function updateRowPlayer(index, playerId) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, playerId: playerId || null, matchType: playerId ? 'confirmed' : 'none' } : r))
    );
  }

  function updateDraftName(index, value) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, draftName: value } : r)));
  }

  async function handleCreateNewPlayer(index) {
    const name = (rows[index].draftName || '').trim();
    if (!name) {
      setError('נא להזין שם לשחקן החדש');
      return;
    }
    setError('');
    try {
      const newPlayer = await api.players.create({ name });
      setPlayers((prev) => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, playerId: newPlayer._id, matchType: 'confirmed' } : r))
      );
      toastSuccess(`Player "${newPlayer.name}" created`);
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDateChange(e) {
    const value = e.target.value;
    setDate(value);
    setDateAutoDetected(false);
    if (!value) {
      setDateWarning(false);
      return;
    }
    await checkDateDuplicate(value);
  }

  async function handleConfirm() {
    if (!date) {
      setError('נא לבחור תאריך');
      return;
    }
    if (dateWarning) {
      setError('כבר קיים משחק בתאריך זה במערכת');
      return;
    }
    setError('');
    setImporting(true);
    try {
      const result = await api.import.confirm(date, rows);
      setSuccessSummary(result);
      setStep('success');
      toastSuccess('Import completed');
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function resetImport() {
    setStep('upload');
    setFile(null);
    setRows([]);
    setMissingColumns([]);
    setDate('');
    setDateWarning(false);
    setDateAutoDetected(false);
    setSuccessSummary(null);
    setError('');
  }

  async function handleAddAlias(e) {
    e.preventDefault();
    if (!newAliasText.trim() || !newAliasPlayerId) return;
    try {
      await api.import.addAlias(newAliasText.trim(), newAliasPlayerId);
      setNewAliasText('');
      setNewAliasPlayerId('');
      loadAliases();
      toastSuccess('כינוי נוסף בהצלחה');
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleRemoveAlias(id) {
    const confirmed = await toastConfirm('למחוק כינוי זה?');
    if (!confirmed) return;
    try {
      await api.import.removeAlias(id);
      loadAliases();
      toastSuccess('כינוי נמחק');
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <h2>ייבוא נתונים מ-PDF</h2>

      {step === 'upload' && (
        <div className="form">
          <label>
            קובץ PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" disabled={!file || extracting} onClick={handleExtract}>
              {extracting ? 'מחלץ נתונים...' : 'העלה וחלץ נתונים'}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <div className="import-date-row">
            <label className="game-select">
              תאריך המשחק *
              <input type="date" value={date} onChange={handleDateChange} required />
            </label>
            {dateAutoDetected && !dateWarning && (
              <p className="import-date-detected-note">📅 תאריך זוהה משם הקובץ</p>
            )}
            {dateWarning && <p className="error-text">⚠️ כבר קיים משחק בתאריך זה במערכת</p>}
          </div>

          {missingColumns.length > 0 && (
            <p className="missing-columns-note">
              ⚠️ העמודות הבאות לא נמצאו בקובץ ויסומנו כ-N/A:{' '}
              {missingColumns.map((f) => STAT_FIELDS.find(([key]) => key === f)?.[1] || f).join(', ')}
            </p>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>שם בקובץ</th>
                  <th>שחקן</th>
                  {STAT_FIELDS.map(([field, label]) => (
                    <th key={field}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={statusClass(row.matchType)}>
                    <td>{row.nameInFile}</td>
                    <td>
                      {row.playerId ? (
                        <select value={row.playerId} onChange={(e) => updateRowPlayer(index, e.target.value)}>
                          <option value="">לא זוהה - דלג</option>
                          {players.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="unmatched-row-actions">
                          <select value="" onChange={(e) => updateRowPlayer(index, e.target.value)}>
                            <option value="">שייך לשחקן קיים</option>
                            {players.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <div className="new-player-inline">
                            <input
                              type="text"
                              value={row.draftName}
                              onChange={(e) => updateDraftName(index, e.target.value)}
                              placeholder="שם שחקן חדש"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleCreateNewPlayer(index)}
                            >
                              צור שחקן חדש ✓
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    {STAT_FIELDS.map(([field]) =>
                      missingColumns.includes(field) ? (
                        <td key={field}>
                          <span className="stat-na">N/A</span>
                        </td>
                      ) : (
                        <td key={field}>
                          <input
                            type="number"
                            min="0"
                            className="import-stat-input"
                            value={row[field]}
                            onChange={(e) => updateRowField(index, field, e.target.value)}
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={resetImport}>
              בטל
            </button>
            <button type="button" className="btn btn-primary" disabled={importing || dateWarning} onClick={handleConfirm}>
              {importing ? 'מייבא...' : 'ייבא נתונים ✓'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && successSummary && (
        <div className="finished-banner">
          <p>
            יובאו נתונים עבור {successSummary.imported} שחקנים לתאריך {formatDate(successSummary.date)}
          </p>
          {successSummary.skipped.length > 0 && (
            <p>שחקנים שדולגו (לא זוהו): {successSummary.skipped.join(', ')}</p>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={resetImport}>
              ייבוא נוסף
            </button>
          </div>
        </div>
      )}

      <section className="alias-management">
        <h2 className="section-title">ניהול כינויים</h2>
        <form className="alias-add-form" onSubmit={handleAddAlias}>
          <input
            type="text"
            placeholder="כינוי חדש"
            value={newAliasText}
            onChange={(e) => setNewAliasText(e.target.value)}
          />
          <select value={newAliasPlayerId} onChange={(e) => setNewAliasPlayerId(e.target.value)}>
            <option value="">בחר שחקן</option>
            {players.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm btn-primary">
            הוסף
          </button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>כינוי</th>
                <th>שחקן</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <tr key={a.id}>
                  <td>{a.alias}</td>
                  <td>{a.player ? a.player.name : '—'}</td>
                  <td className="table-actions">
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveAlias(a.id)}>
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
