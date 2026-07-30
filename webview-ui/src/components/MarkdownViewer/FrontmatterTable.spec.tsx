import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FrontmatterTable } from "./FrontmatterTable";

describe("FrontmatterTable", () => {
  it("key-valueのオブジェクトを渡すとtable要素が描画され、各keyと整形された値がセルとして表示されること", () => {
    render(<FrontmatterTable data={{ title: "サンプル", author: "太郎" }} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("サンプル")).toBeInTheDocument();
    expect(screen.getByText("author")).toBeInTheDocument();
    expect(screen.getByText("太郎")).toBeInTheDocument();
  });

  it("配列値・ネストしたオブジェクトを含むデータでも、formatFrontmatterValueの整形結果がセルに表示されること", () => {
    render(
      <FrontmatterTable
        data={{
          tags: ["a", "b"],
          meta: { nested: "value" },
        }}
      />
    );

    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByText("a, b")).toBeInTheDocument();
    expect(screen.getByText("meta")).toBeInTheDocument();
    expect(screen.getByText('{"nested":"value"}')).toBeInTheDocument();
  });

  it("空オブジェクトの場合でもエラーにならずテーブル（ヘッダーのみ）が描画されること", () => {
    render(<FrontmatterTable data={{}} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
