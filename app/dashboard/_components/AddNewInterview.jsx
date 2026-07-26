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
import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createInterview } from '../_actions/createInterview'

function AddNewInterview() {
    const [openDialog, setOpenDialog] = useState(false)
    const [jobPosition, setJobPosition] = useState();
    const [jobDescription, setJobDescription] = useState();
    const [jobExperience, setJobExperience] = useState();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onSubmit = async(e) => {
        e.preventDefault()
        setLoading(true);

        const result = await createInterview({ jobPosition, jobDescription, jobExperience });

        if (result?.error) {
            toast(result.error);
            setLoading(false);
            return;
        }

        setOpenDialog(false);
        router.push('/dashboard/interview/'+result.mockId);
        setLoading(false);
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
                                    <LoaderCircle className='animate-spin'/>Generating Questions
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