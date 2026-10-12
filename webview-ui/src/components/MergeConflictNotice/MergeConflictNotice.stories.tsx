import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { MergeConflictNotice } from "@/components/MergeConflictNotice";

const meta: Meta<typeof MergeConflictNotice> = {
  title: "Components/MergeConflictNotice",
  component: MergeConflictNotice,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof MergeConflictNotice>;

export const Default: Story = {
  args: {
    onDismiss: fn(),
  },
  name: "競合の通知と閉じる操作",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent("競合");

    await userEvent.click(canvas.getByRole("button", { name: "閉じる" }));
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};
