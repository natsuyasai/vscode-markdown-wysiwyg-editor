import { describe, it, expect } from "vitest";
import {
  LOCAL_FILE_SCHEME,
  parseLocalFileUri,
  removeBlobImageReferences,
} from "@/utilities/imagePathConverter";

describe("parseLocalFileUri", () => {
  it("同じファイルの別表記を区別するクエリは取り除いてパースする", () => {
    const uri = `${LOCAL_FILE_SCHEME}:${encodeURIComponent("/work/a.md")}?wysiwyg-variant=2#sec`;
    expect(parseLocalFileUri(uri)).toEqual({ filePath: "/work/a.md", anchor: "#sec" });
  });

  it("カスタムスキームURIをパースする", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/file.md");
    const uri = `${LOCAL_FILE_SCHEME}:${encodedPath}`;
    const result = parseLocalFileUri(uri);
    expect(result).toEqual({
      filePath: "/home/user/docs/file.md",
      anchor: undefined,
    });
  });

  it("アンカー付きURIをパースする", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/file.md");
    const uri = `${LOCAL_FILE_SCHEME}:${encodedPath}#section`;
    const result = parseLocalFileUri(uri);
    expect(result).toEqual({
      filePath: "/home/user/docs/file.md",
      anchor: "#section",
    });
  });

  it("無効なスキームの場合はnullを返す", () => {
    const result = parseLocalFileUri("https://example.com");
    expect(result).toBeNull();
  });

  it("空文字の場合はnullを返す", () => {
    const result = parseLocalFileUri("");
    expect(result).toBeNull();
  });
});

describe("removeBlobImageReferences", () => {
  it("blob URLの画像参照を除去する", () => {
    const markdown = "# Title\n![image](blob:vscode-webview://abc123/uuid)\nSome text";
    const result = removeBlobImageReferences(markdown);
    expect(result).toBe("# Title\nSome text");
  });

  it("通常の画像参照は除去しない", () => {
    const markdown = "![image](images/test.png)";
    const result = removeBlobImageReferences(markdown);
    expect(result).toBe(markdown);
  });

  it("WebView URI形式の画像参照は除去しない", () => {
    const markdown = "![image](vscode-webview://abc123/path/image.png)";
    const result = removeBlobImageReferences(markdown);
    expect(result).toBe(markdown);
  });

  it("複数のblob URL画像参照を除去する", () => {
    const markdown = "![img1](blob:vscode-webview://a/1)\n![img2](blob:vscode-webview://b/2)\n";
    const result = removeBlobImageReferences(markdown);
    expect(result).toBe("");
  });
});
