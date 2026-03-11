'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

// Configure NProgress
NProgress.configure({
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08,
    easing: 'ease',
    speed: 400,
})

export default function RouteProgressBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        NProgress.done()
    }, [pathname, searchParams])

    return null
}

// Also export a function to start the bar:
export const startProgress = () => NProgress.start()
export const doneProgress = () => NProgress.done()
