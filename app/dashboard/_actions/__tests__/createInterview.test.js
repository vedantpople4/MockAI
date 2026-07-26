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
import { createInterview } from '../createInterview'

const validInput = {
    jobPosition: 'Software Engineer',
    jobDescription: 'React, Node.js',
    jobExperience: 3,
}

function mockSignedInUser(email = 'user@example.com') {
    currentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: email } })
}

function mockInsertSuccess(mockId = 'generated-mock-id') {
    db.insert.mockReturnValue({
        values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([{ mockId }]),
        })),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockReturnValue({ allowed: true })
})

describe('createInterview', () => {
    it('rejects invalid input before touching Gemini or the DB', async () => {
        const result = await createInterview({ jobPosition: 'Software Engineer', jobDescription: 'React', jobExperience: -1 })

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('rejects when there is no signed-in user', async () => {
        currentUser.mockResolvedValue(null)

        const result = await createInterview(validInput)

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
    })

    it('rejects when the rate limit is exceeded', async () => {
        mockSignedInUser()
        checkRateLimit.mockReturnValue({ allowed: false })

        const result = await createInterview(validInput)

        expect(result.error).toBeTruthy()
        expect(chatSession.sendMessage).not.toHaveBeenCalled()
    })

    it('returns an error when Gemini throws', async () => {
        mockSignedInUser()
        chatSession.sendMessage.mockRejectedValue(new Error('network error'))

        const result = await createInterview(validInput)

        expect(result.error).toBeTruthy()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('returns an error when Gemini returns malformed JSON', async () => {
        mockSignedInUser()
        chatSession.sendMessage.mockResolvedValue({
            response: { text: () => 'not json at all' },
        })

        const result = await createInterview(validInput)

        expect(result.error).toBeTruthy()
        expect(db.insert).not.toHaveBeenCalled()
    })

    it('returns an error when the DB insert throws', async () => {
        mockSignedInUser()
        chatSession.sendMessage.mockResolvedValue({
            response: { text: () => '```json\n[{"question":"Q","answer":"A"}]\n```' },
        })
        db.insert.mockReturnValue({
            values: vi.fn(() => ({
                returning: vi.fn().mockRejectedValue(new Error('db down')),
            })),
        })

        const result = await createInterview(validInput)

        expect(result.error).toBeTruthy()
    })

    it('creates an interview end to end on valid input', async () => {
        mockSignedInUser('user@example.com')
        chatSession.sendMessage.mockResolvedValue({
            response: { text: () => '```json\n[{"question":"Q","answer":"A"}]\n```' },
        })
        mockInsertSuccess('abc-123')

        const result = await createInterview(validInput)

        expect(result).toEqual({ mockId: 'abc-123' })
        expect(db.insert).toHaveBeenCalledTimes(1)
    })
})
