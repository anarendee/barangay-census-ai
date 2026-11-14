import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Each model has its own separate Free Tier RPD quota in Google AI Studio.
// If the primary model hits its daily limit (429), it immediately falls back to the next model.
const MODEL_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

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

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in your environment variables.' },
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

    for (const modelName of MODEL_FALLBACK_CHAIN) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction:
                'You are an official AI assistant for Barangay Enrique JC Montilla, City of Tacurong, Sultan Kudarat. Provide clear, accurate, concise, and actionable governance, census, and administrative assistance.',
              temperature: 0.3,
            },
          }),
          15000 // 15s per model so Vercel never times out
        );

        const reply = response.text?.trim();
        if (reply) {
          return NextResponse.json({ reply, modelUsed: modelName });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed (${err?.status || err?.message}), trying next model...`);
        // Immediately move to the next model in MODEL_FALLBACK_CHAIN on 429, 503, or timeout
        continue;
      }
    }

    return NextResponse.json(
      {
        error:
          lastError?.message ||
          'All AI models are currently busy or out of daily quota. Please try again shortly.',
      },
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
