import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    const client = getOpenAIClient();
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Convert to format OpenAI expects
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Create a File object for OpenAI
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    
    // Transcribe with word-level timestamps
    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });
    
    // Format response
    const result = {
      text: transcription.text,
      words: transcription.words?.map(word => ({
        word: word.word,
        start: word.start,
        end: word.end,
      })) || [],
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
