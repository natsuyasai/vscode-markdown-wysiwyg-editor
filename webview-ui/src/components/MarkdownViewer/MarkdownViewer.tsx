import { Message, PlantUmlResultMessage } from "@message/messageTypeToWebview";
import type { Element, ElementContent } from "hast";
import mermaid from "mermaid";
import { FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Markdown, { Components, defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { SVG_COLOR_REPLACEMENTS, type ThemeKind } from "../../constants/themeColors";
import { extractHeadings } from "../../utilities/extractHeadings";
import { LOCAL_FILE_SCHEME } from "../../utilities/imagePathConverter";
import { initializeMermaid } from "../../utilities/mermaidInitializer";
import { parseFrontmatter } from "../../utilities/parseFrontmatter";
import {
  PLANTUML_RESPONSE_TIMEOUT_MS,
  PLANTUML_TIMEOUT_MESSAGE,
  PlantUmlCallbackManager,
} from "../../utilities/plantUmlCallbackManager";
import { remarkHeadingIds } from "../../utilities/remarkHeadingIds";
import { vscode } from "../../utilities/vscode";
import { OutlineSidebar } from "../OutlineSidebar";
import { CodeBlock } from "./CodeBlock";
import { FrontmatterTable } from "./FrontmatterTable";
import "./MarkdownViewer.css";

// 許可するURLスキーム（デフォルト + VSCode拡張機能用）
const ALLOWED_SCHEMES = [`${LOCAL_FILE_SCHEME}:`, "vscode-webview:"];

interface MarkdownViewerProps {
  value: string;
  theme: ThemeKind;
  baseUri?: string;
}

// PlantUML結果のコールバック管理
const plantUmlCallbackManager = new PlantUmlCallbackManager<
  (svg: string | null, error?: string) => void
>();

// PlantUML結果を処理する
function handlePlantUmlResult(requestId: string, svg?: string, error?: string): void {
  const callback = plantUmlCallbackManager.resolve(requestId);
  if (callback) {
    callback(svg ?? null, error);
  }
}

// Mermaidダイアグラムコンポーネント
const MermaidDiagram: FC<{ code: string; theme: ThemeKind }> = ({ code, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "-");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    initializeMermaid(theme);

    const tempContainer = document.createElement("div");
    tempContainer.id = `mermaid-container-${uniqueId}`;
    tempContainer.style.cssText = "position: absolute; left: -9999px; visibility: hidden;";
    document.body.appendChild(tempContainer);

    mermaid
      .render(`mermaid-${uniqueId}`, code, tempContainer)
      .then(({ svg }) => {
        tempContainer.remove();

        let processedSvg = svg;
        if (theme === "dark") {
          for (const { from, to } of SVG_COLOR_REPLACEMENTS) {
            processedSvg = processedSvg.replace(from, to);
          }
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = processedSvg;
        }
        setError(null);
      })
      .catch((err: Error) => {
        tempContainer.remove();
        setError(err.message);
      });
  }, [code, theme, uniqueId]);

  if (error) {
    return <div className="markdown-viewer-error">Mermaid Error: {error}</div>;
  }

  return <div ref={containerRef} className="markdown-viewer-diagram" />;
};

// PlantUMLダイアグラムコンポーネント
const PlantUmlDiagram: FC<{ code: string }> = ({ code }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    const requestId = `plantuml-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    requestIdRef.current = requestId;

    plantUmlCallbackManager.register(
      requestId,
      (svgResult, errorResult) => {
        if (svgResult) {
          setSvg(svgResult);
          setError(null);
        } else {
          setError(errorResult ?? "Unknown error");
          setSvg(null);
        }
      },
      {
        timeoutMs: PLANTUML_RESPONSE_TIMEOUT_MS,
        onTimeout: () => {
          setError(PLANTUML_TIMEOUT_MESSAGE);
          setSvg(null);
        },
      }
    );

    vscode.postMessage({
      type: "renderPlantUml",
      payload: { code, requestId },
    });

    return () => {
      if (requestIdRef.current) {
        plantUmlCallbackManager.unregister(requestIdRef.current);
      }
    };
  }, [code]);

  if (error) {
    return <div className="markdown-viewer-error">PlantUML Error: {error}</div>;
  }

  if (!svg) {
    return <div className="markdown-viewer-loading">Loading PlantUML diagram...</div>;
  }

  return <div className="markdown-viewer-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
};

/**
 * URLスキームの許可判定を含むカスタムurlTransform
 * デフォルトのurlTransformに加えて、vscode-local-file:とvscode-webview:スキームを許可
 */
function customUrlTransform(url: string): string {
  for (const scheme of ALLOWED_SCHEMES) {
    if (url.startsWith(scheme)) {
      return url;
    }
  }
  return defaultUrlTransform(url);
}

// hastノードからテキストを再帰的に抽出するヘルパー関数
function hastToText(node: ElementContent): string {
  if (node.type === "text") {
    return node.value;
  }
  if (node.type === "element") {
    return node.children.map(hastToText).join("");
  }
  return "";
}

export const MarkdownViewer: FC<MarkdownViewerProps> = ({ value, theme, baseUri = "" }) => {
  // YAMLフロントマターの分離
  const { frontmatter, content } = useMemo(() => parseFrontmatter(value), [value]);

  // 見出し抽出（フロントマターの"---"がノイズにならないようcontentを使う）
  const headings = useMemo(() => extractHeadings(content), [content]);

  // コンテンツ領域のref
  const contentRef = useRef<HTMLDivElement>(null);

  // スクロールハンドラ
  const handleHeadingClick = useCallback((id: string) => {
    const element = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // PlantUML結果のメッセージハンドラ
  const handleExtensionMessage = useCallback((event: MessageEvent<Message>) => {
    const message = event.data;
    if (message.type === "plantUmlResult") {
      const result = message as PlantUmlResultMessage;
      handlePlantUmlResult(result.payload.requestId, result.payload.svg, result.payload.error);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleExtensionMessage);
    return () => {
      window.removeEventListener("message", handleExtensionMessage);
    };
  }, [handleExtensionMessage]);

  // 画像パスを解決する
  const resolveImagePath = useCallback(
    (src: string): string => {
      if (!src) return src;
      // 外部URL、data URL、vscode-webviewスキーム等はそのまま
      if (
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:") ||
        src.startsWith("vscode-webview:")
      ) {
        return src;
      }
      // 相対パスの場合はbaseUriで解決
      if (baseUri && !src.startsWith("/")) {
        const normalizedBaseUri = baseUri.endsWith("/") ? baseUri : `${baseUri}/`;
        return `${normalizedBaseUri}${src}`;
      }
      return src;
    },
    [baseUri]
  );

  // カスタムコンポーネント（resolveImagePathとthemeが変わった時のみ再生成）
  const components: Components = useMemo(() => {
    return {
      pre: ({ node, children, ...props }) => {
        const codeNode = node?.children.find(
          (child): child is Element => child.type === "element" && child.tagName === "code"
        );
        if (!codeNode) {
          return <pre {...props}>{children}</pre>;
        }

        const className = Array.isArray(codeNode.properties.className)
          ? codeNode.properties.className.join(" ")
          : "";
        const match = /language-(\w+)/.exec(className);
        const language = match ? match[1] : "";
        const codeContent = codeNode.children.map(hastToText).join("").replace(/\n$/, "");

        // Mermaidダイアグラム
        if (language === "mermaid") {
          return <MermaidDiagram code={codeContent} theme={theme} />;
        }

        // PlantUMLダイアグラム
        if (language === "plantuml") {
          return <PlantUmlDiagram code={codeContent} />;
        }

        // 通常のコードブロック（言語セレクタ付き）
        return <CodeBlock code={codeContent} initialLanguage={language} />;
      },
      img: ({ src, alt, ...props }) => {
        const resolvedSrc = resolveImagePath(src ?? "");
        return <img src={resolvedSrc} alt={alt ?? ""} {...props} />;
      },
    };
  }, [resolveImagePath, theme]);

  return (
    <div className="markdown-viewer-wrapper">
      <div className="markdown-viewer" data-theme={theme} ref={contentRef}>
        {frontmatter && <FrontmatterTable data={frontmatter} />}
        <Markdown
          remarkPlugins={[remarkGfm, remarkHeadingIds]}
          rehypePlugins={[rehypeRaw]}
          components={components}
          urlTransform={customUrlTransform}
        >
          {content}
        </Markdown>
      </div>
      <OutlineSidebar headings={headings} onHeadingClick={handleHeadingClick} theme={theme} />
    </div>
  );
};
