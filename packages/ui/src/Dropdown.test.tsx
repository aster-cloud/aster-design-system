import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown, DropdownItem } from './Dropdown.js';

/**
 * Dropdown is an honest disclosure popover (audit #6): no ARIA menu
 * semantics, so we assert the disclosure contract instead — trigger
 * carries aria-expanded, Esc closes and restores focus to the trigger,
 * and selecting an item closes + restores focus. We also guard against
 * regressing back to role="menu"/"menuitem".
 */
function Fixture() {
  return (
    <Dropdown trigger={<button type="button">Actions</button>}>
      <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
      <DropdownItem onSelect={() => {}} variant="danger">
        Delete
      </DropdownItem>
    </Dropdown>
  );
}

describe('Dropdown (honest disclosure)', () => {
  it('exposes the trigger as a disclosure button, not a menu', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-haspopup', 'menu');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Items are plain buttons — no menuitem role, and no menu container.
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('closes on Esc and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('selecting an item closes the popover, fires onSelect, and restores focus', async () => {
    const user = userEvent.setup();
    let selected = false;
    render(
      <Dropdown trigger={<button type="button">Actions</button>}>
        <DropdownItem
          onSelect={() => {
            selected = true;
          }}
        >
          Edit
        </DropdownItem>
      </Dropdown>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(selected).toBe(true);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
