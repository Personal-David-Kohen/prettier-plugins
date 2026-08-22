// --- Types ---

interface Segment {
  text: string;
  separator: string; // "," or ";" or ""
}

interface ClassifiedSegment extends Segment {
  sortLength: number;
  isSubObject: boolean;
  isSafe: boolean;
  isEmpty: boolean;
  isFlat: boolean;
}

// --- String skipping utility ---

function skipString(source: string, i: number): number {
  const quote = source[i];
  i++;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (quote === "`" && source[i] === "$" && source[i + 1] === "{") {
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        else if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
          i = skipString(source, i);
          continue;
        }
        if (depth > 0) i++;
      }
      if (depth === 0) i++;
      continue;
    }
    if (source[i] === quote) return i + 1;
    i++;
  }
  return i;
}

// --- Brace matching ---

function findMatchingBrace(text: string, startIdx: number): number {
  let depth = 0;
  let i = startIdx;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(text, i);
      continue;
    }

    if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }

    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }

    i++;
  }

  return -1;
}

// --- Segment splitting (the core fix: tracks ALL bracket types) ---

function splitByTopLevelSeparators(body: string): Segment[] {
  const segments: Segment[] = [];
  let current = "";
  let depth = 0;
  let i = 0;

  while (i < body.length) {
    const ch = body[i];

    // Handle strings (including template literals with ${} expressions)
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(body, i);
      current += body.substring(i, end);
      i = end;
      continue;
    }

    // Handle line comments
    if (ch === "/" && body[i + 1] === "/") {
      const nl = body.indexOf("\n", i);
      if (nl === -1) {
        current += body.substring(i);
        i = body.length;
      } else {
        current += body.substring(i, nl);
        i = nl;
      }
      continue;
    }

    // Handle block comments
    if (ch === "/" && body[i + 1] === "*") {
      const end = body.indexOf("*/", i + 2);
      if (end === -1) {
        current += body.substring(i);
        i = body.length;
      } else {
        current += body.substring(i, end + 2);
        i = end + 2;
      }
      continue;
    }

    // Track depth for ALL bracket types: {}, (), []
    if (ch === "{" || ch === "(" || ch === "[") {
      depth++;
      current += ch;
      i++;
      continue;
    }
    if (ch === "}" || ch === ")" || ch === "]") {
      depth--;
      current += ch;
      i++;
      continue;
    }

    // Separator at depth 0
    if (depth === 0 && (ch === "," || ch === ";")) {
      segments.push({ text: current, separator: ch });
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.length > 0) {
    segments.push({ text: current, separator: "" });
  }

  return segments;
}

// --- Segment classification ---

function getFirstMeaningfulLine(text: string): string | null {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*")
    )
      continue;
    return line;
  }
  return null;
}

function findValueColon(trimmedLine: string): number {
  let inString: string | null = null;
  let depth = 0;

  for (let i = 0; i < trimmedLine.length; i++) {
    const ch = trimmedLine[i];

    if (inString) {
      if (ch === inString && trimmedLine[i - 1] !== "\\") inString = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "[") {
      depth++;
      continue;
    }
    if (ch === "]") {
      depth--;
      continue;
    }

    if (ch === ":" && depth === 0) return i;
  }

  return -1;
}

function classifySegment(segment: Segment): ClassifiedSegment {
  const line = getFirstMeaningfulLine(segment.text);

  if (!line) {
    return {
      ...segment,
      sortLength: 0,
      isSubObject: false,
      isSafe: false,
      isEmpty: true,
      isFlat: true,
    };
  }

  const trimmed = line.trim();
  const codeLines = segment.text
    .split("\n")
    .map((value) => value.trim())
    .filter(
      (value) =>
        value &&
        !value.startsWith("//") &&
        !value.startsWith("/*") &&
        value !== "*",
    );

  // Check unsafe patterns
  let isSafe = true;

  // Spread
  if (trimmed.startsWith("...")) isSafe = false;

  // Computed key
  if (trimmed.startsWith("[")) isSafe = false;

  // Getter/setter
  if (/^(get|set)\s+[\w$]+\s*\(/.test(trimmed)) isSafe = false;

  // Method shorthand: identifier followed by ( without : before it
  if (/^(async\s+)?[\w$]+\s*(<[^>]*>)?\s*\(/.test(trimmed)) {
    const parenIdx = trimmed.search(/\(/);
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1 || colonIdx > parenIdx) isSafe = false;
  }

  // Check for sub-object value
  let isSubObject = false;
  let isFlat = codeLines.length <= 1;
  const colonIdx = findValueColon(trimmed);
  if (colonIdx !== -1) {
    const afterColon = trimmed.slice(colonIdx + 1).trim();
    if (afterColon.startsWith("{") || afterColon.startsWith("[")) {
      isFlat = false;
    }
    if (afterColon.startsWith("{")) {
      // Verify it's actually a multi-line block
      const nonEmptyLines = segment.text
        .split("\n")
        .filter((l) => l.trim() !== "");
      if (nonEmptyLines.length > 1) isSubObject = true;
    }
  }

  return {
    ...segment,
    sortLength: line.length,
    isSubObject,
    isSafe,
    isEmpty: false,
    isFlat,
  };
}

// --- Sorting ---

function sortClassifiedSegments(
  segments: ClassifiedSegment[],
): ClassifiedSegment[] {
  const result = [...segments];

  // Find groups of consecutive safe entries (unsafe entries act as barriers)
  let groupStart = -1;

  const sortGroup = (start: number, end: number) => {
    const positions: number[] = [];
    const regular: ClassifiedSegment[] = [];
    const subObj: ClassifiedSegment[] = [];

    for (let i = start; i < end; i++) {
      const s = result[i];
      if (!s.isSafe || s.isEmpty) continue;
      positions.push(i);
      if (s.isSubObject) {
        subObj.push(s);
      } else {
        regular.push(s);
      }
    }

    if (positions.length <= 1) return;

    regular.sort((a, b) => a.sortLength - b.sortLength);
    subObj.sort((a, b) => a.sortLength - b.sortLength);

    const sorted = [...regular, ...subObj];
    positions.forEach((pos, idx) => {
      result[pos] = sorted[idx];
    });
  };

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const isBarrier = !s.isSafe && !s.isEmpty;

    if (isBarrier) {
      if (groupStart >= 0) {
        sortGroup(groupStart, i);
        groupStart = -1;
      }
    } else if (s.isSafe && !s.isEmpty) {
      if (groupStart < 0) groupStart = i;
    }
  }

  // Sort the final group
  if (groupStart >= 0) {
    sortGroup(groupStart, segments.length);
  }

  return result;
}

// --- Object body processing ---

function processObjectBody(body: string): string {
  const segments = splitByTopLevelSeparators(body);

  const nonEmpty = segments.filter((s) => s.text.trim() !== "");
  if (nonEmpty.length <= 1) return body;

  const classified = segments.map(classifySegment);
  const hasNonFlatSegment = classified.some(
    (segment) => !segment.isEmpty && !segment.isFlat,
  );
  if (hasNonFlatSegment) return body;
  const sorted = sortClassifiedSegments(classified);

  // Check if anything changed
  let changed = false;
  for (let i = 0; i < classified.length; i++) {
    if (sorted[i].text !== classified[i].text) {
      changed = true;
      break;
    }
  }
  if (!changed) return body;

  // Reconstruct: sorted texts with original position separators
  let result = "";
  for (let i = 0; i < sorted.length; i++) {
    result += sorted[i].text;
    result += segments[i].separator;
  }
  return result;
}

// --- Finding object bodies in source ---

const OBJECT_LIKE_PATTERNS = [
  // Object literal: = { or : { or , { or ( {
  /(?:=|:|,|\()\s*\{/g,
  // Interface/type body
  /(?:interface|type)\s+\w+(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?\{/g,
  // Destructuring: const/let/var {
  /(?:const|let|var)\s+\{/g,
  // return { or default {
  /(?:return|default)\s+\{/g,
];

const DISABLE_COMMENT =
  /\/\/\s*@disable-pyramid|\/\*\s*@disable-pyramid\s*\*\//;

/**
 * Check if there is a @disable-pyramid comment on the lines leading up to the opening brace.
 * Scans backwards from the brace position through whitespace and comments.
 */
function hasDisableComment(source: string, braceIdx: number): boolean {
  // Look at the text from the start of the line containing the opening pattern
  // back through any preceding comment lines
  let pos = braceIdx - 1;

  // Walk backwards to the start of the current line
  while (pos >= 0 && source[pos] !== "\n") pos--;
  const currentLine = source.slice(pos + 1, braceIdx).trim();

  // Check current line (e.g., `// @disable-pyramid\nconst x = {`)
  // We need to look at preceding lines too
  let searchStart = pos; // at the \n before the brace's line

  // Walk backwards through blank lines and comment lines
  for (let attempt = 0; attempt < 5; attempt++) {
    if (searchStart < 0) break;

    // Find start of previous line
    let lineStart = searchStart;
    while (lineStart > 0 && source[lineStart - 1] !== "\n") lineStart--;

    const line = source.slice(lineStart, searchStart + 1).trim();

    if (line === "") {
      // blank line — keep looking
      searchStart = lineStart - 1;
      continue;
    }

    if (DISABLE_COMMENT.test(line)) return true;

    // Stop at non-blank, non-disable-comment line
    break;
  }

  return false;
}

function findAllObjectBodies(
  source: string,
): Array<{ start: number; end: number }> {
  const results: Array<{ start: number; end: number }> = [];
  const seen = new Set<number>();
  const disabled = new Set<number>(); // braces with @disable-pyramid

  for (const pattern of OBJECT_LIKE_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(source)) !== null) {
      const braceIdx = source.indexOf("{", match.index + match[0].length - 1);
      if (braceIdx === -1 || seen.has(braceIdx)) continue;
      seen.add(braceIdx);

      const closeIdx = findMatchingBrace(source, braceIdx);
      if (closeIdx === -1) continue;

      // Check for @disable-pyramid comment above this object
      if (hasDisableComment(source, match.index)) {
        disabled.add(braceIdx);
        continue;
      }

      const body = source.slice(braceIdx + 1, closeIdx);
      if (body.includes("\n") && body.trim().length > 0) {
        results.push({ start: braceIdx, end: closeIdx });
      }
    }
  }

  // Also remove any results whose range is inside a disabled object
  const finalResults = results.filter((r) => {
    return (
      !disabled.has(r.start) &&
      ![...disabled].some((disabledBrace) => {
        const disabledClose = findMatchingBrace(source, disabledBrace);
        return (
          disabledClose !== -1 &&
          r.start > disabledBrace &&
          r.end < disabledClose
        );
      })
    );
  });

  // Sort descending by start position
  finalResults.sort((a, b) => b.start - a.start);

  return finalResults;
}

// --- Main entry point ---

export function sortObjectKeys(source: string): string {
  const bodies = findAllObjectBodies(source).sort(
    (a, b) => a.end - a.start - (b.end - b.start),
  );
  return bodies.reduce((result, { start, end }) => {
    const body = result.slice(start + 1, end);
    const processed = processObjectBody(body);
    return processed === body
      ? result
      : result.slice(0, start + 1) + processed + result.slice(end);
  }, source);
}
