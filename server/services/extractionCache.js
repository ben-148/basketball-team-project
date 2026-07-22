import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'data', 'extraction-cache.json');

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeCache(cache) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
}

export async function getCachedExtraction(key) {
  const cache = await readCache();
  return cache[key] || null;
}

export async function setCachedExtraction(key, result) {
  const cache = await readCache();
  cache[key] = { ...result, cachedAt: new Date().toISOString() };
  await writeCache(cache);
}
