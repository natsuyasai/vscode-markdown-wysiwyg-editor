import { describe, it, expect } from "vitest";
import {
  LOCAL_FILE_SCHEME,
  parseLocalFileUri,
  removeBlobImageReferences,
  revertAllPathsFromWebviewUri,
  revertHtmlImagePathsFromWebviewUri,
  revertImagePathsFromWebviewUri,
  revertLinkPathsFromLocalFileUri,
} from "../../src/utilities/imagePathConverter";

describe("revertImagePathsFromWebviewUri", () => {
  const baseUri = "vscode-webview://abc123/path/to/dir";

  it("WebView URIの画像パスを相対パスに戻す", () => {
    const markdown = `![alt](${baseUri}/image.png)`;
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe("![alt](image.png)");
  });

  it("複数の画像パスを変換する", () => {
    const markdown = `![img1](${baseUri}/image1.png)\n![img2](${baseUri}/subdir/image2.jpg)`;
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe("![img1](image1.png)\n![img2](subdir/image2.jpg)");
  });

  it("baseUriが空の場合は変換しない", () => {
    const markdown = `![alt](${baseUri}/image.png)`;
    const result = revertImagePathsFromWebviewUri(markdown, "");
    expect(result).toBe(markdown);
  });

  it("HTTPSのURLは変換しない", () => {
    const markdown = "![alt](https://example.com/image.png)";
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe(markdown);
  });

  it("data URIは変換しない", () => {
    const markdown = "![alt](data:image/png;base64,abc123)";
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe(markdown);
  });

  it("異なるbaseUriのパスは変換しない", () => {
    const markdown = "![alt](vscode-webview://different/path/image.png)";
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe(markdown);
  });

  it("baseUriに末尾スラッシュがない場合も正しく動作する", () => {
    const baseUriNoSlash = "vscode-webview://abc123/path/to/dir";
    const markdown = `![alt](${baseUriNoSlash}/image.png)`;
    const result = revertImagePathsFromWebviewUri(markdown, baseUriNoSlash);
    expect(result).toBe("![alt](image.png)");
  });

  it("baseUriに末尾スラッシュがある場合も正しく動作する", () => {
    const baseUriWithSlash = "vscode-webview://abc123/path/to/dir/";
    const markdown = `![alt](${baseUriWithSlash}image.png)`;
    const result = revertImagePathsFromWebviewUri(markdown, baseUriWithSlash);
    expect(result).toBe("![alt](image.png)");
  });

  it("altテキストが空でも動作する", () => {
    const markdown = `![](${baseUri}/image.png)`;
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe("![](image.png)");
  });

  it("通常のテキストは変換しない", () => {
    const markdown = "This is some text without images.";
    const result = revertImagePathsFromWebviewUri(markdown, baseUri);
    expect(result).toBe(markdown);
  });
});

describe("revertHtmlImagePathsFromWebviewUri", () => {
  const baseUri = "vscode-webview://abc123/path/to/dir";

  it("HTML内のWebView URIの画像パスを相対パスに戻す", () => {
    const html = `<img src="${baseUri}/image.png">`;
    const result = revertHtmlImagePathsFromWebviewUri(html, baseUri);
    expect(result).toBe('<img src="image.png">');
  });

  it("属性が他にある場合も正しく変換する", () => {
    const html = `<img alt="test" src="${baseUri}/image.png" width="100">`;
    const result = revertHtmlImagePathsFromWebviewUri(html, baseUri);
    expect(result).toBe('<img alt="test" src="image.png" width="100">');
  });

  it("baseUriが空の場合は変換しない", () => {
    const html = `<img src="${baseUri}/image.png">`;
    const result = revertHtmlImagePathsFromWebviewUri(html, "");
    expect(result).toBe(html);
  });

  it("HTTPSのURLは変換しない", () => {
    const html = '<img src="https://example.com/image.png">';
    const result = revertHtmlImagePathsFromWebviewUri(html, baseUri);
    expect(result).toBe(html);
  });

  it("シングルクォートも対応する", () => {
    const html = `<img src='${baseUri}/image.png'>`;
    const result = revertHtmlImagePathsFromWebviewUri(html, baseUri);
    expect(result).toBe("<img src='image.png'>");
  });
});

describe("revertLinkPathsFromLocalFileUri", () => {
  const documentDir = "/home/user/docs";

  it("カスタムスキームのリンクパスを相対パスに戻す", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/other.md");
    const markdown = `[link](${LOCAL_FILE_SCHEME}:${encodedPath})`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe("[link](other.md)");
  });

  it("サブディレクトリのファイルリンクを変換する", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/subdir/file.md");
    const markdown = `[link](${LOCAL_FILE_SCHEME}:${encodedPath})`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe("[link](subdir/file.md)");
  });

  it("親ディレクトリのファイルリンクを変換する", () => {
    const encodedPath = encodeURIComponent("/home/user/other.md");
    const markdown = `[link](${LOCAL_FILE_SCHEME}:${encodedPath})`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe("[link](../other.md)");
  });

  it("アンカー付きリンクを正しく変換する", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/other.md");
    const markdown = `[link](${LOCAL_FILE_SCHEME}:${encodedPath}#section)`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe("[link](other.md#section)");
  });

  it("複数のリンクを変換する", () => {
    const encodedPath1 = encodeURIComponent("/home/user/docs/file1.md");
    const encodedPath2 = encodeURIComponent("/home/user/docs/file2.md");
    const markdown = `[link1](${LOCAL_FILE_SCHEME}:${encodedPath1})\n[link2](${LOCAL_FILE_SCHEME}:${encodedPath2})`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe("[link1](file1.md)\n[link2](file2.md)");
  });

  it("HTTPSのURLは変換しない", () => {
    const markdown = "[link](https://example.com)";
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe(markdown);
  });

  it("アンカーリンクは変換しない", () => {
    const markdown = "[link](#section)";
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    expect(result).toBe(markdown);
  });

  it("画像リンクは変換しない", () => {
    const encodedPath = encodeURIComponent("/home/user/docs/image.png");
    const markdown = `![image](${LOCAL_FILE_SCHEME}:${encodedPath})`;
    const result = revertLinkPathsFromLocalFileUri(markdown, documentDir);
    // 画像リンクは別の関数で処理するため、ここでは変換されない
    expect(result).toBe(markdown);
  });
});

describe("parseLocalFileUri", () => {
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

describe("revertAllPathsFromWebviewUri", () => {
  const baseUri = "vscode-webview://abc123/path/to/dir";
  const documentDir = "/path/to/dir";

  it("画像パスとリンクパスの両方を変換する", () => {
    const encodedLinkPath = encodeURIComponent("/path/to/dir/other.md");
    const markdown = `![image](${baseUri}/image.png)\n[link](${LOCAL_FILE_SCHEME}:${encodedLinkPath})`;
    const result = revertAllPathsFromWebviewUri(markdown, baseUri, documentDir);
    expect(result).toBe("![image](image.png)\n[link](other.md)");
  });

  it("blob URLの画像参照が除去されること", () => {
    const markdown = "![image](blob:vscode-webview://abc123/uuid)\n![normal](image.png)";
    const result = revertAllPathsFromWebviewUri(markdown, baseUri, documentDir);
    expect(result).toBe("![normal](image.png)");
  });
});
