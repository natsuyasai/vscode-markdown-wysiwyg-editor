import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UPDATE_DEBOUNCE_MS, useMarkdownSync } from "@/hooks/useMarkdownSync";
import { flushPendingEdits } from "@/utilities/pendingEditsFlusher";
import { vscode } from "@/utilities/vscode";

/**
 * useMarkdownSync のプロパティベーステスト。
 *
 * エディタ(Crepe)の正規化（先頭の空行の除去、空行の圧縮、`*`→`-`、末尾の改行の除去）を
 * 模した関数でラウンドトリップ結果を作り、次の不変条件を検証する:
 * - 編集していなければ、拡張機能へ送るテキストは元のテキストと完全に一致し、update は送らない
 * - 1ブロックだけ編集したら、そのブロックだけが変わる
 */

interface Doc {
  leadingBlankLines: number;
  blocks: { marker: "* " | "- " | ""; word: string }[];
  gaps: ("\n\n" | "\n\n\n\n")[];
  trailingNewlines: number;
}

const docArbitrary = fc
  .record({
    leadingBlankLines: fc.integer({ min: 0, max: 3 }),
    count: fc.integer({ min: 1, max: 5 }),
    markers: fc.array(fc.constantFrom("* ", "- ", ""), { minLength: 5, maxLength: 5 }),
    gaps: fc.array(fc.constantFrom("\n\n", "\n\n\n\n"), { minLength: 4, maxLength: 4 }),
    trailingNewlines: fc.integer({ min: 0, max: 3 }),
  })
  .map(({ leadingBlankLines, count, markers, gaps, trailingNewlines }): Doc => ({
    leadingBlankLines,
    // 行単位のdiffが曖昧にならないよう、ブロックごとに一意な語を持たせる
    blocks: Array.from({ length: count }, (_, i) => ({
      marker: markers[i] as "* " | "- " | "",
      word: `word${i}`,
    })),
    gaps: gaps.slice(0, count - 1) as Doc["gaps"],
    trailingNewlines,
  }));

function render(doc: Doc, editedIndex?: number, normalized = false): string {
  let text = normalized ? "" : "\n".repeat(doc.leadingBlankLines);
  doc.blocks.forEach((block, i) => {
    const marker = normalized && block.marker === "* " ? "- " : block.marker;
    const word = i === editedIndex ? `${block.word} edited` : block.word;
    text += marker + word;
    if (i < doc.gaps.length) {
      text += normalized ? "\n\n" : doc.gaps[i];
    }
  });
  return text + (normalized ? "" : "\n".repeat(doc.trailingNewlines));
}

describe("useMarkdownSync プロパティ", () => {
  let sent: { type: string; payload: string }[];

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    vi.spyOn(vscode, "postMessage").mockImplementation((message) => {
      sent.push(message as unknown as { type: string; payload: string });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function load(doc: Doc) {
    const hook = renderHook(() => useMarkdownSync());
    act(() => {
      hook.result.current.updateMarkdownFromExtension(render(doc));
    });
    act(() => {
      hook.result.current.handleBaselineLoaded(render(doc, undefined, true));
    });
    sent.splice(0);
    return hook;
  }

  it("編集していなければ、保存は元のテキストと一致し、update は送らない", () => {
    fc.assert(
      fc.property(docArbitrary, (doc) => {
        const hook = load(doc);
        act(() => {
          flushPendingEdits();
          document.dispatchEvent(new Event("visibilitychange"));
          window.dispatchEvent(new Event("pagehide"));
          vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS);
          // エディタが同じ出力を通知し直しても編集にはならない
          hook.result.current.setMarkdown(render(doc, undefined, true));
          vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS);
          hook.result.current.handleApply();
        });
        hook.unmount();
        expect(sent.filter((m) => m.type === "update")).toEqual([]);
        expect(sent).toEqual([{ type: "save", payload: render(doc) }]);
      }),
      { numRuns: 100 }
    );
  });

  it("1ブロックだけ編集したら、そのブロックだけが変わる", () => {
    fc.assert(
      // 空行は行単位のdiffで一意なアンカーにならないため、編集箇所の近くで空行の圧縮や先頭の空行の除去と
      // 同じ行の記法の正規化が重なると、対応を取り違えうる（既知の制約）。ここではその組み合わせを除いて検証する
      fc.property(docArbitrary, fc.nat(), (generated, seed) => {
        const doc: Doc = {
          ...generated,
          gaps: generated.gaps.map(() => "\n\n" as const),
          // 先頭の空行が落ちる文書では、編集する先頭ブロックの記法の正規化は重ねない
          blocks: generated.blocks.map((block) => ({
            ...block,
            marker: generated.leadingBlankLines > 0 && block.marker === "* " ? "- " : block.marker,
          })),
        };
        const index = seed % doc.blocks.length;
        const hook = load(doc);
        act(() => {
          hook.result.current.setMarkdown(render(doc, index, true));
          vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS);
        });
        hook.unmount();
        const edited = sent.filter((m) => m.type === "update");
        const block = doc.blocks[index];
        // 編集したブロックは、エディタの出力どおり（正規化済みの記法）になる
        const marker = block.marker === "* " ? "- " : block.marker;
        const expected = render(doc).replace(
          block.marker + block.word,
          `${marker}${block.word} edited`
        );
        expect(edited).toEqual([{ type: "update", payload: expected }]);
      }),
      { numRuns: 100 }
    );
  });
});
