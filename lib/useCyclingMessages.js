import { useEffect, useState } from 'react'

export function useCyclingMessages(active, messages, intervalMs = 1800) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (!active) {
            setIndex(0)
            return
        }
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % messages.length)
        }, intervalMs)
        return () => clearInterval(id)
    }, [active, messages, intervalMs])

    return messages[index]
}
