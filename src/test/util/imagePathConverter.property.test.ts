import * as assert from "assert";
import * as path from "path";
import fc from "fast-check";
import {
  convertPathsForDisplay,
  DisplayPathRegistry,
  type PathConversionEnv,
  restorePathsFromDisplay,
} from "../../util/imagePathConverter";
import {
  markdownDocumentArbitrary,
  markdownLineArbitrary,
  PROPERTY_FILES,
} from "./markdownArbitrary";

const posix = path.posix;

function createEnv(allowedRoots: readonly string[]): PathConversionEnv {
  const existing = new Set(PROPERTY_FILES);
  return {
    documentDir: "/work/docs",
    allowedRoots,
    toWebviewUri: (fsPath) =>
      `https://file+.vscode-resource.vscode-cdn.net${fsPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
    exists: (fsPath) => existing.has(fsPath),
    pathApi: posix,
  };
}

const rootsArbitrary = fc.constantFrom(["/work/docs"], ["/work/docs", "/work"]);

suite("imagePathConverter（プロパティ）", () => {
  test("どの文書でも、表示用に変換して元に戻すと元の文字列に一致すること", () => {
    fc.assert(
      fc.property(markdownDocumentArbitrary, rootsArbitrary, (markdown, roots) => {
        const env = createEnv(roots);
        const registry = new DisplayPathRegistry();
        const display = convertPathsForDisplay(markdown, env, registry);
        assert.strictEqual(restorePathsFromDisplay(display, env, registry), markdown);
      }),
      { numRuns: 300 }
    );
  });

  test("どの文書とどの1行の書き換えでも、書き換えた行以外は元の文字列に一致すること", () => {
    fc.assert(
      fc.property(
        markdownDocumentArbitrary,
        rootsArbitrary,
        fc.nat(),
        markdownLineArbitrary,
        (markdown, roots, lineSeed, replacement) => {
          const env = createEnv(roots);
          const registry = new DisplayPathRegistry();
          const displayLines = convertPathsForDisplay(markdown, env, registry).split("\n");
          const index = lineSeed % displayLines.length;
          displayLines[index] = replacement;

          const restoredLines = restorePathsFromDisplay(
            displayLines.join("\n"),
            env,
            registry
          ).split("\n");

          const originalLines = markdown.split("\n");
          assert.strictEqual(restoredLines.length, originalLines.length);
          originalLines.forEach((line, i) => {
            if (i !== index) {
              assert.strictEqual(restoredLines[i], line, `${String(i + 1)}行目が変化した`);
            }
          });
        }
      ),
      { numRuns: 300 }
    );
  });

  test("同じ対応表で変換を繰り返しても、元に戻すと元の文字列に一致すること", () => {
    fc.assert(
      fc.property(markdownDocumentArbitrary, markdownDocumentArbitrary, (first, second) => {
        const env = createEnv(["/work/docs", "/work"]);
        const registry = new DisplayPathRegistry();
        convertPathsForDisplay(first, env, registry);
        const display = convertPathsForDisplay(second, env, registry);
        assert.strictEqual(restorePathsFromDisplay(display, env, registry), second);
      }),
      { numRuns: 200 }
    );
  });
});
