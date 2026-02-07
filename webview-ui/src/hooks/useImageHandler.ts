import { SaveImageMessage } from "@message/messageTypeToExtention";
import { Message, SaveImageResultMessage } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useRef } from "react";
import { vscode } from "../utilities/vscode";

interface UseImageHandlerOptions {
  onImageInserted: (markdownImage: string) => void;
  enabled?: boolean;
}

/**
 * 画像のペースト/ドロップを処理し、Extension経由でローカル保存する
 */
export function useImageHandler({ onImageInserted, enabled = true }: UseImageHandlerOptions) {
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());

  // Extension からの画像保存結果を処理
  const handleImageResult = useCallback(
    (event: MessageEvent<Message>) => {
      const message = event.data;
      if (message.type === "saveImageResult") {
        const result = message as SaveImageResultMessage;
        const { requestId } = result.payload;
        // 自分が送信したリクエストのみ処理
        if (!pendingRequestIdsRef.current.has(requestId)) {
          return;
        }
        pendingRequestIdsRef.current.delete(requestId);
        if (result.payload.success && result.payload.markdownImage) {
          onImageInserted(result.payload.markdownImage);
        } else if (result.payload.error) {
          console.error("Failed to save image:", result.payload.error);
        }
      }
    },
    [onImageInserted]
  );

  useEffect(() => {
    window.addEventListener("message", handleImageResult);
    return () => {
      window.removeEventListener("message", handleImageResult);
    };
  }, [handleImageResult]);

  // ペーストイベントを処理
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!enabled) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          event.stopPropagation();

          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    },
    [enabled]
  );

  // ドロップイベントを処理
  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;

      const files = event.dataTransfer?.files;
      if (!files) return;

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          event.preventDefault();
          event.stopPropagation();

          processImageFile(file);
          break;
        }
      }
    },
    [enabled]
  );

  // ドラッグオーバーイベントを処理（ドロップを許可するため）
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;

      const types = event.dataTransfer?.types;
      if (types?.includes("Files")) {
        event.preventDefault();
      }
    },
    [enabled]
  );

  // 画像ファイルを処理してExtensionに送信
  const processImageFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64Data = reader.result as string;
      const fileName = file.name || `image_${Date.now()}`;
      const requestId = `image-handler-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      pendingRequestIdsRef.current.add(requestId);

      vscode.postMessage({
        type: "saveImage",
        payload: {
          requestId,
          imageData: base64Data,
          fileName: fileName,
          mimeType: file.type,
        },
      } satisfies SaveImageMessage);
    };

    reader.onerror = () => {
      console.error("Failed to read image file");
    };

    reader.readAsDataURL(file);
  };

  // イベントリスナーを設定
  useEffect(() => {
    if (!enabled) return;

    // documentレベルでイベントをキャプチャ
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragover", handleDragOver, true);

    return () => {
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("drop", handleDrop, true);
      document.removeEventListener("dragover", handleDragOver, true);
    };
  }, [enabled, handlePaste, handleDrop, handleDragOver]);

  return {
    isPending: pendingRequestIdsRef.current.size > 0,
  };
}
