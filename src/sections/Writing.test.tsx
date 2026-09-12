import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Writing } from './Writing'
import { posts } from '@/data/writing'
import { profile } from '@/data/profile'

describe('Writing', () => {
  it('lists every published post with its real Medium URL', () => {
    render(<Writing />)
    posts.forEach((post) => {
      const link = screen.getByRole('link', { name: new RegExp(post.title, 'i') })
      expect(link).toHaveAttribute('href', post.href)
      expect(link.getAttribute('href')).toContain('medium.com')
    })
  })

  it('links out to the Medium profile', () => {
    render(<Writing />)
    expect(screen.getByRole('link', { name: /all posts on medium/i })).toHaveAttribute(
      'href',
      profile.links.medium,
    )
  })

  it('opens every post in a new tab, safely', () => {
    render(<Writing />)
    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    })
  })
})
