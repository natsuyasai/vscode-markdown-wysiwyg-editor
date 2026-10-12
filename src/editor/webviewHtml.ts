export interface WebviewHtmlOptions {
  /** WebView の cspSource */
  cspSource: string;
  /** スタイルシートの URI */
  stylesUri: string;
  /** スクリプトの URI */
  scriptUri: string;
  /** スクリプトの実行を許可する nonce */
  nonce: string;
  /** html 要素の lang 属性（VS Code の表示言語） */
  lang: string;
}

export const WEBVIEW_TITLE = "Markdown Editor";

/**
 * エディタの WebView に読み込む HTML を生成する
 */
export function buildWebviewHtml(options: WebviewHtmlOptions): string {
  const { cspSource, stylesUri, scriptUri, nonce, lang } = options;
  return /*html*/ `
      <!DOCTYPE html>
      <html lang="${escapeAttribute(lang)}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data: blob: file: https:;">
          <link rel="stylesheet" type="text/css" href="${stylesUri}" />
          <title>${WEBVIEW_TITLE}</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
}

function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (char) => `&#${String(char.charCodeAt(0))};`);
}
