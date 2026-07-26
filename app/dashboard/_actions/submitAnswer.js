"use server"

import { db } from '@/utils/db'
import { UserAnswer } from '@/utils/schema'
import { chatSession } from '@/utils/GeminiAIModel'
import { currentUser } from '@clerk/nextjs/server'
import moment from 'moment'

export async function submitAnswer({ mockIdRef, question, correctAns, userAns }) {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
        return { error: 'You must be signed in to submit an answer.' };
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
