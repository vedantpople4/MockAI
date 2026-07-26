"use client"
import React, { useState } from 'react'
import QuestionsSection from './QuestionsSection'
import RecordAnswerSection from './RecordAnswerSection'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function StartInterviewClient({ interviewData, mockInterviewQuestion, parseError }) {

    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    if (parseError) {
        return (
            <div className='p-5 border rounded-lg my-10 bg-red-50 text-red-700'>
                <h2 className='font-bold text-lg'>This interview's questions couldn't be loaded</h2>
                <p className='text-sm mt-2'>The stored questions for this interview are corrupted. Please create a new interview.</p>
                <Link href={'/dashboard'}>
                    <Button className='mt-5'>Back to Dashboard</Button>
                </Link>
            </div>
        )
    }

    return (
        <div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
                <QuestionsSection
                    mockInterviewQuestion={mockInterviewQuestion}
                    activeQuestionIndex={activeQuestionIndex}
                />
                <RecordAnswerSection
                    mockInterviewQuestion={mockInterviewQuestion}
                    activeQuestionIndex={activeQuestionIndex}
                    interviewData={interviewData}
                />
            </div>
            <div className='flex justify-end gap-6'>
                {activeQuestionIndex>0 &&
                <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex-1)}>Previous Question</Button>}
                {activeQuestionIndex!=mockInterviewQuestion?.length-1&&
                <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex+1)}>Next Question</Button>}
                {activeQuestionIndex==mockInterviewQuestion?.length-1&&
                <Link href={'/dashboard/interview/'+interviewData?.mockId+'/feedback'}>
                 <Button>End Interview</Button>
                </Link>
               }
            </div>
        </div>
    )
}

export default StartInterviewClient
