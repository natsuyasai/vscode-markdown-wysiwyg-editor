import { OpenFileMessage } from "@message/messageTypeToExtention";
import { useEffect } from "react";
import { LOCAL_FILE_SCHEME, parseLocalFileUri } from "../utilities/imagePathConverter";
import { vscode } from "../utilities/vscode";

/**
 * リンククリック時の処理を行うカスタムフック
 * - アンカーリンクでスクロール
 * - カスタムスキームでファイルを開く
 */
export function useLinkHandler(): void {
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // アンカーリンク（#で始まる）の場合は対応する要素にスクロール
      if (href.startsWith("#")) {
        event.preventDefault();
        event.stopPropagation();

        const targetId = href.slice(1); // #を除去
        if (targetId) {
          scrollToHeading(targetId);
        }
        return;
      }

      // カスタムスキームのリンクをクリックした場合
      if (href.startsWith(`${LOCAL_FILE_SCHEME}:`)) {
        event.preventDefault();
        event.stopPropagation();

        const parsed = parseLocalFileUri(href);
        if (parsed) {
          vscode.postMessage({
            type: "openFile",
            payload: {
              filePath: parsed.filePath,
              anchor: parsed.anchor,
            },
          } satisfies OpenFileMessage);
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => {
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, []);
}

/**
 * 指定されたIDまたはテキストを持つ見出しにスクロールする
 */
function scrollToHeading(targetId: string): void {
  // IDを正規化（小文字、空白をハイフンに変換）
  const normalizedId = targetId.toLowerCase().replace(/\s+/g, "-");

  // 1. 完全一致でIDを検索
  let targetElement = document.getElementById(normalizedId);

  // 2. 見つからない場合は、見出し要素をテキスト内容で検索
  if (!targetElement) {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const heading of headings) {
      const headingText = heading.textContent?.toLowerCase().replace(/\s+/g, "-") ?? "";

      // テキスト内容を正規化したものが一致するか
      if (headingText === targetId) {
        targetElement = heading as HTMLElement;
        break;
      }
    }
  }

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
