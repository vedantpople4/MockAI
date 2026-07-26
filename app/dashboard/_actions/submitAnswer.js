"use server"

import { db } from '@/utils/db'
import { UserAnswer } from '@/utils/schema'
import { chatSession } from '@/utils/GeminiAIModel'
import { currentUser } from '@clerk/nextjs/server'
import moment from 'moment'
import { z } from 'zod'
import { checkRateLimit } from '@/utils/rateLimit'

const submitAnswerSchema = z.object({
    mockIdRef: z.string().uuid('Invalid interview reference.'),
    question: z.string().trim().min(1, 'Question is required.').max(2000, 'Question is too long.'),
    correctAns: z.string().trim().max(5000, 'Correct answer is too long.').optional().default(''),
    userAns: z.string().trim().min(1, 'Your answer cannot be empty.').max(10000, 'Your answer is too long.'),
});

export async function submitAnswer(input) {
    const parsed = submitAnswerSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Invalid input.' };
    }
    const { mockIdRef, question, correctAns, userAns } = parsed.data;

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
        return { error: 'You must be signed in to submit an answer.' };
    }

    const { allowed } = checkRateLimit(`submit-answer:${userEmail}`, { limit: 10, windowMs: 60_000 });
    if (!allowed) {
        return { error: 'You are submitting answers too quickly. Please wait a moment and try again.' };
    }

    const feedbackPrompt = "Question:" + question +
        ", User Answer:" + userAns + ", depending on question and user answer for given interview question " +
        " please give a rating for answer and feedback as area of improvement if any" +
        "in just 3-5 lines to improve it JSON format with rating field and feedback field";

    let feedback;
    try {
        const result = await chatSession.sendMessage(feedbackPrompt);
        const rawText = result.response.text().replace('```json', '').replace('```', '');
        feedback = JSON.parse(rawText);
    } catch (e) {
        return { error: 'Failed to generate feedback for your answer. Please try again.' };
    }

    try {
        await db.insert(UserAnswer)
            .values({
                mockIdRef,
                question,
                correctAns,
                userAns,
                feedback: feedback?.feedback,
                rating: feedback?.rating,
                userEmail,
                createdAt: moment().format('DD-MM-yyyy'),
            })

        return { success: true };
    } catch (e) {
        return { error: 'Failed to save your answer. Please try again.' };
    }
}
