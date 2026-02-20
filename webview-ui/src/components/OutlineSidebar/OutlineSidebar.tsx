import { FC, useEffect, useRef, useState } from "react";
import type { ThemeKind } from "../../constants/themeColors";
import type { HeadingItem } from "../../utilities/extractHeadings";
import styles from "./OutlineSidebar.module.css";

interface OutlineSidebarProps {
  headings: HeadingItem[];
  onHeadingClick: (id: string) => void;
  theme: ThemeKind;
}

export const OutlineSidebar: FC<OutlineSidebarProps> = ({ headings, onHeadingClick, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    onHeadingClick(id);
  };

  return (
    <>
      <button
        ref={hamburgerRef}
        type="button"
        className={`${styles.hamburger} ${isOpen ? styles.hamburgerOpen : ""}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Close outline" : "Open outline"}
        aria-expanded={isOpen}>
        <span data-theme={theme} className={styles.hamburgerLine} />
        <span data-theme={theme} className={styles.hamburgerLine} />
        <span data-theme={theme} className={styles.hamburgerLine} />
      </button>
      <nav
        ref={sidebarRef}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        data-theme={theme}
        aria-label="Outline"
        aria-hidden={!isOpen}>
        <div className={styles.header}>
          <h2 className={styles.title}>Outline</h2>
        </div>
        <ul className={styles.list}>
          {headings.map((heading) => (
            <li key={heading.id} className={styles.item}>
              <a
                href={`#${heading.id}`}
                className={styles.link}
                style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                onClick={(e) => handleClick(e, heading.id)}>
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
