/** デバウンスされた関数。保留中の呼び出しを取り消す cancel を持つ */
export interface DebouncedFunction<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number = 500
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}
