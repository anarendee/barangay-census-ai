import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('Request timed out'), { status: 504 })),
        ms
      )
    ),
  ]);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in your .env.local file.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'A valid prompt string is required.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    // Retry gemini-3.8-flash up to 3 times with short backoff for temporary 503 demand spikes
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction:
                'You are an official AI assistant for Barangay Enrique JC Montilla, City of Tacurong, Sultan Kudarat. Provide clear, accurate, concise, and actionable governance, census, and administrative assistance.',
              temperature: 0.3,
            },
          }),
          20000 // 20-second timeout per attempt
        );

        const reply = response.text || 'No response generated.';
        return NextResponse.json({ reply });
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        if ((status === 503 || status === 504 || status === 429) && attempt < 3) {
          await sleep(1500 * attempt);
          continue;
        }
        break;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'AI service is temporarily busy. Please try again.' },
      { status: 503 }
    );
  } catch (err: any) {
    console.error('AI Route Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process AI request.' },
      { status: 500 }
    );
  }
}
