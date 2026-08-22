enum SegmentType {
  Other = "other",
  Multi = "multi",
  Single = "single",
}

type OtherSegment = { type: SegmentType.Other; text: string };
type SingleSegment = { type: SegmentType.Single; line: string };
type MultiSegment = { type: SegmentType.Multi; lines: string[] };

type Segment = SingleSegment | MultiSegment | OtherSegment;

const isCompleteImport = (trimmed: string): boolean => {
  return (
    /from\s+['"][^'"]*['"]/.test(trimmed) ||
    /^import\s+['"][^'"]*['"]/.test(trimmed)
  );
};

const isImportCloser = (trimmed: string): boolean => {
  return /^[}\s]*from\s+['"][^'"]*['"]/.test(trimmed);
};

const isImportLine = (trimmed: string): boolean => {
  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("import{") ||
    trimmed === "import"
  );
};

const sortMultiInternal = (entry: MultiSegment): MultiSegment => {
  const { lines } = entry;

  if (lines.length <= 2) {
    return entry;
  }

  const first = lines[0];
  const last = lines[lines.length - 1];

  const middle = lines
    .slice(1, lines.length - 1)
    .sort(
      (a, b) =>
        a.replace(/\s+/g, " ").trim().length -
        b.replace(/\s+/g, " ").trim().length,
    );

  return { type: SegmentType.Multi, lines: [first, ...middle, last] };
};

function parseSegments(source: string, printWidth: number): Segment[] {
  const lines = source.split("\n");
  const segments: Segment[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isImportLine(trimmed)) {
      if (isCompleteImport(trimmed)) {
        segments.push({ type: SegmentType.Single, line });
        i++;
        continue;
      }

      i++;
      const collected: string[] = [line];

      while (i < lines.length) {
        collected.push(lines[i]);

        if (isImportCloser(lines[i].trim())) {
          i++;
          break;
        }

        i++;
      }

      const normalized = collected.join(" ").replace(/\s+/g, " ").trim();
      if (normalized.length <= printWidth) {
        segments.push({ type: SegmentType.Single, line: normalized });
      } else {
        segments.push({ type: SegmentType.Multi, lines: collected });
      }
      continue;
    }

    const last = segments[segments.length - 1];
    if (last?.type === "other") {
      last.text += "\n" + line;
    } else {
      segments.push({ type: SegmentType.Other, text: line });
    }
    i++;
  }

  return segments;
}

const sortKey = (entry: SingleSegment | MultiSegment): number => {
  if (entry.type === SegmentType.Single) {
    return entry.line.replace(/\s+/g, " ").trim().length;
  }

  return entry.lines[entry.lines.length - 1].replace(/\s+/g, " ").trim().length;
};

export const sortImports = (source: string, printWidth = 80): string => {
  const segments = parseSegments(source, printWidth);

  const importEntries = segments.filter(
    (s): s is SingleSegment | MultiSegment =>
      s.type === SegmentType.Single || s.type === SegmentType.Multi,
  );

  const otherSegments = segments.filter(
    (s): s is OtherSegment => s.type === SegmentType.Other,
  );

  if (importEntries.length === 0) {
    return source;
  }

  const singles = importEntries.filter(
    (s): s is SingleSegment => s.type === SegmentType.Single,
  );

  const multis = importEntries.filter(
    (s): s is MultiSegment => s.type === SegmentType.Multi,
  );

  multis.sort((a, b) => sortKey(a) - sortKey(b));
  singles.sort((a, b) => sortKey(a) - sortKey(b));

  const sortedMultis = multis.map(sortMultiInternal);

  const parts: string[] = [];

  for (const m of sortedMultis) {
    parts.push(m.lines.join("\n"));
  }

  if (singles.length > 0) {
    parts.push(singles.map((s) => s.line).join("\n"));
  }

  let result = parts.join("\n\n");

  const otherText = otherSegments
    .map((s) => s.text)
    .join("\n")
    .replace(/^\n+/, "");

  if (otherText.length > 0) {
    result += "\n\n" + otherText;
  } else {
    result += "\n";
  }

  return result;
};
