import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { currentUser } from '@clerk/nextjs/server'
import { desc, eq } from 'drizzle-orm';
import React from 'react'
import InterviewItemCard from './InterviewItemCard';

async function InterviewList() {

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const interviewList = userEmail
        ? await db.select()
            .from(MockInterview)
            .where(eq(MockInterview.createdBy, userEmail))
            .orderBy(desc(MockInterview.id))
        : [];

    return (
        <div>
            <h2 className='font-medium text-xl text-primary'>Previous Mock Interviews</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-3'>
                {interviewList&&interviewList.map((interview, index)=>(
                    <InterviewItemCard 
                    interview={interview}
                    key={index}/>
                ))}
            </div>
        </div>
    )
}

export default InterviewList