interface Attribute {
  text: string;
  order: number;
  multiline: boolean;
  spread: boolean;
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

function splitAttributes(body: string): Attribute[] | null {
  const attributes: Attribute[] = [];
  let i = 0;
  while (i < body.length) {
    while (/\s/.test(body[i] ?? "")) i++;
    if (i >= body.length) break;
    const start = i;
    let braces = 0;
    while (i < body.length) {
      const char = body[i];
      if (char === '"' || char === "'" || char === "`") {
        i = skipQuoted(body, i);
        continue;
      }
      if (char === "{") braces++;
      else if (char === "}") braces--;
      else if (/\s/.test(char) && braces === 0) break;
      i++;
    }
    const text = body.slice(start, i).trim();
    if (
      !text ||
      (!/^[A-Za-z_:][\w:.-]*(?:\s*=|$)/.test(text) &&
        !/^\{(?:\/\*|\.\.\.)/.test(text))
    ) {
      return null;
    }
    attributes.push({
      text,
      order: attributes.length,
      multiline: text.includes("\n"),
      spread: /^\{\.\.\./.test(text),
    });
  }
  return attributes.length > 1 ? attributes : null;
}

function sortedAttributes(attributes: Attribute[]): Attribute[] {
  const first = attributes[0];
  const pinnedFirst = first.spread ? [first] : [];
  const candidates = first.spread ? attributes.slice(1) : attributes;
  const singles = candidates
    .filter((attribute) => !attribute.spread && !attribute.multiline)
    .sort((a, b) => a.text.length - b.text.length || a.order - b.order);
  const multiline = candidates
    .filter((attribute) => !attribute.spread && attribute.multiline)
    .sort(
      (a, b) =>
        a.text.split("\n")[0].trim().length -
          b.text.split("\n")[0].trim().length || a.order - b.order,
    );
  const spreads = candidates.filter((attribute) => attribute.spread);
  return [...pinnedFirst, ...singles, ...multiline, ...spreads];
}

function rewriteBody(body: string): string {
  const attributes = splitAttributes(body);
  if (!attributes) return body;
  const sorted = sortedAttributes(attributes);
  if (sorted.every((attribute, index) => attribute === attributes[index]))
    return body;

  if (!body.includes("\n")) {
    const trailing = body.match(/\s*$/)?.[0] ?? "";
    return ` ${sorted.map((attribute) => attribute.text).join(" ")}${trailing}`;
  }

  const leading = body.match(/^\s*/)?.[0] ?? "";
  const trailing = body.match(/\s*$/)?.[0] ?? "";
  const indent = leading.slice(leading.lastIndexOf("\n") + 1);
  const separator = `\n${indent}`;
  return (
    leading +
    sorted.map((attribute) => attribute.text).join(separator) +
    trailing
  );
}

function openingTagEnd(source: string, start: number): number {
  let braces = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (char === '"' || char === "'" || char === "`")
      i = skipQuoted(source, i) - 1;
    else if (char === "{") braces++;
    else if (char === "}") braces--;
    else if (char === ">" && braces === 0) return i;
  }
  return -1;
}

export function sortJsxAttributes(source: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === '"' || char === "'" || char === "`") {
      i = skipQuoted(source, i);
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      const newline = source.indexOf("\n", i + 2);
      i = newline < 0 ? source.length : newline + 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    const match = source.slice(i).match(/^<([A-Za-z][\w:.-]*)/);
    if (!match) {
      i++;
      continue;
    }
    const nameEnd = i + match[0].length;
    if (!/[\s/>]/.test(source[nameEnd] ?? "")) {
      i++;
      continue;
    }
    const tagEnd = openingTagEnd(source, nameEnd);
    if (tagEnd < 0) break;
    let attributesEnd = tagEnd;
    if (source.slice(nameEnd, tagEnd).trimEnd().endsWith("/")) {
      attributesEnd = source.lastIndexOf("/", tagEnd - 1);
    }
    const body = source.slice(nameEnd, attributesEnd);
    const rewritten = rewriteBody(body);
    if (rewritten !== body)
      edits.push({ start: nameEnd, end: attributesEnd, text: rewritten });
    i = tagEnd + 1;
  }

  let result = source;
  for (const edit of edits.reverse())
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  return result;
}
