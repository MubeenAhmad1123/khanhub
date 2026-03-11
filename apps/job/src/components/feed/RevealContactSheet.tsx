'use client'
import { useState, useRef } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase-config'
import { useAuth } from '@/hooks/useAuth'
import { useFeedToast } from '@/components/ui/FeedToast'

interface RevealContactSheetProps {
    isOpen: boolean
    onClose: () => void
    targetUserId: string       // whose contact is being unlocked
    targetUserName?: string
    videoId?: string
    category?: string
}

// Upload payment screenshot to Cloudinary
// Uses the same credentials already in your .env
async function uploadScreenshotToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured. Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'payment_screenshots')  // organized in its own folder

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
    )

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.secure_url  // e.g. "https://res.cloudinary.com/yourcloud/image/upload/..."
}

// Wrap the upload with a timeout
async function uploadWithTimeout(file: File, timeoutMs = 30000): Promise<string> {
    return Promise.race([
        uploadScreenshotToCloudinary(file),
        new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Upload timed out. Check your internet and try again.')), timeoutMs)
        )
    ])
}

export function RevealContactSheet({
    isOpen, onClose, targetUserId, targetUserName, videoId, category
}: RevealContactSheetProps) {
    const { user } = useAuth()
    const { showToast } = useFeedToast()

    const [step, setStep] = useState<'info' | 'submit' | 'done'>('info')
    const [transactionId, setTransactionId] = useState('')
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string>('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScreenshotFile(file)
        const reader = new FileReader()
        reader.onload = () => setScreenshotPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    // Validate: user must provide at least one of transactionId OR screenshot
    const canSubmit = transactionId.trim().length > 0 || screenshotFile !== null

    const handleSubmit = async () => {
        if (!user) return
        if (!canSubmit) {
            setError('Please enter a Transaction ID or upload a screenshot.')
            return
        }

        setUploading(true)
        setError('')

        try {
            let screenshotUrl = ''

            // Upload screenshot to Cloudinary if provided
            if (screenshotFile) {
                screenshotUrl = await uploadWithTimeout(screenshotFile, 30000)
            }

            // Save to Firestore 'paymentRequests' collection
            await addDoc(collection(db, 'paymentRequests'), {
                // Who is paying
                requestedBy: user.uid,
                requestedByName: user.displayName || '',
                requestedByEmail: user.email || '',
                requestedByPhoto: user.photoURL || '',

                // Whose contact they want
                targetUserId,
                targetUserName: targetUserName || '',

                // Payment proof (at least one)
                transactionId: transactionId.trim() || null,
                screenshotUrl: screenshotUrl || null,       // ← URL only, not base64
                screenshotFileName: screenshotFile?.name || null,

                // Context
                videoId: videoId || null,
                category: category || null,
                amount: 1000,
                currency: 'PKR',

                // Status
                status: 'pending',      // pending → approved → rejected
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            showToast('✅ Proof submitted!')
            setStep('done')
        } catch (err: any) {
            console.error('Payment submission error:', err)
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 95, backdropFilter: 'blur(4px)',
                }}
            />

            {/* Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#fff',
                borderRadius: '20px 20px 0 0',
                padding: '16px 20px 48px',
                zIndex: 96,
                maxWidth: 600, margin: '0 auto',
                maxHeight: '90dvh',
                overflowY: 'auto',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}>
                {/* Drag handle */}
                <div style={{
                    width: 36, height: 4, borderRadius: 999,
                    background: '#E5E5E5', margin: '0 auto 20px',
                }} />

                {/* ── STEP 1: INFO ── */}
                {step === 'info' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                            <h2 style={{
                                fontFamily: 'Poppins', fontWeight: 800,
                                fontSize: 20, color: '#0A0A0A', margin: '0 0 6px',
                            }}>
                                Unlock Contact
                            </h2>
                            <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 14, margin: 0 }}>
                                Pay <strong style={{ color: '#0A0A0A' }}>Rs. 1,000</strong> to reveal {targetUserName ? `${targetUserName}'s` : "this user's"} contact info
                            </p>
                        </div>

                        {/* Bank details */}
                        <div style={{
                            background: '#F8F8F8', border: '1px solid #E5E5E5',
                            borderRadius: 14, padding: 16, marginBottom: 20,
                        }}>
                            <p style={{
                                fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
                                color: '#888', textTransform: 'uppercase',
                                letterSpacing: '0.08em', margin: '0 0 12px',
                            }}>
                                Payment Details
                            </p>
                            {[
                                { label: 'Bank', value: 'JazzCash / EasyPaisa' },
                                { label: 'Account #', value: '0300-0000000' },
                                { label: 'Account Name', value: 'KhanHub Pvt Ltd' },
                                { label: 'Amount', value: 'Rs. 1,000' },
                            ].map(row => (
                                <div key={row.label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    padding: '6px 0',
                                    borderBottom: '1px solid #F0F0F0',
                                }}>
                                    <span style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 13 }}>
                                        {row.label}
                                    </span>
                                    <span style={{
                                        color: '#0A0A0A', fontFamily: 'DM Sans',
                                        fontWeight: 600, fontSize: 13,
                                    }}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep('submit')}
                            style={{
                                width: '100%', padding: '14px',
                                background: '#FF0069', color: '#fff',
                                border: 'none', borderRadius: 12,
                                fontFamily: 'Poppins', fontWeight: 700,
                                fontSize: 15, cursor: 'pointer',
                            }}
                        >
                            I've Paid — Submit Proof →
                        </button>

                        <button onClick={onClose} style={{
                            width: '100%', marginTop: 10, padding: '12px',
                            background: 'none', border: 'none',
                            color: '#888', fontFamily: 'DM Sans',
                            fontSize: 13, cursor: 'pointer',
                        }}>
                            Cancel
                        </button>
                    </>
                )}

                {/* ── STEP 2: SUBMIT PROOF ── */}
                {step === 'submit' && (
                    <>
                        <h2 style={{
                            fontFamily: 'Poppins', fontWeight: 800,
                            fontSize: 18, color: '#0A0A0A',
                            margin: '0 0 6px', textAlign: 'center',
                        }}>
                            Submit Payment Proof
                        </h2>
                        <p style={{
                            color: '#888', fontFamily: 'DM Sans',
                            fontSize: 13, textAlign: 'center',
                            margin: '0 0 24px',
                        }}>
                            Provide your Transaction ID, upload a screenshot, or both.
                        </p>

                        {/* Transaction ID input */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                display: 'block', fontFamily: 'DM Sans',
                                fontWeight: 600, fontSize: 13, color: '#444',
                                marginBottom: 6,
                            }}>
                                Transaction ID <span style={{ color: '#888', fontWeight: 400 }}>(optional if screenshot provided)</span>
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="e.g. TXN123456789"
                                style={{
                                    width: '100%', padding: '12px 14px',
                                    background: '#F8F8F8',
                                    border: transactionId ? '1.5px solid #FF0069' : '1.5px solid #E5E5E5',
                                    borderRadius: 10, fontFamily: 'DM Sans',
                                    fontSize: 14, color: '#0A0A0A',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                            />
                        </div>

                        {/* Screenshot upload */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{
                                display: 'block', fontFamily: 'DM Sans',
                                fontWeight: 600, fontSize: 13, color: '#444',
                                marginBottom: 6,
                            }}>
                                Payment Screenshot <span style={{ color: '#888', fontWeight: 400 }}>(optional if Transaction ID provided)</span>
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotChange}
                                style={{ display: 'none' }}
                            />

                            {screenshotPreview ? (
                                /* Preview */
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={screenshotPreview}
                                        alt="Payment screenshot"
                                        style={{
                                            width: '100%', maxHeight: 200,
                                            objectFit: 'contain',
                                            borderRadius: 10,
                                            border: '1.5px solid #FF0069',
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            setScreenshotFile(null)
                                            setScreenshotPreview('')
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }}
                                        style={{
                                            position: 'absolute', top: 8, right: 8,
                                            background: 'rgba(0,0,0,0.6)',
                                            border: 'none', borderRadius: '50%',
                                            width: 28, height: 28,
                                            color: '#fff', cursor: 'pointer',
                                            fontSize: 14, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                /* Upload zone */
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: '2px dashed #D4D4D4',
                                        borderRadius: 10, padding: '28px 20px',
                                        textAlign: 'center', cursor: 'pointer',
                                        background: '#F8F8F8',
                                        transition: 'border-color 0.2s, background 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = '#FF0069'
                                            ; (e.currentTarget as HTMLElement).style.background = '#FFF5F8'
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = '#D4D4D4'
                                            ; (e.currentTarget as HTMLElement).style.background = '#F8F8F8'
                                    }}
                                >
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                                    <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 13, margin: 0 }}>
                                        Tap to upload screenshot
                                    </p>
                                    <p style={{ color: '#bbb', fontFamily: 'DM Sans', fontSize: 11, margin: '4px 0 0' }}>
                                        JPG, PNG accepted
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: '#FFF0F0', border: '1px solid #FFCDD2',
                                borderRadius: 8, padding: '10px 14px',
                                marginBottom: 16, color: '#C62828',
                                fontFamily: 'DM Sans', fontSize: 13,
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Must provide at least one hint */}
                        {!canSubmit && (
                            <p style={{
                                color: '#FF0069', fontFamily: 'DM Sans',
                                fontSize: 12, textAlign: 'center',
                                marginBottom: 12,
                            }}>
                                Please provide a Transaction ID or upload a screenshot
                            </p>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || uploading}
                            style={{
                                width: '100%', padding: '14px',
                                background: canSubmit ? '#FF0069' : '#E5E5E5',
                                color: canSubmit ? '#fff' : '#aaa',
                                border: 'none', borderRadius: 12,
                                fontFamily: 'Poppins', fontWeight: 700,
                                fontSize: 15, cursor: canSubmit ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                                transition: 'background 0.2s',
                            }}
                        >
                            {uploading ? (
                                <>
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.4)',
                                        borderTopColor: '#fff',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    Submitting...
                                </>
                            ) : (
                                '✅ Submit for Approval'
                            )}
                        </button>

                        <button onClick={() => setStep('info')} style={{
                            width: '100%', marginTop: 10, padding: '12px',
                            background: 'none', border: 'none',
                            color: '#888', fontFamily: 'DM Sans',
                            fontSize: 13, cursor: 'pointer',
                        }}>
                            ← Back
                        </button>
                    </>
                )}

                {/* ── STEP 3: DONE ── */}
                {step === 'done' && (
                    <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                        <h2 style={{
                            fontFamily: 'Poppins', fontWeight: 800,
                            fontSize: 20, color: '#0A0A0A', margin: '0 0 10px',
                        }}>
                            Submitted!
                        </h2>
                        <p style={{
                            color: '#666', fontFamily: 'DM Sans',
                            fontSize: 14, lineHeight: 1.6,
                            margin: '0 0 28px',
                        }}>
                            Your payment proof has been sent to the admin for review.
                            Contact info will be revealed within <strong>24 hours</strong> of approval.
                        </p>
                        <button onClick={onClose} style={{
                            background: '#FF0069', color: '#fff',
                            border: 'none', borderRadius: 12,
                            padding: '12px 32px',
                            fontFamily: 'Poppins', fontWeight: 700,
                            fontSize: 14, cursor: 'pointer',
                        }}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
