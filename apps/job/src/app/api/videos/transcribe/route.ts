import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function POST(req: NextRequest) {
    if (!ASSEMBLYAI_API_KEY) {
        console.error('ASSEMBLYAI_API_KEY is missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { videoId, videoUrl } = body;

        if (!videoId || !videoUrl) {
            return NextResponse.json({ error: 'Missing videoId or videoUrl' }, { status: 400 });
        }

        // 1. Submit to AssemblyAI for transcription
        // We enable PII redaction and other audio intelligence features
        const response = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                authorization: ASSEMBLYAI_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: videoUrl,
                // Enable features for moderation
                redact_pii: true,
                redact_pii_policies: [
                    "phone_number",
                    "location",
                    "person_name"
                ],
                redact_pii_audio: false, // We just want to know, not beep it out necessarily, but redacting makes it safe
                auto_highlights: true,
                entity_detection: true,
                content_safety: true, // Detects profanity, hate speech, etc.
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('AssemblyAI Error:', error);
            return NextResponse.json({ error: 'Transcription submission failed' }, { status: 502 });
        }

        const data = await response.json();
        const transcriptId = data.id;

        // 2. Update Firestore Document with Transcript ID
        await updateDoc(doc(db, 'videos', videoId), {
            transcriptId: transcriptId,
            transcriptionStatus: 'processing', // defined in our Video schema
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, transcriptId });

    } catch (error: any) {
        console.error('Transcription Route Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
