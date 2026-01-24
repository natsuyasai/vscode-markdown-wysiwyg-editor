import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MermaidRenderer.module.scss";

type ThemeKind = "light" | "dark";

interface MermaidRendererProps {
  code: string;
  id: string;
  theme?: ThemeKind;
  onEdit?: () => void;
}

/**
 * Mermaidコードを図としてレンダリングするコンポーネント
 */
export function MermaidRenderer({ code, id, theme = "light", onEdit }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderMermaid = useCallback(async () => {
    try {
      // テーマに応じたMermaidテーマを選択
      const mermaidTheme = theme === "dark" ? "dark" : "default";

      // Mermaidを初期化
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "loose",
      });

      // SVGをレンダリング
      const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, code);
      setSvg(renderedSvg);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Mermaid rendering failed";
      setError(errorMessage);
      setSvg("");
    }
  }, [code, id, theme]);

  useEffect(() => {
    void renderMermaid();
  }, [renderMermaid]);

  const handleClick = useCallback(() => {
    if (onEdit) {
      onEdit();
    }
  }, [onEdit]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  if (error) {
    return (
      <div
        className={styles.error}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <span className={styles.errorLabel}>Mermaid Error:</span>
        <pre className={styles.errorMessage}>{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
