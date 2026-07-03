interface Member {
  text: string;
  separator: string;
  order: number;
}

function skipQuoted(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "\\") i += 2;
    else if (source[i] === quote) return i + 1;
    else i++;
  }
  return i;
}

function codePositions(source: string): Uint8Array {
  const positions = new Uint8Array(source.length);
  positions.fill(1);
  for (let i = 0; i < source.length; i++) {
    let end = i;
    if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      end = skipQuoted(source, i);
    } else if (source[i] === "/" && source[i + 1] === "/") {
      const newline = source.indexOf("\n", i + 2);
      end = newline < 0 ? source.length : newline;
    } else if (source[i] === "/" && source[i + 1] === "*") {
      const close = source.indexOf("*/", i + 2);
      end = close < 0 ? source.length : close + 2;
    }
    if (end > i) {
      positions.fill(0, i, end);
      i = end - 1;
    }
  }
  return positions;
}

function matchingBrace(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === '"' || char === "'" || char === "`") {
      i = skipQuoted(source, i) - 1;
    } else if (char === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i + 2);
      if (i < 0) return -1;
    } else if (char === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2);
      if (i < 0) return -1;
      i++;
    } else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return i;
  }
  return -1;
}

function splitMembers(body: string): Member[] | null {
  const members: Member[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '"' || char === "'" || char === "`") {
      i = skipQuoted(body, i) - 1;
      continue;
    }
    if (char === "/" && body[i + 1] === "/") {
      const newline = body.indexOf("\n", i + 2);
      if (newline < 0) break;
      i = newline;
      continue;
    }
    if (char === "/" && body[i + 1] === "*") {
      const end = body.indexOf("*/", i + 2);
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (char === "{" || char === "(" || char === "[") depth++;
    else if (char === "}" || char === ")" || char === "]") depth--;
    else if (depth === 0 && (char === ";" || char === ",")) {
      members.push({
        text: body.slice(start, i),
        separator: char,
        order: members.length,
      });
      start = i + 1;
    }
  }
  const tail = body.slice(start);
  if (tail.trim()) return null;
  return members.length > 1 ? members : null;
}

function lineLength(member: Member): number {
  const meaningful = member.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("/*"));
  return meaningful.length === 1
    ? meaningful[0].length + 1
    : Number.MAX_SAFE_INTEGER;
}

function sortBody(body: string): string {
  const members = splitMembers(body);
  if (!members) return body;
  const leading = body.match(/^\s*/)?.[0] ?? "";
  const trailing = body.match(/\s*$/)?.[0] ?? "";
  const sorted = [...members].sort(
    (a, b) => lineLength(a) - lineLength(b) || a.order - b.order,
  );
  return (
    leading +
    sorted
      .map((member) => member.text.trim() + member.separator)
      .join(leading.includes("\n") ? leading : " ") +
    trailing
  );
}

export function sortInterfaceKeys(source: string): string {
  const ranges: Array<{ start: number; end: number }> = [];
  const code = codePositions(source);
  const pattern =
    /\binterface\s+[A-Za-z_$][\w$]*(?:\s*<[^>{}]*>)?(?:\s+extends\s+[^{}]+)?\s*\{/g;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (!code[match.index]) continue;
    const start = source.indexOf("{", match.index);
    const end = matchingBrace(source, start);
    if (end >= 0) ranges.push({ start, end });
  }
  let result = source;
  for (const range of ranges.reverse()) {
    const body = result.slice(range.start + 1, range.end);
    result =
      result.slice(0, range.start + 1) +
      sortBody(body) +
      result.slice(range.end);
  }
  return result;
}
