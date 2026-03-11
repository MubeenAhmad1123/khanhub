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
            position: 'fixed', bottom: 100, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(16px)',
            color: '#fff',
            fontFamily: 'Poppins',
            fontWeight: 700,
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: 14,
            zIndex: 1000,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderLeft: '4px solid var(--accent, #FF0069)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeInUp 0.3s cubic-bezier(0.2, 0, 0, 1) forwards',
        }}>
            <span style={{ fontSize: 16 }}>✨</span>
            {message}
        </div>
    )
}
