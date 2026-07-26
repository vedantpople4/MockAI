import { LoaderCircle } from 'lucide-react'

export default function Loading() {
    return (
        <div className='flex items-center justify-center p-20'>
            <LoaderCircle className='animate-spin h-10 w-10 text-primary' />
        </div>
    )
}
