import { db } from '@/utils/db'
import { MockInterview, UserAnswer } from '@/utils/schema'
import { currentUser } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import React from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function Feedback({ params }) {

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const interview = userEmail
        ? await db.select().from(MockInterview)
            .where(and(
                eq(MockInterview.mockId, params.interviewId),
                eq(MockInterview.createdBy, userEmail)
            ))
        : [];

    if (!interview[0]) {
        notFound();
    }

    const feedbackList = await db.select()
        .from(UserAnswer)
        .where(eq(UserAnswer.mockIdRef, params.interviewId))
        .orderBy(UserAnswer.id)

    return (
        <div className='p-10'>
            <h2 className='text-2xl font-bold text-primary'>Congratulations !</h2>
            <h2 className='font-bold text-2xl'>Here is your interview feedback</h2>

            {feedbackList?.length==0?
            <h2 className='font-bold text-xl text-gray-500'>No interview feedback record found</h2>
            :
            <>
            <h2 className='text-sm text-gray-500'>Find below the interview question, correct answer, your answer, rating and feedback for improvement</h2>
            {feedbackList && feedbackList.map((item, index) => (
                <Collapsible key={index} className='mt-5'>
                    <CollapsibleTrigger className='p-2 bg-secondary rounded-lg my-2 text-left flex justify-between gap-7 w-full'>
                    {item.question} <ChevronsUpDown className='h-5 w-5'/>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className='flex flex-col gap-2'>
                            <h2 className='text-red-500 p-2 border rounded-lg'><strong>Rating: </strong>{item.rating}</h2>
                            <h2 className='p-2 border rounded-lg bg-red-50 text-sm text-red-700'><strong>Your Answer: </strong>{item.userAns}</h2>
                            <h2 className='p-2 border rounded-lg bg-green-50 text-sm text-green-700'><strong>Correct Answer: </strong>{item.correctAns}</h2>
                            <h2 className='p-2 border rounded-lg bg-blue-50 text-sm text-blue-700'><strong>AI Feedback: </strong>{item.feedback}</h2>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
            <Link href='/dashboard' replace>
                <Button>Go Home</Button>
            </Link>
            </>
            }
        </div>
    )
}

export default Feedback
