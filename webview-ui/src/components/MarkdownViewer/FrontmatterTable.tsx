import { FC } from "react";
import { formatFrontmatterValue } from "@/utilities/formatFrontmatterValue";

interface FrontmatterTableProps {
  data: Record<string, unknown>;
}

/**
 * フロントマターのkey-valueをテーブル表示する
 */
export const FrontmatterTable: FC<FrontmatterTableProps> = ({ data }) => {
  return (
    <div className="markdown-viewer-frontmatter">
      <table className="markdown-viewer-frontmatter-table">
        <thead>
          <tr>
            <th>キー</th>
            <th>値</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{formatFrontmatterValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
