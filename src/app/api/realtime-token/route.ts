import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { instructions, voice } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    // Generate ephemeral token for Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: instructions || 'You are a helpful assistant.',
          audio: {
            output: { voice: voice || 'alloy' },
          },
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get ephemeral token:', error);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({ 
      token: data.value,
      expiresAt: data.expires_at 
    });
    
  } catch (error) {
    console.error('Realtime token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

