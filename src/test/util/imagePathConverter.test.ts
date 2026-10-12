import * as assert from "assert";
import * as path from "path";
import {
  convertPathsForDisplay,
  DisplayPathRegistry,
  isWithinRoots,
  LOCAL_FILE_SCHEME,
  type PathConversionEnv,
  restorePathsFromDisplay,
} from "../../util/imagePathConverter";

const posix = path.posix;

/** テスト用の環境: /work/docs の文書。存在するファイルは files で指定する */
function createEnv(files: string[], allowedRoots = ["/work/docs"]): PathConversionEnv {
  const existing = new Set(files);
  return {
    documentDir: "/work/docs",
    allowedRoots,
    toWebviewUri: (fsPath) =>
      `https://res.test${fsPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
    exists: (fsPath) => existing.has(fsPath),
    pathApi: posix,
  };
}

function roundTrip(markdown: string, env: PathConversionEnv) {
  const registry = new DisplayPathRegistry();
  const display = convertPathsForDisplay(markdown, env, registry);
  return { display, restored: restorePathsFromDisplay(display, env, registry), registry };
}

suite("imagePathConverter", () => {
  suite("convertPathsForDisplay", () => {
    test("文書ディレクトリ内の画像は表示用URIに変換されること", () => {
      const env = createEnv(["/work/docs/img.png"]);
      const { display } = roundTrip("![a](img.png)", env);
      assert.strictEqual(display, "![a](https://res.test/work/docs/img.png)");
    });

    test("title付きの画像はtitleを保持したまま変換されること", () => {
      const env = createEnv(["/work/docs/img.png"]);
      const { display } = roundTrip('![a](img.png "t")', env);
      assert.strictEqual(display, '![a](https://res.test/work/docs/img.png "t")');
    });

    test("山括弧で囲んだ空白を含むパスも変換されること", () => {
      const env = createEnv(["/work/docs/my image.png"]);
      const { display } = roundTrip("![a](<my image.png>)", env);
      assert.strictEqual(display, "![a](https://res.test/work/docs/my%20image.png)");
    });

    test("括弧を含むファイル名は括弧をエンコードして変換されること", () => {
      const env = createEnv(["/work/docs/shot (1).png"]);
      const { display } = roundTrip("![a](<shot (1).png>)", env);
      assert.strictEqual(display, "![a](https://res.test/work/docs/shot%20%281%29.png)");
    });

    test("許可したディレクトリの外にある画像は変換されないこと", () => {
      const env = createEnv(["/work/shared/out.png"]);
      const { display } = roundTrip("![a](../shared/out.png)", env);
      assert.strictEqual(display, "![a](../shared/out.png)");
    });

    test("ワークスペースフォルダとして許可したディレクトリの画像は変換されること", () => {
      const env = createEnv(["/work/shared/out.png"], ["/work/docs", "/work"]);
      const { display } = roundTrip("![a](../shared/out.png)", env);
      assert.strictEqual(display, "![a](https://res.test/work/shared/out.png)");
    });

    test("存在しないファイルやURLは変換されないこと", () => {
      const env = createEnv([]);
      const markdown = "![a](missing.png) ![b](https://example.com/x.png) [c](#anchor)";
      assert.strictEqual(roundTrip(markdown, env).display, markdown);
    });

    test("ローカルファイルへのリンクはカスタムスキームURIに変換され、アンカーは保持されること", () => {
      const env = createEnv(["/work/docs/other.md"]);
      const { display } = roundTrip("[x](./other.md#見出し)", env);
      assert.strictEqual(
        display,
        `[x](${LOCAL_FILE_SCHEME}:${encodeURIComponent("/work/docs/other.md")}#見出し)`
      );
    });

    test("コードブロック・インラインコード・フロントマターの中は変換されないこと", () => {
      const env = createEnv(["/work/docs/img.png", "/work/docs/other.md"]);
      const markdown = [
        "---",
        "image: ![a](img.png)",
        "---",
        "```",
        "![a](img.png)",
        "```",
        "~~~",
        "[x](other.md)",
        "~~~",
        "本文 `![a](img.png)` です",
      ].join("\n");
      assert.strictEqual(roundTrip(markdown, env).display, markdown);
    });

    test("同じファイルを指す別の表記には、別の表示用URIが割り当てられること", () => {
      const env = createEnv(["/work/docs/img.png"]);
      const { display } = roundTrip("![a](img.png)\n![b](./img.png)", env);
      const [first, second] = display.split("\n");
      assert.notStrictEqual(first.slice(4), second.slice(4));
    });
  });

  suite("restorePathsFromDisplay", () => {
    test("変換した文書を戻すと元の文字列に一致すること", () => {
      const env = createEnv([
        "/work/docs/img.png",
        "/work/docs/画像/図1.png",
        "/work/docs/other.md",
        "/work/docs/sub/child.md",
      ]);
      const markdown = [
        "![a](img.png)",
        "![b](./img.png)",
        "![図](画像/図1.png)",
        "[x](./other.md)",
        "[y](sub/../other.md)",
        "[z](./sub/child.md#見出し)",
      ].join("\n");
      assert.strictEqual(roundTrip(markdown, env).restored, markdown);
    });

    test("エディタが表示用URIを山括弧で囲んでも元の表記に戻ること", () => {
      const env = createEnv(["/work/docs/img.png"]);
      const { display, registry } = roundTrip("![a](./img.png)", env);
      const wrapped = display.replace("](", "](<").replace(/\)$/, ">)");
      assert.strictEqual(restorePathsFromDisplay(wrapped, env, registry), "![a](./img.png)");
    });

    test("登録されていない表示用URI（アップロードした画像）は相対パスに戻ること", () => {
      const env = createEnv([]);
      const registry = new DisplayPathRegistry();
      const markdown =
        "![a](https://res.test/work/docs/images/%E5%9B%B3.png)\n" +
        "![b](https://res.test/work/docs/images/my%20image.png)\n" +
        "![c](<https://res.test/work/docs/images/shot (1).png>)";
      assert.strictEqual(
        restorePathsFromDisplay(markdown, env, registry),
        "![a](images/図.png)\n![b](<images/my image.png>)\n![c](<images/shot (1).png>)"
      );
    });

    test("表示用URIを含まない文書はそのまま返ること", () => {
      const env = createEnv([]);
      const markdown = "# 見出し\n\n![a](img.png) [x](https://example.com)";
      assert.strictEqual(
        restorePathsFromDisplay(markdown, env, new DisplayPathRegistry()),
        markdown
      );
    });
  });

  suite("isWithinRoots", () => {
    test("許可したディレクトリの中なら true、外なら false を返すこと", () => {
      assert.strictEqual(isWithinRoots("/work/docs/a.png", ["/work/docs"], posix), true);
      assert.strictEqual(isWithinRoots("/work/a.png", ["/work/docs"], posix), false);
      assert.strictEqual(isWithinRoots("/work/docs2/a.png", ["/work/docs"], posix), false);
    });
  });
});
