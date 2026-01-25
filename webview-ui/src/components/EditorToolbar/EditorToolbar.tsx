import { FC } from "react";
import styles from "./EditorToolbar.module.scss";

export type ThemeSetting = "light" | "dark" | "auto";

interface EditorToolbarProps {
  readonly: boolean;
  onReadonlyChange: (readonly: boolean) => void;
  themeSetting: ThemeSetting;
  onThemeSettingChange: (theme: ThemeSetting) => void;
}

export const EditorToolbar: FC<EditorToolbarProps> = ({
  readonly,
  onReadonlyChange,
  themeSetting,
  onThemeSettingChange,
}) => {
  const handleReadonlyToggle = () => {
    onReadonlyChange(!readonly);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onThemeSettingChange(e.target.value as ThemeSetting);
  };

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.toolbarButton} ${readonly ? styles.active : ""}`}
        onClick={handleReadonlyToggle}
        title={readonly ? "Switch to edit mode" : "Switch to readonly mode"}
      >
        <span className={styles.icon}>{readonly ? "🔒" : "✏️"}</span>
        <span className={styles.label}>{readonly ? "Readonly" : "Edit"}</span>
      </button>
      <div className={styles.separator} />
      <label className={styles.themeSelector}>
        <span className={styles.themeLabel}>Theme:</span>
        <select
          className={styles.themeSelect}
          value={themeSetting}
          onChange={handleThemeChange}
        >
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  );
};
