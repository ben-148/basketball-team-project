import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALIASES_PATH = path.join(__dirname, '..', 'data', 'aliases.json');

export async function readAliases() {
  const raw = await fs.readFile(ALIASES_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeAliases(aliases) {
  await fs.writeFile(ALIASES_PATH, JSON.stringify(aliases, null, 2) + '\n', 'utf-8');
}

export async function addAlias(alias, playerId) {
  const aliases = await readAliases();
  const entry = { id: crypto.randomUUID(), alias, playerId };
  aliases.push(entry);
  await writeAliases(aliases);
  return entry;
}

export async function removeAlias(id) {
  const aliases = await readAliases();
  const next = aliases.filter((a) => a.id !== id);
  const removed = next.length !== aliases.length;
  await writeAliases(next);
  return removed;
}
