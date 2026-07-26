import { Button } from '@/components/ui/button'
import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import { currentUser } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'
import WebcamPreview from './_components/WebcamPreview'

async function Interview({ params }) {

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const result = userEmail
        ? await db.select().from(MockInterview)
            .where(and(
                eq(MockInterview.mockId, params.interviewId),
                eq(MockInterview.createdBy, userEmail)
            ))
        : [];

    const interViewData = result[0];
    if (!interViewData) {
        notFound();
    }

    return (
        <div className='my-10'>
            <h2 className='font-bold text-2xl'>Let's get started</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>

                <div className='flex flex-col my-5 gap-3'>
                    <div className='flex flex-col p-5 rounded-lg border gap-5'>
                        <h2 className='text-lg'><strong>Job Role / Job Position: </strong>{interViewData.jobPosition}</h2>
                        <h2 className='text-lg'><strong>Job Description / Tech Stack: </strong>{interViewData.jobDescription}</h2>
                        <h2 className='text-lg'><strong>Years of Experience: </strong>{interViewData.jobExperience}</h2>
                    </div>
                    <div className='p-5 border rounded-lg border-yellow-500 bg-yellow-50'>
                        <h2 className='flex gap-2 items-center'><Lightbulb/><strong>Information</strong></h2>
                        <h2 className='mt-3'>{process.env.NEXT_PUBLIC_INFORMATION}</h2>
                    </div>
                </div>
                <WebcamPreview />
            </div>
            <div className='flex justify-end items-end'>
                <Link href={'/dashboard/interview/'+params.interviewId+'/start'}>
                    <Button>Start Interview</Button>
                </Link>
            </div>
        </div>
    )
}

export default Interview
