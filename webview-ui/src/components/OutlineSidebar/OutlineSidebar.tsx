import { FC, useState } from "react";
import type { HeadingItem } from "../../utilities/extractHeadings";
import styles from "./OutlineSidebar.module.css";

interface OutlineSidebarProps {
  headings: HeadingItem[];
  onHeadingClick: (id: string) => void;
}

export const OutlineSidebar: FC<OutlineSidebarProps> = ({ headings, onHeadingClick }) => {
  const [isOpen, setIsOpen] = useState(false);

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
        type="button"
        className={`${styles.hamburger} ${isOpen ? styles.hamburgerOpen : ""}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Close outline" : "Open outline"}
        aria-expanded={isOpen}
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>
      <nav
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Outline"
        aria-hidden={!isOpen}
      >
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
                onClick={(e) => handleClick(e, heading.id)}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
