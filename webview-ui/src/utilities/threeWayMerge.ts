import { diffIndices } from "node-diff3";

/**
 * baseline→originalの行アライメント（正規化差分の対応関係）を表すセグメント
 * 差分箇所（mismatch）のみを保持し、その間は共通行として1:1に対応する
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
  const originalLines = original.split("\n");
  const baselineLines = baseline.split("\n");
  const currentLines = current.split("\n");

  // ユーザーの実編集 = baseline→currentの差分ハンク（baseline行位置の昇順）
  const editHunks = diffIndices(baselineLines, currentLines);
  if (editHunks.length === 0) {
    return original;
  }

  // 正規化差分の対応関係 = baseline→originalの行アライメント
  const alignment = buildAlignment(baselineLines, originalLines);

  // 各編集ハンクをoriginal上の行範囲にマップし、currentの内容で置き換える
  const resultLines: string[] = [];
  let consumedOriginalLines = 0;
  for (const hunk of editHunks) {
    const baselineStart = hunk.buffer1[0];
    const baselineEnd = baselineStart + hunk.buffer1[1];
    const originalStart = mapBaselinePositionToOriginal(baselineStart, alignment, "start");
    // 開始と終了で境界規則が異なるため、純粋な挿入ハンクでは終了位置が開始位置を
    // 下回ることがある。範囲が逆転しないよう終了位置を開始位置以上に丸める
    const originalEnd = Math.max(
      originalStart,
      mapBaselinePositionToOriginal(baselineEnd, alignment, "end")
    );

    resultLines.push(...originalLines.slice(consumedOriginalLines, originalStart));
    resultLines.push(...hunk.buffer2Content);
    consumedOriginalLines = Math.max(consumedOriginalLines, originalEnd);
  }
  resultLines.push(...originalLines.slice(consumedOriginalLines));

  return resultLines.join("\n");
}
