import { InitMessage, ThemeSetting } from "@message/messageTypeToExtention";
import {
  DocumentInfoMessage,
  Message,
  ThemeKind,
  UpdateMessage,
  UpdateSettingsMessage,
} from "@message/messageTypeToWebview";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { debounce } from "../utilities/debounce";
import { vscode } from "../utilities/vscode";
import { useEventListener } from "./useEventListener";

interface UseExtensionMessagesParams {
  vscodeThemeRef: React.RefObject<ThemeKind>;
  baseUriRef: React.RefObject<string>;
  documentDirRef: React.RefObject<string>;
  setTheme: React.Dispatch<React.SetStateAction<ThemeKind>>;
  setThemeSetting: React.Dispatch<React.SetStateAction<ThemeSetting>>;
  setCustomCss: React.Dispatch<React.SetStateAction<string>>;
  updateMarkdownFromExtension: (text: string) => void;
}

/** 拡張機能からの連続した更新を1つにまとめる待ち時間（ms）。編集内容の取り込みを遅らせすぎない短さにする */
export const EXTENSION_UPDATE_DEBOUNCE_MS = 50;

/**
 * Extension通信のカスタムフック
 */
export function useExtensionMessages({
  vscodeThemeRef,
  baseUriRef,
  documentDirRef,
  setTheme,
  setThemeSetting,
  setCustomCss,
  updateMarkdownFromExtension,
}: UseExtensionMessagesParams): void {
  // 最新の取り込み処理を参照しつつ、デバウンスは1つだけ作る（メッセージごとに作ると、まとめ処理にならない）
  const updateMarkdownFromExtensionRef = useRef(updateMarkdownFromExtension);
  updateMarkdownFromExtensionRef.current = updateMarkdownFromExtension;
  const applyExtensionUpdate = useMemo(
    () =>
      debounce((text: string) => {
        updateMarkdownFromExtensionRef.current(text);
      }, EXTENSION_UPDATE_DEBOUNCE_MS),
    []
  );
  useEffect(() => () => applyExtensionUpdate.cancel(), [applyExtensionUpdate]);

  const handleMessagesFromExtension = useCallback(
    (event: MessageEvent<Message>) => {
      const message = event.data satisfies Message;
      switch (message.type) {
        case "update":
          applyExtensionUpdate((message as UpdateMessage).payload);
          break;
        case "updateTheme":
          {
            const vscodeTheme = event.data.payload as ThemeKind;
            vscodeThemeRef.current = vscodeTheme;
            // themeSettingがautoの場合はVSCodeのテーマに追従
            setThemeSetting((currentSetting) => {
              if (currentSetting === "auto") {
                setTheme(vscodeTheme);
              }
              return currentSetting;
            });
          }
          break;
        case "updateSettings":
          {
            const settingsMessage = event.data as UpdateSettingsMessage;
            const newThemeSetting = settingsMessage.payload.themeSetting;
            setThemeSetting(newThemeSetting);
            // テーマ設定に応じてthemeを更新
            if (newThemeSetting === "auto") {
              setTheme(vscodeThemeRef.current);
            } else {
              setTheme(newThemeSetting);
            }
            setCustomCss(settingsMessage.payload.customCss);
          }
          break;
        case "documentInfo":
          {
            const docInfoMessage = event.data as DocumentInfoMessage;
            // WebView URIのベースパスとドキュメントディレクトリを保存（保存時の逆変換に使用）
            baseUriRef.current = docInfoMessage.payload.baseUri;
            documentDirRef.current = docInfoMessage.payload.dirPath;
          }
          break;
        default:
          console.log(`Unknown command: ${message.type as string}`);
          break;
      }
    },
    [
      vscodeThemeRef,
      baseUriRef,
      documentDirRef,
      setTheme,
      setThemeSetting,
      setCustomCss,
      applyExtensionUpdate,
    ]
  );

  useEventListener("message", handleMessagesFromExtension, window);

  // 初期化メッセージを送信
  useEffect(() => {
    vscode.postMessage({
      type: "init",
    } satisfies InitMessage);
  }, []);
}
