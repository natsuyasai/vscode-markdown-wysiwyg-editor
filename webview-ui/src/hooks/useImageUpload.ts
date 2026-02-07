import { SaveImageMessage } from "@message/messageTypeToExtention";
import { SaveImageResultMessage } from "@message/messageTypeToWebview";
import { useCallback, useRef } from "react";
import { vscode } from "../utilities/vscode";

// 画像アップロードのコールバック管理
const imageUploadCallbacks = new Map<string, (result: string | null) => void>();

/**
 * 相対パスをWebView URIに変換する
 * 読み込み時にExtensionが行うconvertImagePathsToWebviewUriと同等の処理
 */
function toWebviewUri(relativePath: string, baseUri: string): string {
  if (!baseUri) {
    return relativePath;
  }
  const normalizedBaseUri = baseUri.endsWith("/") ? baseUri : `${baseUri}/`;
  return `${normalizedBaseUri}${relativePath}`;
}

interface UseImageUploadResult {
  /**
   * 画像アップロード結果を処理する
   */
  handleImageUploadResult: (message: SaveImageResultMessage) => void;
  /**
   * 画像アップロード関数を作成する
   */
  createUploadImage: () => (file: File) => Promise<string>;
}

/**
 * 画像アップロード機能のカスタムフック
 */
export function useImageUpload(baseUri: string): UseImageUploadResult {
  const baseUriRef = useRef(baseUri);
  baseUriRef.current = baseUri;

  const handleImageUploadResult = useCallback((message: SaveImageResultMessage) => {
    const { requestId } = message.payload;
    const callback = imageUploadCallbacks.get(requestId);
    if (callback) {
      if (message.payload.success && message.payload.localPath) {
        callback(message.payload.localPath);
      } else {
        console.error("Failed to upload image:", message.payload.error);
        callback(null);
      }
      imageUploadCallbacks.delete(requestId);
    }
  }, []);

  const createUploadImage = useCallback(() => {
    return async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const base64Data = reader.result as string;
          const requestId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

          imageUploadCallbacks.set(requestId, (relativePath) => {
            if (relativePath) {
              // 相対パスをWebView URIに変換（読み込み時と同じ形式にする）
              resolve(toWebviewUri(relativePath, baseUriRef.current ?? ""));
            } else {
              reject(new Error("Failed to save image"));
            }
          });

          vscode.postMessage({
            type: "saveImage",
            payload: {
              requestId,
              imageData: base64Data,
              fileName: file.name || `image_${Date.now()}`,
              mimeType: file.type || "image/png",
            },
          } satisfies SaveImageMessage);
        };

        reader.onerror = () => {
          reject(new Error("Failed to read image file"));
        };

        reader.readAsDataURL(file);
      });
    };
  }, []);

  return {
    handleImageUploadResult,
    createUploadImage,
  };
}
