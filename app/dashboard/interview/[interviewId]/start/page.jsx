import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import { currentUser } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import React from 'react'
import StartInterviewClient from './_components/StartInterviewClient'

async function StartInterview({ params }) {

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const result = userEmail
        ? await db.select().from(MockInterview)
            .where(and(
                eq(MockInterview.mockId, params.interviewId),
                eq(MockInterview.createdBy, userEmail)
            ))
        : [];

    const interviewData = result[0];
    if (!interviewData) {
        notFound();
    }

    let mockInterviewQuestion = [];
    let parseError = false;
    try {
        const parsed = JSON.parse(interviewData.jsonMockResp);
        if (!Array.isArray(parsed)) throw new Error('Parsed questions are not an array');
        mockInterviewQuestion = parsed;
    } catch (e) {
        parseError = true;
    }

    return (
        <StartInterviewClient
            interviewData={interviewData}
            mockInterviewQuestion={mockInterviewQuestion}
            parseError={parseError}
        />
    )
}

export default StartInterview
