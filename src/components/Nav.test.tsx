import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from './Nav'
import { navItems } from '@/data/profile'

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('links to every section', () => {
    render(<Nav />)
    const nav = screen.getByRole('navigation', { name: /sections/i })
    navItems.forEach((item) => {
      expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        `#${item.id}`,
      )
    })
  })

  it('toggles the theme and writes it to the document', async () => {
    const user = userEvent.setup()
    render(<Nav />)

    const toggle = screen.getByRole('button', { name: /switch to light theme/i })
    await user.click(toggle)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
  })

  it('opens and closes the mobile menu, keeping aria-expanded in sync', async () => {
    const user = userEvent.setup()
    render(<Nav />)

    const menuBtn = screen.getByRole('button', { name: /open menu/i })
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuBtn)
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
