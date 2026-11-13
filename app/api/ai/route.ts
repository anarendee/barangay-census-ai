import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const { data: residents } = await supabase
      .from('residents')
      .select('first_name, last_name, gender, civil_status, occupation, is_voter, is_pwd, is_senior, is_4ps, households(purok, monthly_income)');

    const { data: inventory } = await supabase.from('inventory').select('*');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const context = `
      You are an AI Assistant for a Philippine Barangay Census & Governance System.
      Answer questions accurately using the provided live database records.
      You can count demographics, identify vulnerable sectors (Seniors, PWDs, 4Ps), draft formal Filipino/English barangay resolutions or blotter summaries, and summarize inventory.
      Residents Data: ${JSON.stringify(residents)}
      Inventory Data: ${JSON.stringify(inventory)}
    `;

    const result = await model.generateContent(`${context}\n\nRequest: ${prompt}`);
    return NextResponse.json({ reply: result.response.text() });
  } catch (error) {
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 500 });
  }
}
