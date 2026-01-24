import { RenderPlantUmlMessage } from "@message/messageTypeToExtention";
import { Message, PlantUmlResultMessage } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useRef, useState } from "react";
import { vscode } from "../../utilities/vscode";
import styles from "./PlantUmlRenderer.module.scss";

interface PlantUmlRendererProps {
  code: string;
  id: string;
  onEdit?: () => void;
}

/**
 * PlantUMLコードを図としてレンダリングするコンポーネント
 * Extension経由でローカルPlantUMLサーバーにリクエストを送信
 */
export function PlantUmlRenderer({ code, id, onEdit }: PlantUmlRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef<string>(`${id}-${Date.now()}`);

  // Extension からのレンダリング結果を処理
  const handleResult = useCallback(
    (event: MessageEvent<Message>) => {
      const message = event.data;
      if (message.type === "plantUmlResult") {
        const result = message as PlantUmlResultMessage;
        if (result.payload.requestId === requestIdRef.current) {
          setIsLoading(false);
          if (result.payload.svg) {
            setSvg(result.payload.svg);
            setError(null);
          } else if (result.payload.error) {
            setError(result.payload.error);
            setSvg("");
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("message", handleResult);
    return () => {
      window.removeEventListener("message", handleResult);
    };
  }, [handleResult]);

  // コードが変更されたらレンダリングをリクエスト
  useEffect(() => {
    const newRequestId = `${id}-${Date.now()}`;
    requestIdRef.current = newRequestId;
    setIsLoading(true);
    setError(null);

    vscode.postMessage({
      type: "renderPlantUml",
      payload: {
        code,
        requestId: newRequestId,
      },
    } satisfies RenderPlantUmlMessage);
  }, [code, id]);

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

  if (isLoading) {
    return (
      <div
        className={styles.loading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <span>Loading PlantUML diagram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={styles.error}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <span className={styles.errorLabel}>PlantUML Error:</span>
        <pre className={styles.errorMessage}>{error}</pre>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
