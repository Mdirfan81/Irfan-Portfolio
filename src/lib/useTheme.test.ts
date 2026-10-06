import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark and mirrors onto the document element', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('stores nothing until the visitor makes a choice', () => {
    renderHook(() => useTheme())
    expect(window.localStorage.getItem('mik-theme-choice')).toBeNull()
  })

  it('persists the chosen theme', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(window.localStorage.getItem('mik-theme-choice')).toBe('light')
  })

  it('restores a previously stored theme', () => {
    window.localStorage.setItem('mik-theme-choice', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })
})
