import { FC } from "react";
import styles from "./MergeConflictNotice.module.scss";

interface MergeConflictNoticeProps {
  onDismiss: () => void;
}

/** 外部での変更と編集が同じ箇所で競合し、編集内容を優先して取り込んだことを知らせる */
export const MergeConflictNotice: FC<MergeConflictNoticeProps> = ({ onDismiss }) => (
  <div className={styles.notice} role="alert">
    <span>
      ファイルが外部で変更され、編集中の内容と同じ箇所が競合しました。編集中の内容を優先して取り込みました。
    </span>
    <button type="button" className={styles.dismiss} onClick={onDismiss}>
      閉じる
    </button>
  </div>
);
