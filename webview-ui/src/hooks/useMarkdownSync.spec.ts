/* eslint-disable @typescript-eslint/unbound-method */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UPDATE_DEBOUNCE_MS, useMarkdownSync } from "@/hooks/useMarkdownSync";
import { flushPendingEdits } from "@/utilities/pendingEditsFlusher";
import { vscode } from "@/utilities/vscode";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useMarkdownSync>, unknown>>;

/** 拡張機能から文書を受信し、エディタが読み込んだ状態（baseline確定）にする */
function openDocument(hook: Hook, original: string, baseline: string) {
  act(() => {
    hook.result.current.updateMarkdownFromExtension(original);
  });
  act(() => {
    hook.result.current.handleBaselineLoaded(baseline);
  });
  vi.mocked(vscode.postMessage).mockClear();
}

function sentMessages(type: string): { type: string; payload: string }[] {
  return vi
    .mocked(vscode.postMessage)
    .mock.calls.map(([message]) => message as { type: string; payload: string })
    .filter((message) => message.type === type);
}

describe("useMarkdownSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("初期状態で空のMarkdownが設定されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    expect(result.current.markdown).toBe("");
  });

  it("setMarkdownでMarkdownを更新できること（関数形式も使える）", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("# Hello World");
    });
    expect(result.current.markdown).toBe("# Hello World");

    act(() => {
      result.current.setMarkdown((previous) => `${previous}\n`);
    });
    expect(result.current.markdown).toBe("# Hello World\n");
  });

  it("updateMarkdownFromExtensionでMarkdownを更新できること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.updateMarkdownFromExtension("# Test Content");
    });

    expect(result.current.markdown).toBe("# Test Content");
  });

  it("baseUriRefとdocumentDirRefが初期化されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    expect(result.current.baseUriRef.current).toBe("");
    expect(result.current.documentDirRef.current).toBe("");
  });

  describe("明示保存（handleApply）", () => {
    // エディタ未読み込み時は組み立てができないため、現在の出力をクリーンアップして送る
    it.each([
      ["# Test", "# Test"],
      ["Line1<br>Line2", "Line1\nLine2"],
      ["Hello&nbsp;World", "Hello World"],
      ["Hello World", "Hello World"],
    ])("baseline未設定時、%j は %j として save で送られること", (input, expected) => {
      const { result } = renderHook(() => useMarkdownSync());
      act(() => {
        result.current.setMarkdown(input);
      });

      act(() => {
        result.current.handleApply();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({ type: "save", payload: expected });
    });

    it("未編集行の正規化差分が保存されないこと", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n- item2\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n");
      });

      act(() => {
        hook.result.current.handleApply();
      });

      // 未編集のitem1行は元の箇条書き記号のまま、編集行のみエディタ出力で置き換わる
      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: "* item1\n- item2 edited\n",
      });
    });

    it("編集なしの場合、payloadがoriginalと完全一致すること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n\n- item2\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n\n- item2\n");
      });

      act(() => {
        hook.result.current.handleApply();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: "* item1\n* item2\n",
      });
    });

    it("改行コードはLFのまま送ること（改行コードは拡張機能の層が文書に合わせる）", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n- item2\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n");
      });

      act(() => {
        hook.result.current.handleApply();
      });

      const [save] = sentMessages("save");
      expect(save.payload).not.toContain("\r");
    });

    it("保存すると、デバウンス待ちの更新は送らず保存だけを送ること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "a\n", "a\n");
      act(() => {
        hook.result.current.setMarkdown("b\n");
      });

      act(() => {
        hook.result.current.handleApply();
      });
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS * 2);
      });

      expect(sentMessages("save")).toHaveLength(1);
      expect(sentMessages("update")).toHaveLength(0);
    });
  });

  describe("編集の反映（update）", () => {
    it("編集が止まってから1回だけ update を送ること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n- item2\n");

      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 e\n");
      });
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS - 1);
      });
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 ed\n");
      });
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS - 1);
      });
      expect(sentMessages("update")).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(sentMessages("update")).toEqual([
        { type: "update", payload: "* item1\n- item2 ed\n" },
      ]);
    });

    it("編集していなければ update を送らないこと", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n", "- item1\n");

      // エディタの再シリアライズだけが通知されても、内容は変わらない
      act(() => {
        hook.result.current.setMarkdown("- item1\n");
      });
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS * 2);
      });

      expect(sentMessages("update")).toHaveLength(0);
    });

    it("反映済みの内容と同じテキストを受信しても、エディタの内容は変わらないこと（エコー）", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n- item2\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n");
      });
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS);
      });

      act(() => {
        hook.result.current.updateMarkdownFromExtension("* item1\n- item2 edited\n");
      });

      expect(hook.result.current.markdown).toBe("- item1\n- item2 edited\n");
    });

    it("未反映の編集を flushPendingEdits ですぐに送れること（エクスポート前の確定）", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "a\n", "a\n");
      act(() => {
        hook.result.current.setMarkdown("b\n");
      });

      act(() => {
        flushPendingEdits();
      });

      expect(sentMessages("update")).toEqual([{ type: "update", payload: "b\n" }]);
      // 送信済みなので、デバウンス満了で重複して送らない
      act(() => {
        vi.advanceTimersByTime(UPDATE_DEBOUNCE_MS * 2);
      });
      expect(sentMessages("update")).toHaveLength(1);
    });
  });

  describe("外部での変更（S-05）", () => {
    it("未反映の編集がなければ、外部の変更をそのまま取り込むこと", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "a\nb\n", "a\nb\n");

      act(() => {
        hook.result.current.updateMarkdownFromExtension("a\nb2\n");
      });

      expect(hook.result.current.markdown).toBe("a\nb2\n");
      expect(hook.result.current.hasMergeConflict).toBe(false);
      expect(sentMessages("update")).toHaveLength(0);
    });

    it("未反映の編集がある間の外部の変更は、別の箇所なら両方を取り込み、文書へも反映すること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "a\n\nb\n\nc\n", "a\n\nb\n\nc\n");
      act(() => {
        hook.result.current.setMarkdown("a2\n\nb\n\nc\n");
      });

      act(() => {
        hook.result.current.updateMarkdownFromExtension("a\n\nb\n\nc2\n");
      });

      expect(hook.result.current.markdown).toBe("a2\n\nb\n\nc2\n");
      expect(hook.result.current.hasMergeConflict).toBe(false);
      expect(sentMessages("update")).toEqual([{ type: "update", payload: "a2\n\nb\n\nc2\n" }]);
    });

    it("同じ箇所が競合したときは、編集を優先して取り込み、競合を通知すること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "a\n\nb\n", "a\n\nb\n");
      act(() => {
        hook.result.current.setMarkdown("a-mine\n\nb\n");
      });

      act(() => {
        hook.result.current.updateMarkdownFromExtension("a-theirs\n\nb\n");
      });

      expect(hook.result.current.markdown).toBe("a-mine\n\nb\n");
      expect(hook.result.current.hasMergeConflict).toBe(true);
      expect(sentMessages("update")).toEqual([{ type: "update", payload: "a-mine\n\nb\n" }]);

      act(() => {
        hook.result.current.dismissMergeConflict();
      });
      expect(hook.result.current.hasMergeConflict).toBe(false);
    });
  });

  describe("エディタの作り直し（S-01）", () => {
    it("編集後にエディタが作り直されても、編集が失われずに保存されること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n", "- item1\n- item2\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n");
      });

      // モード切替/テーマ変更でエディタが作り直され、編集後の内容がbaselineとして通知される
      act(() => {
        hook.result.current.handleBaselineLoaded("- item1\n- item2 edited\n");
      });

      // 作り直しの時点で編集は文書へ反映され、保存しても編集は残る
      expect(sentMessages("update")).toEqual([
        { type: "update", payload: "* item1\n- item2 edited\n" },
      ]);
      act(() => {
        hook.result.current.handleApply();
      });
      expect(sentMessages("save")).toEqual([
        { type: "save", payload: "* item1\n- item2 edited\n" },
      ]);
    });

    it("作り直し後の編集も、その後の編集だけが追加で反映されること", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* item1\n* item2\n* item3\n", "- item1\n- item2\n- item3\n");
      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n- item3\n");
      });
      act(() => {
        hook.result.current.handleBaselineLoaded("- item1\n- item2 edited\n- item3\n");
      });

      act(() => {
        hook.result.current.setMarkdown("- item1\n- item2 edited\n- item3 edited\n");
      });
      act(() => {
        hook.result.current.handleApply();
      });

      expect(sentMessages("save").at(-1)?.payload).toBe(
        "* item1\n- item2 edited\n- item3 edited\n"
      );
    });

    it("外部の変更を読み込んだ直後のbaseline通知では、originalを変えないこと", () => {
      const hook = renderHook(() => useMarkdownSync());
      openDocument(hook, "* a\n", "- a\n");

      act(() => {
        hook.result.current.updateMarkdownFromExtension("* b\n");
      });
      act(() => {
        hook.result.current.handleBaselineLoaded("- b\n");
      });
      act(() => {
        hook.result.current.setMarkdown("- b\n");
      });
      act(() => {
        hook.result.current.handleApply();
      });

      expect(sentMessages("save")).toEqual([{ type: "save", payload: "* b\n" }]);
    });
  });
});
