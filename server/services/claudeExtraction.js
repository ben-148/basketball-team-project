import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getCachedExtraction, setCachedExtraction } from './extractionCache.js';

const SYSTEM_PROMPT = `You are a data extraction assistant for a basketball statistics app.
Extract player statistics from the PDF table and return ONLY a JSON object, no other text.

The table columns are: נקודות (points), ריבאונד (rebounds), אסיסט (assists), חטיפות (steals), איבודים (turnovers), נצחונות (wins).

Rules:
- A smiley face (:) or similar symbol means 0
- Some numbers may appear on separate lines due to PDF formatting — use the visual position to assign them to the correct player and column
- If one or more of the six stat columns above does not appear anywhere in the PDF table at all, list their English field names (points, rebounds, assists, steals, turnovers, wins) in "missingColumns". A column that appears but is empty for some players is NOT missing — only list a column here if the whole column is absent from the table. For any field listed in "missingColumns", still include the key in every player's object using 0 as a placeholder value — it will be ignored.
- Do not include any explanation, preamble, or commentary — the response body must be the JSON object and nothing else.
- Return this exact format:
{
  "rows": [
    { "nameInFile": "שם כפי שמופיע בקובץ", "points": 0, "rebounds": 0, "assists": 0, "steals": 0, "turnovers": 0, "wins": 0 },
    ...
  ],
  "missingColumns": []
}`;

const STAT_KEYS = ['points', 'rebounds', 'assists', 'steals', 'turnovers', 'wins'];

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured on the server');
    }
    client = new Anthropic();
  }
  return client;
}

// Pulls the JSON payload out of Claude's text response, tolerating markdown code fences and/or
// stray prose before or after the JSON object (despite the system prompt asking for neither).
function extractJsonPayload(text) {
  let cleaned = text.trim();

  // Strip a leading/trailing markdown code fence, e.g. ```json ... ``` or ``` ... ```
  cleaned = cleaned
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Whatever remains, isolate the outermost {...} object in case Claude added commentary
  // outside the fence (or no fence at all).
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function cacheKeyFor(pdfBuffer) {
  return crypto.createHash('sha256').update(pdfBuffer).update(SYSTEM_PROMPT).digest('hex');
}

export async function extractStatsFromPdf(pdfBuffer) {
  const cacheKey = cacheKeyFor(pdfBuffer);
  const cached = await getCachedExtraction(cacheKey);
  if (cached) {
    console.log('[pdf-import] cache hit — skipping Claude API call, key:', cacheKey);
    return { rows: cached.rows, missingColumns: cached.missingColumns };
  }

  const base64Pdf = pdfBuffer.toString('base64');

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
          },
          { type: 'text', text: 'Extract player statistics from this PDF table.' },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');

  console.log('[pdf-import] stop_reason:', response.stop_reason);
  console.log('[pdf-import] raw Claude response text:\n' + (textBlock ? textBlock.text : '(no text block)'));

  if (!textBlock) {
    throw new Error('Claude did not return a text response');
  }

  if (response.stop_reason === 'max_tokens') {
    throw new Error('The extraction response was cut off (too much data) — try a smaller or split PDF');
  }

  const jsonText = extractJsonPayload(textBlock.text);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error('[pdf-import] JSON.parse failed on cleaned text:\n' + jsonText);
    console.error('[pdf-import] parse error:', err.message);
    throw new Error('Failed to parse the extracted data as JSON');
  }

  if (!parsed || !Array.isArray(parsed.rows)) {
    console.error('[pdf-import] parsed JSON is missing a "rows" array:', JSON.stringify(parsed));
    throw new Error('Extracted data was missing a "rows" array');
  }

  const missingColumns = Array.isArray(parsed.missingColumns)
    ? parsed.missingColumns.filter((f) => STAT_KEYS.includes(f))
    : [];
  const missingSet = new Set(missingColumns);

  const rows = parsed.rows.map((row) => {
    const clean = { nameInFile: String(row.nameInFile ?? '').trim() };
    for (const key of STAT_KEYS) {
      if (missingSet.has(key)) {
        clean[key] = null;
        continue;
      }
      const value = Number(row[key]);
      clean[key] = Number.isFinite(value) && value >= 0 ? value : 0;
    }
    return clean;
  });

  await setCachedExtraction(cacheKey, { rows, missingColumns });

  return { rows, missingColumns };
}
