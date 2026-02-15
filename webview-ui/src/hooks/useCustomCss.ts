import { useEffect } from "react";

const CUSTOM_CSS_STYLE_ID = "custom-css-style";

export function useCustomCss(customCss: string): void {
  useEffect(() => {
    let styleElement = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = CUSTOM_CSS_STYLE_ID;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = customCss;
  }, [customCss]);
}
