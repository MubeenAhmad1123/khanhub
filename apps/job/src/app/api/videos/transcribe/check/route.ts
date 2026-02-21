import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function POST(req: NextRequest) {
    if (!ASSEMBLYAI_API_KEY) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { videoId } = body;

        if (!videoId) {
            return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
        }

        // 1. Get Video Doc to get transcriptId
        const videoRef = doc(db, 'videos', videoId);
        const videoSnap = await getDoc(videoRef);

        if (!videoSnap.exists()) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        const videoData = videoSnap.data();
        const transcriptId = videoData.transcriptId;

        if (!transcriptId) {
            return NextResponse.json({ error: 'No transcript ID associated with this video' }, { status: 400 });
        }

        if (videoData.transcriptionStatus === 'completed') {
            return NextResponse.json({ status: 'completed', message: 'Already completed' });
        }

        // 2. Poll AssemblyAI
        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: {
                authorization: ASSEMBLYAI_API_KEY,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch transcript status' }, { status: 502 });
        }

        const data = await response.json();

        if (data.status === 'completed') {
            // 3. Process Results for Moderation

            // PII Detection using Entities
            const entities = data.entities || [];
            const foundPhone = entities.some((e: any) => e.entity_type === 'phone_number');
            const foundLocation = entities.some((e: any) => e.entity_type === 'location' || e.entity_type === 'address');

            // Content Safety (Profanity, etc.)
            const contentSafetyLabels = data.content_safety_labels?.results || [];
            const unsafeContent = contentSafetyLabels.some((label: any) =>
                (label.severity > 0.8) // High confidence of unsafe content
            );

            const aiFlags = [];
            if (foundPhone) aiFlags.push('phone_detected');
            if (foundLocation) aiFlags.push('location_detected');
            if (unsafeContent) aiFlags.push('unsafe_content');

            // 4. Update Firestore
            await updateDoc(videoRef, {
                transcriptionStatus: 'completed',
                transcriptionText: data.text,
                aiFlags: aiFlags,
                aiModerationStatus: aiFlags.length > 0 ? 'flagged' : 'approved',
                updatedAt: new Date(),
                // Store raw data if needed, or just relevant parts
                metadata: {
                    ...videoData.metadata,
                    duration: data.audio_duration,
                    confidence: data.confidence,
                }
            });

            return NextResponse.json({ status: 'completed', aiFlags });
        } else if (data.status === 'error') {
            await updateDoc(videoRef, {
                transcriptionStatus: 'failed',
                updatedAt: new Date(),
            });
            return NextResponse.json({ status: 'failed', error: data.error });
        } else {
            return NextResponse.json({ status: data.status });
        }

    } catch (error: any) {
        console.error('Check Status Route Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
