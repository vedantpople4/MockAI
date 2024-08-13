"use client"
import React, {useState} from 'react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { chatSession } from '@/utils/GeminiAIModel'
import { LoaderCircle } from 'lucide-react'
import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import {v4 as uuidv4} from 'uuid'
import { useUser } from '@clerk/nextjs'
import moment from 'moment'
import { useRouter } from 'next/navigation'

function AddNewInterview() {
    const [openDialog, setOpenDialog] = useState(false)
    const [jobPosition, setJobPosition] = useState();
    const [jobDescription, setJobDescription] = useState();
    const [jobExperience, setJobExperience] = useState();
    const [loading, setLoading] = useState();
    const [jsonResponse, setJsonResponse] = useState([]);
    const {user}=useUser();
    const router = useRouter();

    const onSubmit = async(e) => {
        setLoading(true);
        e.preventDefault()
        console.log(jobPosition, jobDescription, jobExperience)

        const InputPrompt="Job Position: "+jobPosition+", Job Description: "+jobDescription+", Years of experience: "+jobExperience+". Depending in the Job description, Job position and Years of experience, give me "+process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT+"Interview question along with answers in JSON format. Give question and answers as field in JSON. Dont return any other text."

        const result = await chatSession.sendMessage(InputPrompt);
        const MockJsonResponse = (result.response.text()).replace('```json', '').replace('```','')
        //console.log(MockJsonResponse);
        setJsonResponse(MockJsonResponse);

        if(MockJsonResponse){
        const resp = await db.insert(MockInterview)
        .values({
            mockId: uuidv4(),
            jsonMockResp: MockJsonResponse,
            jobPosition: jobPosition,
            jobDescription: jobDescription,
            jobExperience: jobExperience,
            createdBy: user?.primaryEmailAddress?.emailAddress,
            createdAt: moment().format('DD-MM-yyyy')
        }).returning({mockId: MockInterview.mockId});

        console.log("Inserted ID: ", resp);
        if(resp){
            setOpenDialog(false);
            router.push('/dashboard/interview/'+resp[0]?.mockId)
            }
        } else {
            console.log("ERROR");
        }

        setLoading(false)
    }
    return (
        <div>
            <div className='p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all' 
            onClick={()=>setOpenDialog(true)}>
                <h2 className='font-bold text-lg'>+ Add New</h2>
            </div>
            <Dialog open={openDialog}>
                <DialogContent className='max-w-2xl'>
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Tell us more about job interview</DialogTitle>
                        <DialogDescription>
                            <form onSubmit={onSubmit}>                          
                            <div>
                                <h2>Add details about your job position. Ex. Description, Years of Experience, etc.</h2>

                                <div className='mt-7 my-3'>
                                    <label>Job Role/Job Position</label>
                                    <Input placeholder="Ex. Software Engineer" required
                                    onChange={(event)=>setJobPosition(event.target.value)}
                                    />
                                </div>
                                <div className='my-3'>
                                    <label>Job Description/ Tech Stack</label>
                                    <Textarea placeholder="Ex. React, Djano, NodeJs" required
                                    onChange={(event)=>setJobDescription(event.target.value)}
                                    />
                                </div>
                                <div className='my-3'>
                                    <label>Years of Experience</label>
                                    <Input placeholder="Ex. 2" type="number" max="50" required
                                    onChange={(event)=>setJobExperience(event.target.value)}
                                    />
                                </div>
                            </div>
                            <div className='flex gap-5 justify-end'>
                                <Button type="button" variant="ghost" onClick={()=>setOpenDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={loading}>
                                    {loading?
                                    <>
                                    <LoaderCircle className='animate-spin'/>'Generating Qustions'
                                    </> :'Start Interview'
                                    } </Button>
                            </div>
                            </form>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

        </div>
    )
}

export default AddNewInterview