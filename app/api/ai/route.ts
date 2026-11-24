import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable503(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded');
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });

          const reply = response.text?.trim() || '';
          if (reply) {
            return NextResponse.json({ reply });
          }
        } catch (err) {
          if (!isRetryable503(err)) {
            const message = err instanceof Error ? err.message : 'Unexpected AI server error.';
            return NextResponse.json({ error: message }, { status: 500 });
          }
          if (attempt === 0) {
            await sleep(800);
          }
        }
      }
    }

    return NextResponse.json(
      { error: 'AI service is temporarily busy (503). Please try again in a moment.' },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected AI server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}