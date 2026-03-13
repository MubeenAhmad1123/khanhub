import { useEffect, RefObject } from 'react'

export function useClickOutside(
  refs: RefObject<HTMLElement>[],
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      const clickedInside = refs.some(ref => ref.current?.contains(target))
      if (!clickedInside) handler()
    }

    // Use mousedown for instant feel (not click which fires after):
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener, { passive: true })

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [enabled, handler, refs])
}
