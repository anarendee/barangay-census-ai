import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in environment variables.' },
        { status: 500 }
      );
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: residents } = await supabase
      .from('residents')
      .select('first_name, last_name, gender, civil_status, occupation, is_voter, is_pwd, is_senior, is_4ps, households(purok, monthly_income)');

    const { data: inventory } = await supabase.from('inventory').select('*');

    const systemPrompt = `
      You are an AI Assistant for Barangay Enrique JC Montilla, City of Tacurong, Philippines.
      If asked to draft or formalize a blotter narrative, legal purpose, or resolution, write a clear, formal, objective Philippine barangay document text directly without markdown asterisks or extra commentary.
      If asked an analytical question about census or inventory, use the live records below.
      Residents Data: ${JSON.stringify(residents || [])}
      Inventory Data: ${JSON.stringify(inventory || [])}
    `;

    const geminiRes = await fetch(
      'https://googleapis.com',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nRequest: ${prompt}` }],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      return NextResponse.json(
        { error: geminiData?.error?.message || `Gemini API returned status ${geminiRes.status}` },
        { status: geminiRes.status }
      );
    }

    const text = geminiData?.candidates?.?.content?.parts?.?.text || 'No response generated.';
    return NextResponse.json({ reply: text });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to connect to Gemini AI service.' },
      { status: 500 }
    );
  }
}
