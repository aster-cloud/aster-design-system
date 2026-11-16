/**
 * 日期 / 时间输入的键盘焦点环（Chromium，aster-cloud#774）：Tab 进入 <input type="date"> 时焦点落在
 * 内部的年 / 月 / 日子字段，宿主 input 不匹配 :focus-visible，原先 focus-visible:shadow-ring 不生效，
 * 键盘用户看不到焦点。用 :focus-within 兜住。
 */
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../.storybook/preview.css';
import { Input } from '../../../packages/ui/src/Input';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  root.unmount();
  container.remove();
});

describe('Input focus ring', () => {
  // date 有年 / 月 / 日三个子字段 + 日历按钮，time 有时 / 分（/ 上下午）；每一站都要能看到焦点环
  const STOPS = { date: 4, time: 3, text: 1 } as const;
  for (const type of ['date', 'time', 'text'] as const) {
    it(`keeps a focus ring on every Tab stop inside a ${type} input`, async () => {
      root.render(<><button type="button">before</button><Input aria-label="field" type={type} /><button type="button">after</button></>);
      await new Promise((r) => setTimeout(r, 50));
      (container.querySelector('button') as HTMLButtonElement).focus();
      const input = container.querySelector('input') as HTMLInputElement;
      for (let i = 0; i < STOPS[type]; i += 1) {
        await userEvent.keyboard('{Tab}');
        if (document.activeElement !== input) break;
        expect(getComputedStyle(input).boxShadow, `${type} stop ${i + 1}`).not.toBe('none');
      }
    });
  }
});
