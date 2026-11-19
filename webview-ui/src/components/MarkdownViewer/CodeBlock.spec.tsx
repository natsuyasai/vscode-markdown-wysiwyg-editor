import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./CodeBlock";

/**
 * 特性テスト（characterization test）。
 * highlight.jsの更新でReadonly表示のハイライト結果が変わらないことを確認する。
 * 期待値は現行（highlight.js 11.11）の出力を固定したもの。
 */
describe("CodeBlock: highlight.jsの出力（特性）", () => {
  it("JavaScriptのコードが既知のハイライト結果になること", () => {
    const { container } = render(
      <CodeBlock code={'const x = "a"; // c'} initialLanguage="javascript" />
    );

    const code = container.querySelector("pre code");
    expect(code?.className).toBe("hljs language-javascript");
    expect(code?.innerHTML).toBe(
      '<span class="hljs-keyword">const</span> x = <span class="hljs-string">"a"</span>; <span class="hljs-comment">// c</span>'
    );
  });

  it("Pythonのコードが既知のハイライト結果になること", () => {
    const { container } = render(
      <CodeBlock code={"def f(n):\n    return n + 1"} initialLanguage="python" />
    );

    const code = container.querySelector("pre code");
    expect(code?.className).toBe("hljs language-python");
    expect(code?.innerHTML).toBe(
      '<span class="hljs-keyword">def</span> <span class="hljs-title function_">f</span>(<span class="hljs-params">n</span>):\n    <span class="hljs-keyword">return</span> n + <span class="hljs-number">1</span>'
    );
  });

  it("highlight.jsに未登録の言語は、ハイライトせずにそのまま表示し、言語の選択肢に残すこと", () => {
    const { container, getByRole } = render(
      <CodeBlock code={"const x = 1;"} initialLanguage="foolang" />
    );

    const code = container.querySelector("pre code");
    expect(code?.className).toBe("");
    expect(code?.innerHTML).toBe("const x = 1;");
    const select = getByRole("combobox", { name: "コード言語" });
    expect(select).toHaveValue("foolang");
  });
});
