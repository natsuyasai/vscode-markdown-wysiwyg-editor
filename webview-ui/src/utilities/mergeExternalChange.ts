import { diff3Merge } from "node-diff3";

/** 外部の変更とWebViewの未反映の編集を取り込んだ結果 */
export interface ExternalChangeMergeResult {
  /** 取り込み後のテキスト */
  text: string;
  /** 同じ箇所を両方が変更していて、自動では取り込めなかった箇所があるか */
  conflict: boolean;
}

/**
 * 外部での変更（theirs）と、WebViewの未反映の編集（ours）を、共通の祖先（base）から3-wayマージする。
 *
 * - 別々の箇所への変更は、どちらも取り込む
 * - 同じ箇所への異なる変更（競合）は、WebViewの編集（ours）を優先し、conflict を true にして知らせる
 *
 * 入力はすべてLF改行前提。出力もLF。
 */
export function mergeExternalChange(
  base: string,
  ours: string,
  theirs: string
): ExternalChangeMergeResult {
  if (ours === base) {
    return { text: theirs, conflict: false };
  }
  if (theirs === base || theirs === ours) {
    return { text: ours, conflict: false };
  }

  const regions = diff3Merge(ours.split("\n"), base.split("\n"), theirs.split("\n"), {
    excludeFalseConflicts: true,
  });
  const lines: string[] = [];
  let conflict = false;
  for (const region of regions) {
    if (region.ok) {
      lines.push(...region.ok);
    } else if (region.conflict) {
      conflict = true;
      lines.push(...region.conflict.a);
    }
  }
  return { text: lines.join("\n"), conflict };
}
