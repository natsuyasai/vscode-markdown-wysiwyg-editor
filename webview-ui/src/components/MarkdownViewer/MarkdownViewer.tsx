import { Message, PlantUmlResultMessage } from "@message/messageTypeToWebview";
import mermaid from "mermaid";
import { FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Markdown, { Components, defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { SVG_COLOR_REPLACEMENTS, type ThemeKind } from "../../constants/themeColors";
import { extractHeadings, generateHeadingId } from "../../utilities/extractHeadings";
import { LOCAL_FILE_SCHEME } from "../../utilities/imagePathConverter";
import { initializeMermaid } from "../../utilities/mermaidInitializer";
import { PlantUmlCallbackManager } from "../../utilities/plantUmlCallbackManager";
import { vscode } from "../../utilities/vscode";
import { OutlineSidebar } from "../OutlineSidebar";
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

    plantUmlCallbackManager.register(requestId, (svgResult, errorResult) => {
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

// childrenを文字列に変換するヘルパー関数（純粋関数のためモジュールレベルに配置）
function childrenToString(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(childrenToString).join("");
  }
  return "";
}

export const MarkdownViewer: FC<MarkdownViewerProps> = ({ value, theme, baseUri = "" }) => {
  // 見出し抽出
  const headings = useMemo(() => extractHeadings(value), [value]);

  // コンテンツ領域のref
  const contentRef = useRef<HTMLDivElement>(null);

  // 重複ID管理用（レンダリングごとにリセット）
  const idCountsRef = useRef(new Map<string, number>());

  // レンダリングのたびにリセット（valueが変わった時もIDが正しくリセットされるよう、useMemo外に配置）
  idCountsRef.current = new Map<string, number>();

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
    const createHeadingComponent = (level: number) => {
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const HeadingComponent = ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = childrenToString(children);
        const baseId = generateHeadingId(text);
        const count = idCountsRef.current.get(baseId) ?? 0;
        const id = count > 0 ? `${baseId}-${count}` : baseId;
        idCountsRef.current.set(baseId, count + 1);
        return (
          <HeadingTag id={id} {...props}>
            {children}
          </HeadingTag>
        );
      };
      HeadingComponent.displayName = `Heading${level}`;
      return HeadingComponent;
    };

    return {
      h1: createHeadingComponent(1),
      h2: createHeadingComponent(2),
      h3: createHeadingComponent(3),
      h4: createHeadingComponent(4),
      h5: createHeadingComponent(5),
      h6: createHeadingComponent(6),
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
  }, [resolveImagePath, theme]);

  return (
    <div className="markdown-viewer-wrapper">
      <OutlineSidebar headings={headings} onHeadingClick={handleHeadingClick} />
      <div className="markdown-viewer" data-theme={theme} ref={contentRef}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
          urlTransform={customUrlTransform}
        >
          {value}
        </Markdown>
      </div>
    </div>
  );
};
