import { diffIndices } from "node-diff3";

/**
 * baseline→originalの行アライメント（正規化差分の対応関係）を表すセグメント
 * 差分箇所（mismatch）のみを保持し、その間は共通行として1:1に対応する
 * 行は空行を除いた内容のある行（内容行）の並びで数える
 */
interface AlignmentSegment {
  baselineStart: number;
  baselineLength: number;
  originalStart: number;
  originalLength: number;
}

/**
 * baseline→originalの行アライメントを構築する
 * diffIndicesの結果をそのままセグメント列（baseline行位置の昇順）として返す
 */
function buildAlignment(baselineLines: string[], originalLines: string[]): AlignmentSegment[] {
  return diffIndices(baselineLines, originalLines).map((mismatch) => ({
    baselineStart: mismatch.buffer1[0],
    baselineLength: mismatch.buffer1[1],
    originalStart: mismatch.buffer2[0],
    originalLength: mismatch.buffer2[1],
  }));
}

/**
 * 行の並びと、空行を除いた内容行の位置情報
 *
 * 空行はどこにあっても同じ行に見えるため、行の対応付けの目印にならない。
 * 対応付けは内容行だけで行い、空行は隣り合う内容行からの相対位置で扱う。
 */
interface LineIndex {
  lineCount: number;
  /** 内容行の番号 → 全行の中での行位置 */
  contentPositions: number[];
  contentLines: string[];
}

function indexLines(lines: string[]): LineIndex {
  const contentPositions: number[] = [];
  const contentLines: string[] = [];
  lines.forEach((line, position) => {
    if (line.trim() !== "") {
      contentPositions.push(position);
      contentLines.push(line);
    }
  });
  return { lineCount: lines.length, contentPositions, contentLines };
}

/** 内容行`contentIndex`の直後から次の内容行（なければ末尾）の直前までの、空行の範囲 */
function blankRunAfter(index: LineIndex, contentIndex: number): { start: number; end: number } {
  const start = contentIndex > 0 ? index.contentPositions[contentIndex - 1] + 1 : 0;
  const end =
    contentIndex < index.contentPositions.length
      ? index.contentPositions[contentIndex]
      : index.lineCount;
  return { start, end };
}

/** 変換する位置が編集範囲の開始か終了かを表す境界種別 */
type BoundaryKind = "start" | "end";

/**
 * baseline上の行位置をoriginal上の行位置に変換する
 * - 共通領域上の位置は、直前までの差分による行数のずれ（オフセット）で変換する
 * - 差分領域の内部の位置は、領域先頭からの相対位置で対応付ける
 *   （original側の行数を超える場合は領域末尾に丸める）
 * - original側にのみ行がある挿入領域（baselineLength === 0）と一致する境界は、
 *   開始位置なら挿入行の後、終了位置なら挿入行の前に対応付け、
 *   正規化で失われたoriginalの行（空行圧縮など）を編集範囲から除外して保全する
 */
function mapBaselinePositionToOriginal(
  position: number,
  alignment: AlignmentSegment[],
  boundary: BoundaryKind
): number {
  let offset = 0;
  for (const segment of alignment) {
    const isBeforeSegment =
      boundary === "end" ? position <= segment.baselineStart : position < segment.baselineStart;
    if (isBeforeSegment) {
      break;
    }
    const baselineEnd = segment.baselineStart + segment.baselineLength;
    if (position < baselineEnd) {
      // 差分領域の内部: 領域先頭からの相対位置で対応付ける
      return (
        segment.originalStart + Math.min(position - segment.baselineStart, segment.originalLength)
      );
    }
    offset += segment.originalLength - segment.baselineLength;
  }
  return position + offset;
}

/**
 * baseline上の行位置（行と行の境界）をoriginal上の行位置に変換する
 *
 * 内容行どうしの対応で、境界の手前にある内容行の数`k`を`k'`に変換し、
 * 境界が`k`番目の内容行の後ろの空行の並びのどこにあったかを、`k'`の後ろの空行の並びに写す。
 * - 空行の並びの先頭（空行の手前）にある境界は、original側でも並びの先頭に対応させる
 * - 空行の並びの末尾（次の内容行の直前）にある境界は、original側でも並びの末尾に対応させる
 * - 空行の並びがない境界は、開始位置なら次の内容行の直前、終了位置なら前の内容行の直後に対応させる。
 *   original側にだけある空行（まとめられた空行など）は、編集範囲に含めず保全する
 * - 並びの途中にある境界は、original側の並びの長さを超えない範囲で同じ位置に対応させる
 */
function mapBoundaryToOriginal(
  position: number,
  baseline: LineIndex,
  original: LineIndex,
  alignment: AlignmentSegment[],
  boundary: BoundaryKind
): number {
  const contentBefore = baseline.contentPositions.filter((p) => p < position).length;
  const baselineRun = blankRunAfter(baseline, contentBefore);
  const blanksBefore = position - baselineRun.start;
  const baselineRunLength = baselineRun.end - baselineRun.start;

  const mappedContentBefore = mapBaselinePositionToOriginal(contentBefore, alignment, boundary);
  const originalRun = blankRunAfter(
    original,
    Math.min(mappedContentBefore, original.contentPositions.length)
  );

  if (baselineRunLength === 0) {
    return boundary === "start" ? originalRun.end : originalRun.start;
  }
  if (blanksBefore === 0) {
    return originalRun.start;
  }
  if (blanksBefore === baselineRunLength) {
    return originalRun.end;
  }
  return originalRun.start + Math.min(blanksBefore, originalRun.end - originalRun.start);
}

/**
 * baseline→currentの差分（＝ユーザーの実編集）のみをoriginalに適用する3-wayマージを行う
 *
 * WYSIWYGエディタはMarkdown全文を再シリアライズするため、baseline/currentでは
 * 未編集行まで正規化されている（`*`箇条書き→`-`、`_強調_`→`*強調*` 等）。
 * 本関数は行単位で以下のようにマージする:
 * - baseline→currentで変わった箇所（ユーザー編集）はcurrentの内容を採用する
 * - それ以外の行は正規化前のoriginalの行をそのまま保全する
 * - ユーザー編集が正規化差分のある行と重なる（競合する）場合はcurrentを採用する
 *
 * 入力はすべてLF改行前提。出力もLF。
 */
export function mergeUserEdits(original: string, baseline: string, current: string): string {
  // 文書末尾の改行は、ユーザーが変えていなければoriginalのまま保全する。
  // 末尾の行と同時に正規化されていると、行単位のdiffでは末尾の行の編集と一体の差分になり、
  // 末尾の行を編集しただけで末尾の改行まで失われてしまう
  const originalTail = splitTrailingNewlines(original);
  const baselineTail = splitTrailingNewlines(baseline);
  const currentTail = splitTrailingNewlines(current);
  const mergedBody = mergeBodies(originalTail.body, baselineTail.body, currentTail.body);
  const tail = currentTail.tail === baselineTail.tail ? originalTail.tail : currentTail.tail;
  return mergedBody + tail;
}

/** 末尾の改行の連なりと、それを除いた本体に分ける */
function splitTrailingNewlines(text: string): { body: string; tail: string } {
  let end = text.length;
  while (end > 0 && text[end - 1] === "\n") {
    end--;
  }
  return { body: text.slice(0, end), tail: text.slice(end) };
}

function mergeBodies(original: string, baseline: string, current: string): string {
  const originalLines = original.split("\n");
  const baselineLines = baseline.split("\n");
  const currentLines = current.split("\n");

  // ユーザーの実編集 = baseline→currentの差分ハンク（baseline行位置の昇順）
  const editHunks = diffIndices(baselineLines, currentLines);
  if (editHunks.length === 0) {
    return original;
  }

  // 正規化差分の対応関係 = baseline→originalの内容行のアライメント（空行は目印にしない）
  const baselineIndex = indexLines(baselineLines);
  const originalIndex = indexLines(originalLines);
  const alignment = buildAlignment(baselineIndex.contentLines, originalIndex.contentLines);

  // 各編集ハンクをoriginal上の行範囲にマップし、currentの内容で置き換える
  const resultLines: string[] = [];
  let consumedOriginalLines = 0;
  for (const hunk of editHunks) {
    const baselineStart = hunk.buffer1[0];
    const baselineEnd = baselineStart + hunk.buffer1[1];
    const originalStart = mapBoundaryToOriginal(
      baselineStart,
      baselineIndex,
      originalIndex,
      alignment,
      "start"
    );
    // 開始と終了で境界規則が異なるため、純粋な挿入ハンクでは終了位置が開始位置を
    // 下回ることがある。範囲が逆転しないよう終了位置を開始位置以上に丸める
    const originalEnd = Math.max(
      originalStart,
      mapBoundaryToOriginal(baselineEnd, baselineIndex, originalIndex, alignment, "end")
    );

    resultLines.push(...originalLines.slice(consumedOriginalLines, originalStart));
    resultLines.push(...hunk.buffer2Content);
    consumedOriginalLines = Math.max(consumedOriginalLines, originalEnd);
  }
  resultLines.push(...originalLines.slice(consumedOriginalLines));

  return resultLines.join("\n");
}
