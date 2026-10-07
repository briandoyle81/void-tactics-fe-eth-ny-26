import { HIGHLIGHT_TERMS, type HighlightTerm } from "../data/dialog/highlightTerms";

/** A run of text, either plain or a highlighted term with its classes. */
export interface HighlightSegment {
  text: string;
  className?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface CompiledTerm {
  form: string;
  className: string;
  caseSensitive: boolean;
}

function compile(terms: readonly HighlightTerm[]): { regex: RegExp | null; lookup: CompiledTerm[] } {
  // Longest forms first so "outer dust belts" wins over "dust belts".
  const lookup = terms
    .flatMap((t) =>
      t.match.map((form) => ({ form, className: t.className, caseSensitive: t.caseSensitive ?? false })),
    )
    .sort((a, b) => b.form.length - a.form.length);
  if (lookup.length === 0) return { regex: null, lookup };
  // One case-insensitive scan; case-sensitive terms are re-checked per match.
  const pattern = lookup.map((t) => escapeRegExp(t.form)).join("|");
  return { regex: new RegExp(`(?<![\\w'])(${pattern})(?![\\w])`, "gi"), lookup };
}

const DEFAULT_COMPILED = compile(HIGHLIGHT_TERMS);

/**
 * Splits dialog text into plain and highlighted segments using the shared
 * highlight vocabulary (app/data/dialog/highlightTerms.ts). Whole words only;
 * case-sensitive terms (names) only match their exact casing. Pure — callers
 * render the segments (see HighlightedText).
 */
export function splitHighlights(
  text: string,
  terms?: readonly HighlightTerm[],
): HighlightSegment[] {
  const { regex, lookup } = terms ? compile(terms) : DEFAULT_COMPILED;
  if (!regex || !text) return [{ text }];
  const segments: HighlightSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(regex)) {
    const found = m[0];
    const term = lookup.find((t) =>
      t.caseSensitive ? t.form === found : t.form.toLowerCase() === found.toLowerCase(),
    );
    if (!term) continue; // a case-sensitive form matched with the wrong casing
    const start = m.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: found, className: term.className });
    last = start + found.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
