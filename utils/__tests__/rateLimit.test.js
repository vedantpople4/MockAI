import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit } from '../rateLimit'

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useRealTimers()
    })

    it('allows requests under the limit', () => {
        const key = `test-${Math.random()}`
        expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true)
        expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true)
        expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true)
    })

    it('rejects requests once the limit is reached', () => {
        const key = `test-${Math.random()}`
        checkRateLimit(key, { limit: 2, windowMs: 60_000 })
        checkRateLimit(key, { limit: 2, windowMs: 60_000 })

        expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(false)
    })

    it('resets once the window passes', () => {
        vi.useFakeTimers()
        const key = `test-${Math.random()}`

        checkRateLimit(key, { limit: 1, windowMs: 1000 })
        expect(checkRateLimit(key, { limit: 1, windowMs: 1000 }).allowed).toBe(false)

        vi.advanceTimersByTime(1001)

        expect(checkRateLimit(key, { limit: 1, windowMs: 1000 }).allowed).toBe(true)
    })

    it('tracks separate keys independently', () => {
        const keyA = `test-a-${Math.random()}`
        const keyB = `test-b-${Math.random()}`

        checkRateLimit(keyA, { limit: 1, windowMs: 60_000 })

        expect(checkRateLimit(keyA, { limit: 1, windowMs: 60_000 }).allowed).toBe(false)
        expect(checkRateLimit(keyB, { limit: 1, windowMs: 60_000 }).allowed).toBe(true)
    })
})
