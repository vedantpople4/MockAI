import { Lightbulb, Volume2 } from 'lucide-react'
import React from 'react'

function QuestionsSection({ mockInterviewQuestion, activeQuestionIndex }) {

    const textToSpeach=(text)=>{
        if('speechSynthesis' in window){
            const speech = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(speech);
        } else {
            alert('Sorry, your browser does not support text to speech')
        }
    }

    return mockInterviewQuestion && (
        <div className='p-5 border rounded-lg my-10'>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
                {mockInterviewQuestion && mockInterviewQuestion.map((question, index) => (
                    <h2 className={`p-2 bg-secondary rounded-full 
                text-xs md:text-sm text-center cursor-pointer
                ${activeQuestionIndex == index && 'bg-orange-300 text-white'}`}>Question {index + 1}</h2>
                ))}

            </div>
            <h2 className='my-5 text-sm md:text-lg'>{mockInterviewQuestion[activeQuestionIndex]?.question}</h2>
            <Volume2 className='cursor-pointer' onClick={() => textToSpeach(mockInterviewQuestion[activeQuestionIndex]?.question)} />

            <div className='border rounded-lg p-5 bg-orange-300 mt-10'>
                <h2 className='flex gap-2 items-center'>
                    <Lightbulb />
                    <strong>Note:</strong>
                </h2>
                <h2 className='text-sm my-2'>{process.env.NEXT_PUBLIC_INTERVIEW_INFO}</h2>
            </div>
        </div>
    )
}

export default QuestionsSection