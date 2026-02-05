import { Message, PlantUmlResultMessage } from "@message/messageTypeToWebview";
import mermaid from "mermaid";
import { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import Markdown, { Components, defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  getMermaidThemeColors,
  MERMAID_THEME,
  SVG_COLOR_REPLACEMENTS,
  type ThemeKind,
} from "../../constants/themeColors";
import { LOCAL_FILE_SCHEME } from "../../utilities/imagePathConverter";
import { vscode } from "../../utilities/vscode";
import "./MarkdownViewer.css";

// 許可するURLスキーム（デフォルト + VSCode拡張機能用）
const ALLOWED_SCHEMES = [`${LOCAL_FILE_SCHEME}:`, "vscode-webview:"];

interface MarkdownViewerProps {
  value: string;
  theme: ThemeKind;
  baseUri?: string;
}

// PlantUML結果のコールバック管理
const plantUmlCallbacks = new Map<string, (svg: string | null, error?: string) => void>();

// PlantUML結果を処理する
function handlePlantUmlResult(requestId: string, svg?: string, error?: string): void {
  const callback = plantUmlCallbacks.get(requestId);
  if (callback) {
    callback(svg ?? null, error);
    plantUmlCallbacks.delete(requestId);
  }
}

// Mermaidダイアグラムコンポーネント
const MermaidDiagram: FC<{ code: string; theme: ThemeKind }> = ({ code, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "-");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mermaidTheme = MERMAID_THEME[theme];
    const themeColors = getMermaidThemeColors(theme);

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: "loose",
      htmlLabels: false,
      flowchart: {
        htmlLabels: false,
      },
      sequence: {
        actorFontFamily: "inherit",
        messageFontFamily: "inherit",
        noteFontFamily: "inherit",
      },
      themeVariables: themeColors,
    });

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

    plantUmlCallbacks.set(requestId, (svgResult, errorResult) => {
      if (svgResult) {
        setSvg(svgResult);
        setError(null);
      } else {
        setError(errorResult ?? "Unknown error");
        setSvg(null);
      }
    });

    vscode.postMessage({
      type: "renderPlantUml",
      payload: { code, requestId },
    });

    return () => {
      if (requestIdRef.current) {
        plantUmlCallbacks.delete(requestIdRef.current);
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

export const MarkdownViewer: FC<MarkdownViewerProps> = ({ value, theme, baseUri = "" }) => {
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

  // childrenを文字列に変換するヘルパー関数
  const childrenToString = (children: React.ReactNode): string => {
    if (typeof children === "string") {
      return children;
    }
    if (Array.isArray(children)) {
      return children.map(childrenToString).join("");
    }
    return "";
  };

  // カスタムコンポーネント
  const components: Components = {
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className ?? "");
      const language = match ? match[1] : "";
      const codeContent = childrenToString(children).replace(/\n$/, "");

      // Mermaidダイアグラム
      if (language === "mermaid") {
        return <MermaidDiagram code={codeContent} theme={theme} />;
      }

      // PlantUMLダイアグラム
      if (language === "plantuml") {
        return <PlantUmlDiagram code={codeContent} />;
      }

      // 通常のコードブロック
      if (className) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      // インラインコード
      return <code {...props}>{children}</code>;
    },
    img: ({ src, alt, ...props }) => {
      const resolvedSrc = resolveImagePath(src ?? "");
      return <img src={resolvedSrc} alt={alt ?? ""} {...props} />;
    },
  };

  return (
    <div className="markdown-viewer" data-theme={theme}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
        urlTransform={customUrlTransform}
      >
        {value}
      </Markdown>
    </div>
  );
};
