'use client'
import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase-config'

type PaymentStatus = 'pending' | 'approved' | 'rejected'

interface PaymentRequest {
    id: string
    requestedBy: string
    requestedByName: string
    requestedByEmail: string
    requestedByPhoto: string
    targetUserId: string
    targetUserName: string
    transactionId: string | null
    screenshotUrl: string | null
    screenshotFileName: string | null
    videoId: string | null
    category: string | null
    amount: number
    currency: string
    status: PaymentStatus
    createdAt: any
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<PaymentRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | PaymentStatus>('pending')
    const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const snap = await getDocs(query(
                collection(db, 'paymentRequests'),
                orderBy('createdAt', 'desc')
            ))
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRequest)))
        } catch (err) {
            console.error('Error fetching payments:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPayments() }, [])

    const handleApprove = async (payment: PaymentRequest) => {
        setProcessing(payment.id)
        try {
            // 1. Update payment request status
            await updateDoc(doc(db, 'paymentRequests', payment.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            // 2. Store in 'unlockedContacts' so user can see contact info
            // Use current data to avoid overwriting other keys if needed, but simple update for now
            const userRef = doc(db, 'users', payment.requestedBy)
            const userSnap = await getDoc(userRef)
            const currentUnlocked = userSnap.exists() ? (userSnap.data().unlockedContacts || {}) : {}

            await updateDoc(userRef, {
                unlockedContacts: {
                    ...currentUnlocked,
                    [payment.targetUserId]: {
                        unlockedAt: new Date().toISOString(),
                        paymentRequestId: payment.id,
                    }
                }
            })

            // 3. Refresh list
            await fetchPayments()
        } catch (err) {
            console.error('Approval error:', err)
        } finally {
            setProcessing(null)
        }
    }

    const handleReject = async (paymentId: string) => {
        setProcessing(paymentId)
        try {
            await updateDoc(doc(db, 'paymentRequests', paymentId), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
            await fetchPayments()
        } catch (err) {
            console.error('Rejection error:', err)
        } finally {
            setProcessing(null)
        }
    }

    const filtered = payments.filter(p => filter === 'all' ? true : p.status === filter)
    const pendingCount = payments.filter(p => p.status === 'pending').length

    return (
        <div style={{ padding: '24px', fontFamily: 'DM Sans' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, margin: '0 0 4px', color: '#0A0A0A' }}>
                    💳 Payment Requests
                    {pendingCount > 0 && (
                        <span style={{
                            marginLeft: 10, background: '#FF0069',
                            color: '#fff', borderRadius: 999,
                            padding: '2px 10px', fontSize: 12,
                            fontFamily: 'DM Sans', fontWeight: 700,
                        }}>
                            {pendingCount} pending
                        </span>
                    )}
                </h1>
                <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
                    Review payment proofs and approve/reject contact unlocks
                </p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 16px', borderRadius: 999, border: 'none',
                            cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13,
                            background: filter === f ? '#FF0069' : '#F0F0F0',
                            color: filter === f ? '#fff' : '#444',
                            textTransform: 'capitalize',
                        }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '3px solid #FF0069', borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto',
                    }} />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
                    No {filter === 'all' ? '' : filter} payment requests
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(payment => (
                        <div key={payment.id} style={{
                            background: '#fff',
                            border: payment.status === 'pending' ? '2px solid #FF006922' : '1px solid #E5E5E5',
                            borderRadius: 14, padding: '16px 20px',
                            boxShadow: payment.status === 'pending' ? '0 2px 12px rgba(255,0,105,0.08)' : 'none',
                        }}>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>

                                {/* Requester info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                                    <img
                                        src={payment.requestedByPhoto || `https://ui-avatars.com/api/?name=${payment.requestedByName}&background=eee`}
                                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0A0A0A' }}>
                                            {payment.requestedByName || payment.requestedByEmail}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#888' }}>
                                            wants to contact <strong>{payment.targetUserName || 'a user'}</strong>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                                            {payment.createdAt?.toDate?.().toLocaleString('en-PK') || ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#FF0069', fontFamily: 'Syne' }}>
                                        Rs. {payment.amount?.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{payment.currency}</div>
                                </div>

                                {/* Status badge */}
                                <div style={{
                                    padding: '4px 12px', borderRadius: 999,
                                    fontSize: 12, fontWeight: 700,
                                    background: payment.status === 'pending' ? '#FFF3E0' :
                                        payment.status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                                    color: payment.status === 'pending' ? '#E65100' :
                                        payment.status === 'approved' ? '#2E7D32' : '#C62828',
                                    textTransform: 'capitalize',
                                    alignSelf: 'center',
                                }}>
                                    {payment.status === 'pending' ? '⏳' : payment.status === 'approved' ? '✅' : '❌'} {payment.status}
                                </div>
                            </div>

                            {/* Payment proof */}
                            <div style={{
                                marginTop: 14, padding: '12px 14px',
                                background: '#F8F8F8', borderRadius: 10,
                                display: 'flex', gap: 20, flexWrap: 'wrap',
                                alignItems: 'center',
                            }}>
                                {payment.transactionId && (
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>TRANSACTION ID</div>
                                        <div style={{
                                            fontFamily: 'JetBrains Mono, monospace',
                                            fontSize: 14, fontWeight: 700,
                                            color: '#0A0A0A',
                                            background: '#fff', padding: '4px 10px',
                                            borderRadius: 6, border: '1px solid #E5E5E5',
                                        }}>
                                            {payment.transactionId}
                                        </div>
                                    </div>
                                )}

                                {payment.screenshotUrl && (
                                    <div>
                                        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>SCREENSHOT</div>
                                        <img
                                            src={payment.screenshotUrl}
                                            alt="Payment screenshot"
                                            onClick={() => setSelectedScreenshot(payment.screenshotUrl!)}
                                            style={{
                                                height: 64, width: 'auto', borderRadius: 6,
                                                border: '1px solid #E5E5E5',
                                                cursor: 'zoom-in', objectFit: 'cover',
                                            }}
                                        />
                                    </div>
                                )}

                                {!payment.transactionId && !payment.screenshotUrl && (
                                    <span style={{ color: '#aaa', fontSize: 13 }}>No proof submitted</span>
                                )}
                            </div>

                            {/* Action buttons — only for pending */}
                            {payment.status === 'pending' && (
                                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                    <button
                                        onClick={() => handleApprove(payment)}
                                        disabled={processing === payment.id}
                                        style={{
                                            flex: 1, padding: '10px',
                                            background: '#00C896', color: '#fff',
                                            border: 'none', borderRadius: 10,
                                            fontFamily: 'DM Sans', fontWeight: 700,
                                            fontSize: 14, cursor: 'pointer',
                                            opacity: processing === payment.id ? 0.6 : 1,
                                        }}
                                    >
                                        {processing === payment.id ? '...' : '✅ Approve & Reveal'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(payment.id)}
                                        disabled={processing === payment.id}
                                        style={{
                                            flex: 1, padding: '10px',
                                            background: '#fff', color: '#FF3B30',
                                            border: '1.5px solid #FF3B30', borderRadius: 10,
                                            fontFamily: 'DM Sans', fontWeight: 700,
                                            fontSize: 14, cursor: 'pointer',
                                            opacity: processing === payment.id ? 0.6 : 1,
                                        }}
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Screenshot lightbox */}
            {selectedScreenshot && (
                <div
                    onClick={() => setSelectedScreenshot(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
                        zIndex: 200, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'zoom-out', padding: 20,
                    }}
                >
                    <img
                        src={selectedScreenshot}
                        style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 12 }}
                    />
                </div>
            )}
        </div>
    )
}