import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs.js';

/**
 * aster-cloud#774 审计：面包屑在 390px 宽度下不折行，长路径把整页撑出横向滚动；
 * 链接只有 20px 高，低于移动端 44×44 的点击目标下限。
 */
const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Domain vocabularies', href: '/domain-vocabularies' },
  { label: 'Vocabulary snapshots' },
];

describe('Breadcrumbs', () => {
  it('wraps and lets items shrink instead of overflowing narrow viewports', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const nav = container.querySelector('nav') as HTMLElement;
    const ol = container.querySelector('ol') as HTMLElement;
    expect(nav.className).toMatch(/\bmin-w-0\b/);
    expect(ol.className).toMatch(/\bflex-wrap\b/);
    expect(ol.className).toMatch(/\bmin-w-0\b/);
    for (const li of Array.from(container.querySelectorAll('li'))) expect(li.className).toMatch(/\bmin-w-0\b/);
  });

  it('gives links a 44px tap target on mobile without changing desktop layout', () => {
    const { getByRole } = render(<Breadcrumbs items={items} />);
    const link = getByRole('link', { name: 'Dashboard' });
    // 移动端用上下内边距把命中区撑到 20 + 2×12 = 44px，负外边距抵消，行高不变；sm 及以上恢复
    const cls = ` ${link.className} `;
    for (const c of ['inline-block', 'py-3', '-my-3', 'sm:py-0', 'sm:my-0', 'truncate']) expect(cls).toContain(` ${c} `);
  });

  it('marks the current page', () => {
    const { getByText } = render(<Breadcrumbs items={items} />);
    expect(getByText('Vocabulary snapshots').getAttribute('aria-current')).toBe('page');
  });
});
