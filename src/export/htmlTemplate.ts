export function generateHtmlDocument(
  content: string,
  title: string,
  theme: "light" | "dark",
  customCss?: string
): string {
  const styles = getStyles(theme);
  const customCssBlock = customCss ? `\n  <style>\n${customCss}\n  </style>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${styles}
  </style>${customCssBlock}
</head>
<body class="${theme}">
  <article class="markdown-body">
${content}
  </article>
</body>
</html>`;
}

export function generateScopedHtmlDocument(
  content: string,
  title: string,
  theme: "light" | "dark",
  useShadowDom: boolean,
  customCss?: string
): string {
  if (useShadowDom) {
    return generateShadowDomHtml(content, title, theme, customCss);
  }
  return generateCssScopedHtml(content, title, theme, customCss);
}

function generateCssScopedHtml(
  content: string,
  title: string,
  theme: "light" | "dark",
  customCss?: string
): string {
  const styles = getScopedStyles(theme);
  const customCssBlock = customCss ? `\n  <style>\n${customCss}\n  </style>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${styles}
  </style>${customCssBlock}
</head>
<body>
  <div class="mwe-content">
    <article class="markdown-body">
${content}
    </article>
  </div>
</body>
</html>`;
}

function generateShadowDomHtml(
  content: string,
  title: string,
  theme: "light" | "dark",
  customCss?: string
): string {
  const styles = getShadowDomStyles(theme);
  const customCssBlock = customCss ? `\n    <style>\n${customCss}\n    </style>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="mwe-shadow-host"></div>
  <template id="mwe-template">
    <style>
${styles}
    </style>${customCssBlock}
    <article class="markdown-body">
${content}
    </article>
  </template>
  <script>
    const host = document.getElementById('mwe-shadow-host');
    const shadow = host.attachShadow({ mode: 'open' });
    const template = document.getElementById('mwe-template');
    shadow.appendChild(template.content.cloneNode(true));
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ThemeColors {
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  codeBackground: string;
  blockquoteBackground: string;
  blockquoteBorder: string;
  linkColor: string;
  headingColor: string;
  tableHeaderBackground: string;
  tableRowEvenBackground: string;
}

function getThemeColors(theme: "light" | "dark"): ThemeColors {
  return theme === "dark"
    ? {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        mutedForeground: "#808080",
        border: "#3c3c3c",
        codeBackground: "#2d2d2d",
        blockquoteBackground: "#252526",
        blockquoteBorder: "#007acc",
        linkColor: "#3794ff",
        headingColor: "#ffffff",
        tableHeaderBackground: "#2d2d2d",
        tableRowEvenBackground: "#252526",
      }
    : {
        background: "#ffffff",
        foreground: "#24292e",
        mutedForeground: "#6a737d",
        border: "#e1e4e8",
        codeBackground: "#f6f8fa",
        blockquoteBackground: "#f6f8fa",
        blockquoteBorder: "#0366d6",
        linkColor: "#0366d6",
        headingColor: "#24292e",
        tableHeaderBackground: "#f6f8fa",
        tableRowEvenBackground: "#f6f8fa",
      };
}

function getStyles(theme: "light" | "dark"): string {
  const colors = getThemeColors(theme);

  return `
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: ${colors.background};
      color: ${colors.foreground};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 16px;
      line-height: 1.6;
    }

    .markdown-body {
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }

    @media (max-width: 767px) {
      .markdown-body {
        padding: 15px;
      }
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: ${colors.headingColor};
    }

    h1 {
      font-size: 2em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid ${colors.border};
    }

    h2 {
      font-size: 1.5em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid ${colors.border};
    }

    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: ${colors.mutedForeground}; }

    /* Paragraphs */
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }

    /* Links */
    a {
      color: ${colors.linkColor};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 2em;
    }

    li {
      margin-top: 0.25em;
    }

    li + li {
      margin-top: 0.25em;
    }

    /* Task lists */
    ul.task-list {
      list-style-type: none;
      padding-left: 0;
    }

    .task-list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
    }

    .task-list-item input[type="checkbox"] {
      margin-top: 0.3em;
    }

    /* Blockquotes */
    blockquote {
      margin: 0 0 16px 0;
      padding: 0 1em;
      color: ${colors.mutedForeground};
      border-left: 0.25em solid ${colors.blockquoteBorder};
      background-color: ${colors.blockquoteBackground};
    }

    blockquote > :first-child {
      margin-top: 0;
    }

    blockquote > :last-child {
      margin-bottom: 0;
    }

    /* Code */
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: ${colors.codeBackground};
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    }

    pre {
      margin-top: 0;
      margin-bottom: 16px;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: ${colors.codeBackground};
      border-radius: 6px;
    }

    pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      background-color: transparent;
      border-radius: 0;
    }

    /* Tables */
    table {
      border-spacing: 0;
      border-collapse: collapse;
      margin-top: 0;
      margin-bottom: 16px;
      width: max-content;
      max-width: 100%;
      overflow: auto;
    }

    th, td {
      padding: 6px 13px;
      border: 1px solid ${colors.border};
    }

    th {
      font-weight: 600;
      background-color: ${colors.tableHeaderBackground};
    }

    tr:nth-child(even) {
      background-color: ${colors.tableRowEvenBackground};
    }

    /* Horizontal rules */
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: ${colors.border};
      border: 0;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      box-sizing: content-box;
    }

    /* Strong and emphasis */
    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    del {
      text-decoration: line-through;
    }

    /* Details/Summary */
    details {
      margin-bottom: 16px;
    }

    summary {
      cursor: pointer;
      font-weight: 600;
    }

    details[open] summary {
      margin-bottom: 8px;
    }

    /* Print styles */
    @media print {
      body {
        background-color: white;
        color: black;
      }

      .markdown-body {
        max-width: none;
        padding: 20px;
      }

      pre, code {
        background-color: #f6f8fa;
      }

      a {
        color: #0366d6;
      }
    }
  `;
}

function getElementStyles(colors: ThemeColors): string {
  return `
    .markdown-body {
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }

    @media (max-width: 767px) {
      .markdown-body {
        padding: 15px;
      }
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: ${colors.headingColor};
    }

    h1 {
      font-size: 2em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid ${colors.border};
    }

    h2 {
      font-size: 1.5em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid ${colors.border};
    }

    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: ${colors.mutedForeground}; }

    /* Paragraphs */
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }

    /* Links */
    a {
      color: ${colors.linkColor};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 2em;
    }

    li {
      margin-top: 0.25em;
    }

    li + li {
      margin-top: 0.25em;
    }

    /* Task lists */
    ul.task-list {
      list-style-type: none;
      padding-left: 0;
    }

    .task-list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
    }

    .task-list-item input[type="checkbox"] {
      margin-top: 0.3em;
    }

    /* Blockquotes */
    blockquote {
      margin: 0 0 16px 0;
      padding: 0 1em;
      color: ${colors.mutedForeground};
      border-left: 0.25em solid ${colors.blockquoteBorder};
      background-color: ${colors.blockquoteBackground};
    }

    blockquote > :first-child {
      margin-top: 0;
    }

    blockquote > :last-child {
      margin-bottom: 0;
    }

    /* Code */
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: ${colors.codeBackground};
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    }

    pre {
      margin-top: 0;
      margin-bottom: 16px;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: ${colors.codeBackground};
      border-radius: 6px;
    }

    pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      background-color: transparent;
      border-radius: 0;
    }

    /* Tables */
    table {
      border-spacing: 0;
      border-collapse: collapse;
      margin-top: 0;
      margin-bottom: 16px;
      width: max-content;
      max-width: 100%;
      overflow: auto;
    }

    th, td {
      padding: 6px 13px;
      border: 1px solid ${colors.border};
    }

    th {
      font-weight: 600;
      background-color: ${colors.tableHeaderBackground};
    }

    tr:nth-child(even) {
      background-color: ${colors.tableRowEvenBackground};
    }

    /* Horizontal rules */
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: ${colors.border};
      border: 0;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      box-sizing: content-box;
    }

    /* Strong and emphasis */
    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    del {
      text-decoration: line-through;
    }

    /* Details/Summary */
    details {
      margin-bottom: 16px;
    }

    summary {
      cursor: pointer;
      font-weight: 600;
    }

    details[open] summary {
      margin-bottom: 8px;
    }

    /* Print styles */
    @media print {
      .markdown-body {
        max-width: none;
        padding: 20px;
      }

      pre, code {
        background-color: #f6f8fa;
      }

      a {
        color: #0366d6;
      }
    }
  `;
}

function getScopedStyles(theme: "light" | "dark"): string {
  const colors = getThemeColors(theme);
  const elementStyles = getElementStyles(colors);

  // .mwe-content 配下にすべてのセレクタをスコープ化
  const scopedElementStyles = scopeSelectors(elementStyles, ".mwe-content");

  return `
    .mwe-content {
      all: initial;
      box-sizing: border-box;
      display: block;
      background-color: ${colors.background};
      color: ${colors.foreground};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 16px;
      line-height: 1.6;
    }

    .mwe-content *, .mwe-content *::before, .mwe-content *::after {
      box-sizing: border-box;
    }
${scopedElementStyles}`;
}

function getShadowDomStyles(theme: "light" | "dark"): string {
  const colors = getThemeColors(theme);
  const elementStyles = getElementStyles(colors);

  return `
      :host {
        all: initial;
        display: block;
        box-sizing: border-box;
        background-color: ${colors.background};
        color: ${colors.foreground};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
        font-size: 16px;
        line-height: 1.6;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }
${elementStyles}`;
}

/**
 * CSSセレクタをスコープ化する。
 * 各ルールのセレクタに指定されたプレフィックスを付加する。
 * @mediaルール内のセレクタも再帰的に処理する。
 */
function scopeSelectors(css: string, prefix: string): string {
  return css.replace(/([^{}@/]+)\{/g, (_match: string, selectors: string) => {
    const scoped = selectors
      .split(",")
      .map((selector) => {
        const trimmed = selector.trim();
        if (trimmed === "" || trimmed.startsWith("/*")) {
          return selector;
        }
        return `${prefix} ${trimmed}`;
      })
      .join(", ");
    return `${scoped} {`;
  });
}
