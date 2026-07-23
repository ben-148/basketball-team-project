// One-time migration: downloads each player's Google Drive/Photos-hosted photo and re-hosts it
// locally under server/uploads/players/, then repoints the player's `photo` field at the local
// URL. Google's CDN is flaky for hotlinked images (intermittent ERR_BLOCKED_BY_ORB), so each
// download is retried a few times before giving up on that player.
import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Player from '../models/Player.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'players');

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function isGoogleHosted(url) {
  return typeof url === 'string' && (url.includes('googleusercontent.com') || url.includes('drive.google.com'));
}

async function downloadWithRetry(url, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      const ext = EXTENSION_BY_MIME[contentType.split(';')[0].trim()] || '.jpg';
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, ext };
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastError;
}

async function migrate() {
  await connectDB();
  await fs.mkdir(PHOTOS_DIR, { recursive: true });

  const players = await Player.find({});
  const toMigrate = players.filter((p) => isGoogleHosted(p.photo));

  console.log(`Found ${toMigrate.length} player(s) with Google-hosted photos out of ${players.length} total.\n`);

  const results = [];
  for (const player of toMigrate) {
    const originalUrl = player.photo;
    try {
      const { buffer, ext } = await downloadWithRetry(originalUrl);
      const filename = `${crypto.randomUUID()}${ext}`;
      await fs.writeFile(path.join(PHOTOS_DIR, filename), buffer);
      const localUrl = `/api/uploads/players/${filename}`;
      await Player.updateOne({ _id: player._id }, { $set: { photo: localUrl } });
      results.push({ name: player.name, status: 'ok', from: originalUrl, to: localUrl });
      console.log(`✓ ${player.name}: ${originalUrl} -> ${localUrl}`);
    } catch (err) {
      results.push({ name: player.name, status: 'failed', from: originalUrl, error: err.message });
      console.log(`✗ ${player.name}: FAILED (${err.message}) — left as-is: ${originalUrl}`);
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'failed');
  console.log(`\nDone: ${ok}/${toMigrate.length} migrated.`);
  if (failed.length > 0) {
    console.log(`${failed.length} failed and were left pointing at their original Google URL:`);
    for (const f of failed) console.log(`  - ${f.name}: ${f.from}`);
  }

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
