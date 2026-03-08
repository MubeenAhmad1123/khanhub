'use client'
import { useState, useEffect } from 'react'

let toastFn: ((msg: string) => void) | null = null

export function useFeedToast() {
    const showToast = (msg: string) => {
        if (toastFn) toastFn(msg)
    }
    return { showToast }
}

export function FeedToastProvider() {
    const [message, setMessage] = useState('')
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        toastFn = (msg: string) => {
            setMessage(msg)
            setVisible(true)
            setTimeout(() => setVisible(false), 2500)
        }
        return () => { toastFn = null }
    }, [])

    if (!visible) return null

    return (
        <div style={{
            position: 'fixed', bottom: 90, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'DM Sans',
            fontSize: 13, padding: '10px 18px',
            borderRadius: 999, zIndex: 999,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            animation: 'fadeInUp 0.2s ease',
        }}>
            {message}
        </div>
    )
}
