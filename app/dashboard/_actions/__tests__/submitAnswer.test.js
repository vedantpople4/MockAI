import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
    currentUser: vi.fn(),
}))
vi.mock('@/utils/db', () => ({
    db: { insert: vi.fn() },
}))
vi.mock('@/utils/GeminiAIModel', () => ({
    chatSession: { sendMessage: vi.fn() },
}))
vi.mock('@/utils/rateLimit', () => ({
    checkRateLimit: vi.fn(() => ({ allowed: true })),
}))

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/utils/db'
import { chatSession } from '@/utils/GeminiAIModel'
import { checkRateLimit } from '@/utils/rateLimit'
import { submitAnswer } from '../submitAnswer'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const validInput = {
    mockIdRef: VALID_UUID,
    question: 'What is a closure?',
    correctAns: 'A closure is a function bundled with its lexical scope.',
    userAns: 'It is when a function remembers the scope it was created in.',
}

function mockSignedInUser(email = 'user@example.com') {
    currentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: email } })
}

function mockValidFeedback() {
    chatSession.sendMessage.mockResolvedValue({
        response: { text: () => '```json\n{"rating":"7","feedback":"Good answer"}\n```' },
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockReturnValue({ allowed: true })
})

describe('submitAnswer', () => {
    it('rejects invalid input before touching Gemini or the DB', async () => {
        const result = await submitAnswer({ ...validInput, mockIdRef: 'not-a-uuid' })

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('rejects when there is no signed-in user', async () => {
        currentUser.mockResolvedValue(null)

        const result = await submitAnswer(validInput)

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
    })

    it('rejects when the rate limit is exceeded', async () => {
        mockSignedInUser()
        checkRateLimit.mockReturnValue({ allowed: false })

        const result = await submitAnswer(validInput)

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
    })

    it('returns an error when Gemini throws', async () => {
        mockSignedInUser()
        chatSession.sendMessage.mockRejectedValue(new Error('network error'))

        const result = await submitAnswer(validInput)

        expect(result.error).toBeTruthy()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('returns an error when Gemini returns malformed JSON', async () => {
        mockSignedInUser()
        chatSession.sendMessage.mockResolvedValue({
            response: { text: () => 'not json at all' },
        })

        const result = await submitAnswer(validInput)

        expect(result.error).toBeTruthy()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('returns an error when the DB insert throws', async () => {
        mockSignedInUser()
        mockValidFeedback()
        db.insert.mockReturnValue({
            values: vi.fn().mockRejectedValue(new Error('db down')),
        })

        const result = await submitAnswer(validInput)

        expect(result.error).toBeTruthy()
    })

    it('saves the answer end to end on valid input', async () => {
        mockSignedInUser()
        mockValidFeedback()
        const valuesMock = vi.fn().mockResolvedValue(undefined)
        db.insert.mockReturnValue({ values: valuesMock })

        const result = await submitAnswer(validInput)

        expect(result).toEqual({ success: true })
        expect(valuesMock).toHaveBeenCalledTimes(1)
    })

    it('inserts the row with a userEmail field (regression: previously inserted "user" instead)', async () => {
        mockSignedInUser('answerer@example.com')
        mockValidFeedback()
        const valuesMock = vi.fn().mockResolvedValue(undefined)
        db.insert.mockReturnValue({ values: valuesMock })

        await submitAnswer(validInput)

        const insertedRow = valuesMock.mock.calls[0][0]
        expect(insertedRow.userEmail).toBe('answerer@example.com')
        expect(insertedRow.user).toBeUndefined()
    })
})
