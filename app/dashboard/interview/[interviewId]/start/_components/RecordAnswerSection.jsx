"use client"
import useSpeechToText from 'react-hook-speech-to-text';
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import Webcam from 'react-webcam'
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { submitAnswer } from '@/app/dashboard/_actions/submitAnswer';

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
    const [userAnswer, setUserAnswer] = useState('');
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
        setLoading(true);

        const result = await submitAnswer({
            mockIdRef: interviewData?.mockId,
            question: mockInterviewQuestion[activeQuestionIndex]?.question,
            correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
            userAns: userAnswer,
        });

        if (result?.error) {
            toast(result.error);
            setLoading(false);
            return;
        }

        toast('User Answer recorded succesfully');
        setUserAnswer('');
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
                        <Mic /> Stop Recording
                    </h2>
                    :
                    'Record Answer'}
            </Button>
        </div>

    )
}

export default RecordAnswerSection