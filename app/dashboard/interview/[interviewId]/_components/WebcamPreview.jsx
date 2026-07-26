"use client"
import { Button } from '@/components/ui/button'
import { WebcamIcon } from 'lucide-react'
import React, { useState } from 'react'
import Webcam from 'react-webcam'

function WebcamPreview() {
    const [webCamEnabled, setWebCamEnabled] = useState(false);

    return (
        <div>
            {webCamEnabled ? <Webcam
                onUserMedia={() => setWebCamEnabled(true)}
                onUserMediaError={() => setWebCamEnabled(false)}
                mirrored={true}
                style={{
                    height: 300,
                    width: 300
                }}
                />
                :
                <>
                    <WebcamIcon className='h-72 w-full my-7 p-20 bg-secondary rounded-lg border' />
                    <Button variant="ghost" className="w-full" onClick={() => setWebCamEnabled(true)}>Enable Web Cam and Microphone</Button>
                </>
            }
        </div>
    )
}

export default WebcamPreview
