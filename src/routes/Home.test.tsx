import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import Home from './Home'
import { navItems, profile } from '@/data/profile'
import { experience } from '@/data/experience'

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

describe('Home', () => {
  it('renders exactly one h1', () => {
    renderHome()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('exposes an anchor target for every nav item', () => {
    const { container } = renderHome()
    navItems.forEach((item) => {
      expect(container.querySelector(`#${item.id}`)).not.toBeNull()
    })
  })

  it('lists every role from the experience data', () => {
    renderHome()
    experience.forEach((role) => {
      expect(screen.getByRole('heading', { name: role.company })).toBeInTheDocument()
    })
  })

  it('gives the real contact details, not placeholders', () => {
    renderHome()
    const emailLinks = screen.getAllByRole('link', { name: /email me/i })
    expect(emailLinks[0]).toHaveAttribute('href', `mailto:${profile.email}`)
    expect(screen.getAllByRole('link', { name: /github/i })[0]).toHaveAttribute(
      'href',
      profile.links.github,
    )
  })

  it('opens external links safely', () => {
    renderHome()
    const external = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('target') === '_blank')
    expect(external.length).toBeGreaterThan(0)
    external.forEach((a) => expect(a).toHaveAttribute('rel', expect.stringContaining('noreferrer')))
  })
})
