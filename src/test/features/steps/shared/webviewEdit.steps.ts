import { Given } from "@cucumber/cucumber";
import { handleMessage } from "../../../../editor/MessageHandler";
import { createWebviewMessageContext, findOpenDocument } from "./webviewMessageContext";

/**
 * 共通step: WebViewでの未保存の編集（D1 案A）。
 * WebViewからの更新メッセージ（update）を処理し、TextDocument に反映する。ファイルは保存しない。
 * 対象の文書は、開いている TextDocument からパスの末尾で探す（事前に開いておくこと）。
 */
Given(
  "WebView上で文書{string}を保存せずに次の内容へ編集した:",
  async function (name: string, content: string) {
    const document = findOpenDocument(name);
    await handleMessage(
      { type: "update", payload: content },
      createWebviewMessageContext(document)
    );
  }
);
