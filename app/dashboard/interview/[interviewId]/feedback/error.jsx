"use client"
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({ error, reset }) {
    return (
        <div className='p-10 flex flex-col items-center gap-4'>
            <h2 className='font-bold text-xl text-red-600'>Something went wrong</h2>
            <p className='text-sm text-gray-500'>{error?.message || 'An unexpected error occurred.'}</p>
            <div className='flex gap-3'>
                <Button onClick={() => reset()}>Try again</Button>
                <Link href='/dashboard'>
                    <Button variant='outline'>Back to Dashboard</Button>
                </Link>
            </div>
        </div>
    )
}
