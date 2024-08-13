"use client"
import useSpeechToText from 'react-hook-speech-to-text';
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import Webcam from 'react-webcam'
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { chatSession } from '@/utils/GeminiAIModel';
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
    const [userAnswer, setUserAnswer] = useState('');
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const {
        error,
        interimResult,
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
        setResults
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false
    });

    useEffect(() => {
        results.map((result) => (
            setUserAnswer(prevAns => prevAns + result?.transcript)
        ))
    }, [results])

    useEffect(() => {
        if (!isRecording && userAnswer.length > 10) {
            UpdateUserAnswer();
        }
        // if (userAnswer?.length < 10) {
        //     setLoading(false);
        //     toast('Error while saving your answer. Please record again.')
        //     return;
        // }
    }, [userAnswer])

    const StartStopRecording = async () => {
        if (isRecording) {
            stopSpeechToText()
        } else {
            startSpeechToText()
        }
    }

    const UpdateUserAnswer = async () => {

        console.log(userAnswer)
        setLoading(true);
        const feedbackPrompt = "Question:" + mockInterviewQuestion[activeQuestionIndex]?.question +
            ", User Answer:" + userAnswer + ", depending on question and user answer for given interview question " +
            " please give a rating for answer and feedback as area of improvement if any" +
            "in just 3-5 lines to improve it JSON format with rating field and feedback field";

        const result = await chatSession.sendMessage(feedbackPrompt);

        const mockJsonResp = (result.response.text()).replace('```json', '').replace('```', '')
        console.log(mockJsonResp);
        const JsonFeedbackResp = JSON.parse(mockJsonResp);
        console.log(user?.primaryEmailAddress?.emailAddress);
        const currUserEmail = user?.primaryEmailAddress?.emailAddress;

        const resp = await db.insert(UserAnswer)
            .values({
                mockIdRef: interviewData?.mockId,
                question: mockInterviewQuestion[activeQuestionIndex]?.question,
                correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                userAns: userAnswer,
                feedback: JsonFeedbackResp?.feedback,
                rating: JsonFeedbackResp?.rating,
                user: currUserEmail,
                createdAt: moment().format('DD-MM-yyyy'),
            })

        if (resp) {
            toast('User Answer recorded succesfully');
            setUserAnswer('');
            setResults([]);
        }
        setResults([]);
        setLoading(false);
    }


    return (
        <div className='flex items-center justify-center flex-col'>
            <div className='flex flex-col mt-20 bg-orange-50 justify-center items-center rounded-lg p-5'>
                <Image src={'/webcam.png'} width={200} height={200} className='absolute' />
                <Webcam
                    mirrored={true}
                    style={{
                        height: 300,
                        width: '100%',
                        zIndex: 10,
                    }}
                />
            </div>
            <Button
                disabled={loading}
                variant="outline" className="my-10"
                onClick={StartStopRecording}
            >
                {isRecording ?
                    <h2 className='text-red-500 flex gap-2'>
                        <Mic /> 'Stop Recording'
                    </h2>
                    :
                    'Record Answer'}
            </Button>
        </div>

    )
}

export default RecordAnswerSection