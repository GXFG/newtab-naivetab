import { describe, it, expect } from 'vitest'
import { mergeState } from '@/logic/config-merge'

describe('mergeState', () => {
  describe('Rule 1: acceptState is empty → use default state', () => {
    it('returns state when acceptState is undefined', () => {
      expect(mergeState('default', undefined)).toBe('default')
    })

    it('returns state when acceptState is null', () => {
      expect(mergeState('default', null)).toBe('default')
    })
  })

  describe('Rule 2: Type mismatch → use default state', () => {
    it('returns state when string vs number', () => {
      expect(mergeState('string', 123)).toBe('string')
    })

    it('returns state when object vs string', () => {
      expect(mergeState({ a: 1 }, 'string')).toEqual({ a: 1 })
    })

    it('returns state when array vs object', () => {
      expect(mergeState([1, 2], { a: 1 })).toEqual([1, 2])
    })

    it('returns state when object vs array', () => {
      expect(mergeState({ a: 1 }, [1, 2])).toEqual({ a: 1 })
    })
  })

  describe('Rule 3: Primitives → use acceptState', () => {
    it('returns acceptState for strings', () => {
      expect(mergeState('old', 'new')).toBe('new')
    })

    it('returns acceptState for numbers', () => {
      expect(mergeState(1, 42)).toBe(42)
    })

    it('returns acceptState for booleans', () => {
      expect(mergeState(false, true)).toBe(true)
    })
  })

  describe('Rule 4: Arrays → use acceptState wholesale', () => {
    it('replaces entire array without element-wise merge', () => {
      expect(mergeState([1, 2, 3], [4, 5])).toEqual([4, 5])
    })

    it('replaces with shorter array', () => {
      expect(mergeState(['a', 'b', 'c'], ['x'])).toEqual(['x'])
    })
  })

  describe('Rule 5: Keymap pattern → use acceptState', () => {
    it('detects Key* pattern and returns acceptState', () => {
      const state = { KeyA: { url: 'old', name: 'old' }, KeyB: { url: 'old' } }
      const accept = { KeyA: { url: 'new' } }
      expect(mergeState(state, accept)).toEqual({ KeyA: { url: 'new' } })
    })

    it('detects Digit* pattern and returns acceptState', () => {
      const state = { Digit1: { url: 'a' }, Digit2: { url: 'b' } }
      const accept = { Digit1: { url: 'c' } }
      expect(mergeState(state, accept)).toEqual({ Digit1: { url: 'c' } })
    })

    it('detects Numpad* pattern and returns acceptState', () => {
      const state = { Numpad0: { url: 'a' } }
      const accept = { Numpad0: { url: 'b' } }
      expect(mergeState(state, accept)).toEqual({ Numpad0: { url: 'b' } })
    })

    it('does not trigger keymap pattern for non-keyboard keys', () => {
      const state = { enabled: true, fontSize: 14 }
      const accept = { enabled: false, fontSize: 16 }
      // Not keymap, so recursive merge
      expect(mergeState(state, accept)).toEqual({
        enabled: false,
        fontSize: 16,
      })
    })
  })

  describe('Rule 6: Plain objects → recursive merge', () => {
    it('accepts override for shared keys', () => {
      expect(mergeState({ a: 1, b: 2 }, { a: 10 })).toEqual({ a: 10, b: 2 })
    })

    it('ignores extra keys in acceptState', () => {
      expect(mergeState({ a: 1, b: 2 }, { a: 10, c: 99 })).toEqual({
        a: 10,
        b: 2,
      })
    })

    it('merges nested objects recursively', () => {
      const state = { a: { x: 1, y: 2 } }
      const accept = { a: { x: 10 } }
      expect(mergeState(state, accept)).toEqual({ a: { x: 10, y: 2 } })
    })

    it('merges deeply nested objects (3+ levels)', () => {
      const state = { a: { b: { x: 1, y: 2 }, c: 3 } }
      const accept = { a: { b: { x: 10 } } }
      expect(mergeState(state, accept)).toEqual({
        a: { b: { x: 10, y: 2 }, c: 3 },
      })
    })

    it('returns empty object for empty inputs', () => {
      expect(mergeState({}, {})).toEqual({})
    })

    it('preserves default values for missing keys at any depth', () => {
      const state = { layout: { x: 0, y: 0, z: 0 } }
      const accept = { layout: { x: 5 } }
      expect(mergeState(state, accept)).toEqual({
        layout: { x: 5, y: 0, z: 0 },
      })
    })

    it('uses default state when nested value type mismatches', () => {
      const state = { config: { mode: 'dark', size: 14 } }
      const accept = { config: 'legacy-string' } // type changed from object to string
      expect(mergeState(state, accept)).toEqual({
        config: { mode: 'dark', size: 14 },
      })
    })

    it('detects keymap pattern in nested objects and replaces wholesale', () => {
      const state = {
        keymap: {
          KeyA: { url: 'https://old.com', name: 'Old' },
          KeyB: { url: 'https://old2.com' },
        },
      }
      const accept = {
        keymap: {
          KeyA: { url: 'https://new.com' },
          // KeyB removed in acceptState → should NOT be restored (keymap wholesale replace)
        },
      }
      expect(mergeState(state, accept)).toEqual({
        keymap: { KeyA: { url: 'https://new.com' } },
      })
    })
  })
})
