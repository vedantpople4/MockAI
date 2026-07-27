"use server"

import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import { chatSession } from '@/utils/GeminiAIModel'
import { currentUser } from '@clerk/nextjs/server'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { z } from 'zod'
import { checkRateLimit } from '@/utils/rateLimit'

const createInterviewSchema = z.object({
    jobPosition: z.string().trim().min(2, 'Job position is too short.').max(100, 'Job position is too long.'),
    jobDescription: z.string().trim().min(2, 'Job description is too short.').max(2000, 'Job description is too long.'),
    jobExperience: z.coerce.number().int().min(0, 'Years of experience must be 0 or more.').max(50, 'Years of experience must be 50 or less.'),
});

export async function createInterview(input) {
    const parsed = createInterviewSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Invalid input.' };
    }
    const { jobPosition, jobDescription, jobExperience } = parsed.data;

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
        return { error: 'You must be signed in to create an interview.' };
    }

    const { allowed } = checkRateLimit(`create-interview:${userEmail}`, { limit: 5, windowMs: 60_000 });
    if (!allowed) {
        return { error: 'You are creating interviews too quickly. Please wait a minute and try again.' };
    }

    const questionCount = process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT || 5;
    const inputPrompt = "Job Position: " + jobPosition + ", Job Description: " + jobDescription +
        ", Years of experience: " + jobExperience + ". Depending in the Job description, Job position and Years of experience, give me " +
        questionCount + " Interview question along with answers in JSON format. Give question and answers as field in JSON. Dont return any other text.";

    let mockJsonResponse;
    try {
        const result = await chatSession.sendMessage(inputPrompt);
        const rawText = result.response.text().replace('```json', '').replace('```', '');
        JSON.parse(rawText);
        mockJsonResponse = rawText;
    } catch (e) {
        return { error: 'Failed to generate interview questions. Please try again.' };
    }

    try {
        const inserted = await db.insert(MockInterview)
            .values({
                mockId: uuidv4(),
                jsonMockResp: mockJsonResponse,
                jobPosition,
                jobDescription,
                jobExperience,
                createdBy: userEmail,
                createdAt: moment().format('DD-MM-yyyy'),
                createdAtTimestamp: new Date(),
            }).returning({ mockId: MockInterview.mockId });

        return { mockId: inserted[0]?.mockId };
    } catch (e) {
        return { error: 'Failed to save the interview. Please try again.' };
    }
}
