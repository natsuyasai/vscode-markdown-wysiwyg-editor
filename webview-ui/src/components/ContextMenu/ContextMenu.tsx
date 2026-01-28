import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ContextMenu.module.scss";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: string;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    const y = e.clientY;

    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // メニュー外のクリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  // メニューが画面外に出ないように位置を調整
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    if (adjustedX !== position.x || adjustedY !== position.y) {
      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [isOpen, position]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Context menu trigger requires onContextMenu handler
    <div ref={containerRef} onContextMenu={handleContextMenu} className={styles.container}>
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          className={styles.menu}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              className={`${styles.menuItem} ${item.disabled ? styles.disabled : ""}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              <span className={styles.label}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
