import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const context = `
      You are an AI Assistant for Barangay Enrique JC Montilla, City of Tacurong, Philippines.
      If asked to draft or formalize a blotter narrative, legal purpose, or resolution, write a clear, formal, objective Philippine barangay document text directly without markdown asterisks or extra commentary.
      If asked an analytical question about census or inventory, use the live records below.
      Residents Data: ${JSON.stringify(residents || [])}
      Inventory Data: ${JSON.stringify(inventory || [])}
    `;

    const result = await model.generateContent(`${context}\n\nRequest: ${prompt}`);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error: any) {
    console.error('AI Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to connect to Gemini AI service.' },
      { status: 500 }
    );
  }
}
