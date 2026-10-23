/**
 * ConfirmDialog 的 Esc / 背板点击行为（真实 Chromium）。
 *
 * jsdom 的 HTMLDialogElement 是空壳，showModal()、UA 的 Esc 取消路径都不存在，
 * 所以这组用例必须跑在 vitest browser mode。直接从源码挂载，不经过
 * @aster-cloud/ui 的 dist 导出，避免测试结果取决于是否先 build。
 */
import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ConfirmDialog } from '../../../packages/ui/src/ConfirmDialog';

interface HarnessProps {
  isLoading: boolean;
  onCancel: () => void;
  /** 消费方是否在 onCancel 里真的关闭。aster-cloud 的消费方普遍写成
   *  `onCancel={() => !busy && setOpen(false)}`，busy 时拒绝关闭。 */
  closeOnCancel?: boolean;
}

// 模拟真实消费方：onCancel 时把 isOpen 置回 false，让弹窗卸载。
function Harness({ isLoading, onCancel, closeOnCancel = true }: HarnessProps) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      isOpen={open}
      isLoading={isLoading}
      title="Archive policy?"
      description="Archived policies stop receiving evaluations."
      onConfirm={() => {}}
      onCancel={() => {
        onCancel();
        if (closeOnCancel) setOpen(false);
      }}
    />
  );
}

let container: HTMLDivElement;
let root: Root;

const dialog = () => document.querySelector('dialog');

async function mount(props: HarnessProps) {
  root.render(<Harness {...props} />);
  await vi.waitFor(() => expect(dialog()?.open).toBe(true));
}

// 等一个宏任务：UA 的 cancel/close 事件和 React 的卸载都在当前任务之后才落地，
// 直接断言会漏掉「稍后被关闭」的回归。
const settle = () => new Promise((r) => setTimeout(r, 50));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

describe('ConfirmDialog Esc', () => {
  it('未加载时 Esc：onCancel 恰好一次，弹窗关闭，且不经 UA 原生关闭路径', async () => {
    const onCancel = vi.fn();
    const nativeClose = vi.fn();
    await mount({ isLoading: false, onCancel });
    // UA 原生 Esc 会先后派发 cancel / close；这条路径一旦放行，
    // 就会在 React 卸载之外再关一次弹窗（历史上由此二次触发 onCancel）。
    dialog()!.addEventListener('cancel', nativeClose);
    dialog()!.addEventListener('close', nativeClose);

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(nativeClose).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('加载中 Esc：不触发 onCancel、弹窗保持打开；加载结束后 Esc 关闭一次', async () => {
    const onCancel = vi.fn();
    await mount({ isLoading: true, onCancel });

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog()?.open).toBe(true);

    root.render(<Harness isLoading={false} onCancel={onCancel} />);
    await vi.waitFor(() =>
      expect(dialog()?.querySelector('button:disabled')).toBeNull(),
    );

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });

  it('消费方在 onCancel 中拒绝关闭时：Esc 只触发一次，弹窗保持打开（受控）', async () => {
    const onCancel = vi.fn();
    await mount({ isLoading: false, onCancel, closeOnCancel: false });

    await userEvent.keyboard('{Escape}');
    await settle();

    // 旧实现会让 UA 原生关掉 <dialog>，再经 close 事件二次调用 onCancel，
    // 结果是 isOpen 仍为 true 但元素已关闭，之后再也无法 showModal。
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()?.open).toBe(true);
  });

  it('未加载时点击背板仍然取消', async () => {
    const onCancel = vi.fn();
    await mount({ isLoading: false, onCancel });

    // 模态 <dialog> 的 ::backdrop 点击落在 dialog 元素自身上，
    // 对 dialog 的负偏移点击正好命中背板而非内部面板。
    await userEvent.click(dialog()!, { position: { x: -40, y: -40 } });
    await settle();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });
});
