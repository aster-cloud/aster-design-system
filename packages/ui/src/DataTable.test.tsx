import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DataTable } from './DataTable.js';

/**
 * aster-cloud#774 审计：srHeader 列的表头是 sr-only（position:absolute），滚动容器不是定位祖先时
 * 它按页面定位、逃出 overflow-x-auto，把移动端整页撑出横向滚动。滚动容器必须是 relative。
 */
describe('DataTable', () => {
  it('makes the scroll region the containing block for sr-only headers', () => {
    const { getByRole } = render(
      <DataTable
        aria-label="Versions"
        rows={[{ id: 1 }]}
        columns={[
          { key: 'id', header: 'ID', cell: (r: { id: number }) => r.id },
          { key: 'actions', header: 'Actions', srHeader: true, cell: () => null },
        ]}
      />,
    );
    const region = getByRole('region', { name: 'Versions' });
    expect(region.className).toMatch(/\brelative\b/);
    expect(region.className).toMatch(/\boverflow-x-auto\b/);
    expect(region.querySelector('th .sr-only')?.textContent).toBe('Actions');
  });
});
