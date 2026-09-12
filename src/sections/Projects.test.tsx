import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Projects } from './Projects'
import { projects } from '@/data/projects'

const bankingCount = projects.filter((p) => p.domain === 'Banking').length

describe('Projects', () => {
  it('renders every project before any filter is applied', () => {
    render(<Projects />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(projects.length)
  })

  it('filters to a single domain and reflects it in the pressed state', async () => {
    const user = userEvent.setup()
    render(<Projects />)

    const group = screen.getByRole('group', { name: /filter projects/i })
    await user.click(within(group).getByRole('button', { name: /banking/i }))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(bankingCount)
    expect(within(group).getByRole('button', { name: /banking/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(group).getByRole('button', { name: /^all/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('restores the full list when All is selected again', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const group = screen.getByRole('group', { name: /filter projects/i })

    await user.click(within(group).getByRole('button', { name: /platform/i }))
    await user.click(within(group).getByRole('button', { name: /^all/i }))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(projects.length)
  })

  it('announces the visible count to assistive technology', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const group = screen.getByRole('group', { name: /filter projects/i })

    await user.click(within(group).getByRole('button', { name: /banking/i }))
    expect(screen.getByText(new RegExp(`${bankingCount} projects shown in Banking`))).toBeInTheDocument()
  })
})
