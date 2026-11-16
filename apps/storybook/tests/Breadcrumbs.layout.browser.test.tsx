/**
 * Breadcrumbs 的真实布局（Chromium + Tailwind，aster-cloud#774）：
 * 390px 视口下长路径折行而不撑宽容器，链接命中区 ≥44px；sm 以上恢复紧凑行高。
 * 类名断言在 packages/ui 的单测里；这里量的是实际渲染尺寸。
 */
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../.storybook/preview.css';
import { Breadcrumbs } from '../../../packages/ui/src/Breadcrumbs';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Domain vocabularies', href: '/domain-vocabularies' },
  { label: 'Vocabulary snapshots and history' },
];

let container: HTMLDivElement;
let root: Root;

async function mount(width: number): Promise<void> {
  container.style.width = `${width}px`;
  root.render(<Breadcrumbs items={items} />);
  await new Promise((r) => setTimeout(r, 50));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

describe('Breadcrumbs layout', () => {
  it('wraps inside a 358px column and gives links a 44px tap target at 390px', async () => {
    await page.viewport(390, 844);
    await mount(358);
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav.scrollWidth).toBeLessThanOrEqual(358);
    for (const a of Array.from(container.querySelectorAll('a'))) {
      expect(a.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps the compact row height on desktop', async () => {
    await page.viewport(1280, 800);
    await mount(1000);
    const a = container.querySelector('a') as HTMLElement;
    expect(a.getBoundingClientRect().height).toBeLessThan(30);
  });
});
