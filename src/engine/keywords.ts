import keywordData from '../data/keywords.json';
import { KEYWORDS, VALUED_KEYWORDS, type Keyword, type KeywordValues } from './types';

export interface KeywordInfo {
  id: string;
  name: string;
  valued: boolean;
  icon: string;
  description: string;
}

/** Display data for keywords, statuses and triggers (names, tooltips, icons). */
export const KEYWORD_INFO: readonly KeywordInfo[] = keywordData.keywords;
export const STATUS_INFO = keywordData.statuses;
export const TRIGGER_INFO = keywordData.triggers;

export function isKeyword(value: string): value is Keyword {
  return (KEYWORDS as readonly string[]).includes(value);
}

/**
 * Parses one keyword entry: "rush" → ["rush", 1], "poison:2" → ["poison", 2].
 * Returns null when the entry is malformed.
 */
export function parseKeyword(entry: string): [Keyword, number] | null {
  const [name, raw] = entry.split(':');
  if (!name || !isKeyword(name)) return null;
  const valued = VALUED_KEYWORDS.includes(name);
  if (raw === undefined) return valued ? null : [name, 1];
  if (!valued) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return null;
  return [name, value];
}

/** Adds a list of keyword entries into `into`; valued keywords stack. */
export function addKeywords(into: KeywordValues, entries: readonly string[]): KeywordValues {
  for (const entry of entries) {
    const parsed = parseKeyword(entry);
    if (!parsed) continue;
    const [k, v] = parsed;
    into[k] = VALUED_KEYWORDS.includes(k) ? (into[k] ?? 0) + v : 1;
  }
  return into;
}

/** Human-readable form: "Poison 2", "Rush". */
export function formatKeyword(entry: string): string {
  const parsed = parseKeyword(entry);
  if (!parsed) return entry;
  const info = KEYWORD_INFO.find((k) => k.id === parsed[0]);
  const name = info?.name ?? parsed[0];
  return VALUED_KEYWORDS.includes(parsed[0]) ? `${name} ${parsed[1]}` : name;
}

/** Keyword data must agree with the engine's keyword list. */
export function validateKeywordData(): string[] {
  const ids = KEYWORD_INFO.map((k) => k.id);
  const errors: string[] = [];
  for (const k of KEYWORDS) if (!ids.includes(k)) errors.push(`keywords.json is missing "${k}"`);
  for (const id of ids) if (!isKeyword(id)) errors.push(`keywords.json has unknown keyword "${id}"`);
  for (const k of KEYWORD_INFO) {
    if (k.valued !== VALUED_KEYWORDS.includes(k.id as Keyword))
      errors.push(`keywords.json: "${k.id}" valued flag is wrong`);
  }
  return errors;
}
