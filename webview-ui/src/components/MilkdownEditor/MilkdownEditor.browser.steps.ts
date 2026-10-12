import { render } from "@testing-library/react";
import { type DataTable, type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { createElement, useCallback, useEffect, useState } from "react";
import { expect, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { MilkdownEditor } from "@/components/MilkdownEditor";
import { scrolledElements } from "../../test/gherkin/scrollSpy";

// quickpickleのstepタイムアウト（既定3秒）より短くし、失敗時にアサーションの内容が出るようにする
const WAIT_TIMEOUT_MS = 2_500;
const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

interface EditorWorld {
  /** onChange の通知（useMarkdownSync.setMarkdown に渡るもの） */
  changes: string[];
  /** onContentLoaded の通知（useMarkdownSync.handleBaselineLoaded に渡るもの） */
  loaded: string[];
  /** 開いたときのMarkdown */
  opened: string;
  /** 外部（拡張機能）からの更新を与える */
  setExternal?: (markdown: string) => void;
  /** 配色テーマを切り替える（エディタが作り直される） */
  setTheme?: (theme: "light" | "dark") => void;
  /** 外部更新の間に編集領域のDOMに起きた変更の数（本文を置き換えると変わる。置き換えなければ0） */
  domMutationsDuringUpdate?: number;
}

function worldData(world: QuickPickleWorldInterface): EditorWorld {
  return world.data as EditorWorld;
}

/** useMarkdownSync と同じ使い方（onChange で値を更新し、外部更新も同じ値として渡す）をするテスト用の親 */
function EditorHost({ state, initial }: { state: EditorWorld; initial: string }) {
  const [value, setValue] = useState(initial);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    state.setExternal = setValue;
    state.setTheme = setTheme;
  }, [state]);
  // MilkdownEditor は onChange が変わるとエディタを作り直すため、useMarkdownSync.setMarkdown と同じく安定した関数を渡す
  const handleChange = useCallback(
    (markdown: string) => {
      state.changes.push(markdown);
      setValue(markdown);
    },
    [state]
  );
  const handleContentLoaded = useCallback(
    (serialized: string) => {
      state.loaded.push(serialized);
    },
    [state]
  );
  return createElement(MilkdownEditor, {
    value,
    theme,
    onChange: handleChange,
    onContentLoaded: handleContentLoaded,
  });
}

function editorRoot(): Element {
  const root = document.querySelector(".ProseMirror");
  if (!root) {
    throw new Error("編集領域が描画されていません");
  }
  return root;
}

function editorHeadings(): HTMLElement[] {
  return [...editorRoot().querySelectorAll<HTMLElement>(HEADING_SELECTOR)].filter(
    (heading) => (heading.textContent ?? "").trim() !== ""
  );
}

async function openEditor(world: QuickPickleWorldInterface, markdown: string): Promise<void> {
  const state = worldData(world);
  state.changes = [];
  state.loaded = [];
  state.opened = markdown;
  render(createElement(EditorHost, { state, initial: markdown }));
  await vi.waitFor(() => expect(state.loaded.length).toBeGreaterThan(0), {
    timeout: WAIT_TIMEOUT_MS,
  });
}

/** 見出しのレベルは、アウトラインの字下げ（(レベル-1)*12+8 px）から求める */
function outlineItems(): { level: number; text: string }[] {
  const links = document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Outline"] a');
  return [...links].map((link) => ({
    level: (Number.parseInt(link.style.paddingLeft, 10) - 8) / 12 + 1,
    text: link.textContent ?? "",
  }));
}

/** 元のフロントマター（区切り行を含む先頭ブロック）。実装に依らず、文書の文字列から直接取り出す */
function originalFrontmatter(world: QuickPickleWorldInterface): string {
  const match = /^---\n[\s\S]*?\n---\n/.exec(worldData(world).opened);
  if (!match) {
    throw new Error("開いた文書にフロントマターがありません");
  }
  return match[0];
}

const SAMPLES: Record<string, string> = {
  "setext形式の見出しを含む": "大見出し\n========\n\n本文\n\n中見出し\n--------\n\n## ATX見出し\n",
  "チルダのフェンス内に#行を含む": "# 最初\n\n~~~bash\n# コメント\n~~~\n\n## 次の見出し\n",
  "4つ以上のバッククォートのフェンスを含む":
    "# 最初\n\n````md\n```\n# コード内\n```\n````\n\n## 次の見出し\n",
  "引用とリストの中に見出しを含む": "# 最初\n\n> ## 引用内の見出し\n\n- 項目\n\n## 最後の見出し\n",
  "字下げされた見出しを含む": "# 最初\n\n   ## 字下げ見出し\n\n## 最後の見出し\n",
  "HTMLの見出しタグを含む": "# 最初\n\n<h2>HTML見出し</h2>\n\n## Markdown見出し\n",
  "YAMLコメントを含むフロントマターで始まる":
    "---\n# YAMLのコメント\ntitle: サンプル\n---\n\n# 最初\n\n## 次の見出し\n",
  "空の見出しを含む": "# 最初\n\n#\n\n## 次の見出し\n",
};

Given(
  "編集モードで次のMarkdownを開く:",
  async (world: QuickPickleWorldInterface, markdown: DocString) => {
    await openEditor(world, markdown.toString());
  }
);

Given(
  "編集モードで{string}のサンプルを開く",
  async (world: QuickPickleWorldInterface, name: string) => {
    const sample = Object.hasOwn(SAMPLES, name) ? SAMPLES[name] : undefined;
    if (sample === undefined) {
      throw new Error(`サンプル "${name}" はありません`);
    }
    await openEditor(world, sample);
  }
);

When(
  "編集領域の段落{string}の末尾に{string}と入力する",
  async (world: QuickPickleWorldInterface, paragraph: string, typed: string) => {
    const target = [...editorRoot().querySelectorAll("p")].find((p) => p.textContent === paragraph);
    if (!(target instanceof HTMLElement)) {
      throw new Error(`段落 "${paragraph}" がありません`);
    }
    const changesBefore = worldData(world).changes.length;
    await userEvent.click(target);
    await userEvent.keyboard(`{End}${typed}`);
    await vi.waitFor(() => expect(worldData(world).changes.length).toBeGreaterThan(changesBefore), {
      timeout: WAIT_TIMEOUT_MS,
    });
  }
);

When(
  "外部から次のMarkdownに更新される:",
  async (world: QuickPickleWorldInterface, markdown: DocString) => {
    const state = worldData(world);
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(editorRoot(), {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    const loadedBefore = state.loaded.length;
    state.setExternal?.(markdown.toString());
    await vi.waitFor(() => expect(state.loaded.length).toBeGreaterThan(loadedBefore), {
      timeout: WAIT_TIMEOUT_MS,
    });
    // 通知後にDOMへ反映される分も拾うため、1フレーム待つ
    await new Promise((resolve) => requestAnimationFrame(resolve));
    state.domMutationsDuringUpdate = mutations + observer.takeRecords().length;
    observer.disconnect();
  }
);

Then("編集領域に{string}という文字は表示されない", (_world: unknown, text: string) => {
  expect(editorRoot().textContent).not.toContain(text);
});

Then("編集領域の先頭に水平線は表示されない", () => {
  expect(editorRoot().querySelector("hr")).toBeNull();
  expect(editorRoot().firstElementChild?.tagName).not.toBe("HR");
});

Then("編集領域の最初の見出しは{string}である", (_world: unknown, text: string) => {
  expect(editorHeadings()[0]?.textContent).toBe(text);
});

Then("アウトラインには次の項目だけが並んでいる:", (_world: unknown, table: DataTable) => {
  expect(outlineItems().map((item) => item.text)).toEqual(table.hashes().map((row) => row.text));
});

Then("アウトラインの項目が編集領域の見出しと同じ順序・同じ数・同じレベルで並んでいる", () => {
  const expected = editorHeadings().map((heading) => ({
    level: Number(heading.tagName.slice(1)),
    text: (heading.textContent ?? "").trim(),
  }));
  expect(expected.length).toBeGreaterThan(0);
  expect(outlineItems()).toEqual(expected);
});

Then(
  "読み込み完了の通知は、元のフロントマターと同じ文字列で始まる",
  (world: QuickPickleWorldInterface) => {
    expect(worldData(world).loaded[0].startsWith(originalFrontmatter(world))).toBe(true);
  }
);

// 変更通知は入力から遅れて届くため、最後の通知が期待どおりになるまで待って判定する
const CHANGE_NOTIFICATION_TIMEOUT_MS = 2_000;

Then(
  "最後の変更通知は、元のフロントマターと同じ文字列で始まる",
  async (world: QuickPickleWorldInterface) => {
    await expect
      .poll(() => worldData(world).changes.at(-1)?.startsWith(originalFrontmatter(world)), {
        timeout: CHANGE_NOTIFICATION_TIMEOUT_MS,
      })
      .toBe(true);
  }
);

Then(
  "最後の変更通知は、次の文字列で始まる:",
  async (world: QuickPickleWorldInterface, prefix: DocString) => {
    await expect
      .poll(() => worldData(world).changes.at(-1)?.startsWith(prefix.toString()), {
        timeout: CHANGE_NOTIFICATION_TIMEOUT_MS,
      })
      .toBe(true);
  }
);

Then(
  "最後の変更通知には{string}が含まれる",
  async (world: QuickPickleWorldInterface, text: string) => {
    await expect
      .poll(() => worldData(world).changes.at(-1), { timeout: CHANGE_NOTIFICATION_TIMEOUT_MS })
      .toContain(text);
  }
);

Then("編集領域の内容は置き換えられていない", (world: QuickPickleWorldInterface) => {
  expect(worldData(world).domMutationsDuringUpdate).toBe(0);
});

Then("編集領域の内容は置き換えられた", (world: QuickPickleWorldInterface) => {
  expect(worldData(world).domMutationsDuringUpdate).toBeGreaterThan(0);
});

Then("編集領域の見出し{string}だけがスクロール先になる", (_world: unknown, text: string) => {
  const targets = scrolledElements();
  expect(targets).toHaveLength(1);
  expect(targets[0]).toBe(editorHeadings().find((heading) => heading.textContent === text));
});

Then(
  "編集領域の{int}番目の見出し{string}だけがスクロール先になる",
  (_world: unknown, nth: number, text: string) => {
    const targets = scrolledElements();
    expect(targets).toHaveLength(1);
    const sameText = editorHeadings().filter((heading) => heading.textContent === text);
    expect(targets[0]).toBe(sameText[nth - 1]);
  }
);

Then("編集領域に{string}という文字は表示されている", (_world: unknown, text: string) => {
  expect(editorRoot().textContent).toContain(text);
});

Then(
  "読み込み完了の通知は、フロントマターの直後の空行と本文を含む",
  (world: QuickPickleWorldInterface) => {
    const expected = originalFrontmatter(world) + "\n# 本文の見出し\n";
    expect(worldData(world).loaded[0].startsWith(expected)).toBe(true);
  }
);

When("配色テーマが暗色に切り替わる", async (world: QuickPickleWorldInterface) => {
  const state = worldData(world);
  const loadedBefore = state.loaded.length;
  state.setTheme?.("dark");
  await vi.waitFor(() => expect(state.loaded.length).toBeGreaterThan(loadedBefore), {
    timeout: WAIT_TIMEOUT_MS,
  });
});

Then(
  "最後の読み込み完了の通知は、元のフロントマターで始まり、追記した本文を含む",
  (world: QuickPickleWorldInterface) => {
    const last = worldData(world).loaded.at(-1);
    expect(last?.startsWith(originalFrontmatter(world) + "\n# 本文の見出し")).toBe(true);
    expect(last).toContain("本文の段落を追記");
  }
);
