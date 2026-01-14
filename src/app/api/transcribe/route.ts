import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

// Vercel serverless function config
export const maxDuration = 60; // Allow up to 60 seconds for transcription (requires Pro plan, otherwise 10s)

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
    
    const fileSizeKB = (audioFile.size / 1024).toFixed(1);
    console.log('[transcribe] Received file:', audioFile.name, 'size:', fileSizeKB, 'KB', 'type:', audioFile.type);
    
    // Determine file extension and type based on what was sent
    // Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
    let fileName = 'audio.webm';
    let mimeType = 'audio/webm';
    
    if (audioFile.name.endsWith('.wav') || audioFile.type === 'audio/wav') {
      fileName = 'audio.wav';
      mimeType = 'audio/wav';
    } else if (audioFile.name.endsWith('.ogg') || audioFile.type === 'audio/ogg') {
      fileName = 'audio.ogg';
      mimeType = 'audio/ogg';
    } else if (audioFile.type.includes('webm')) {
      fileName = 'audio.webm';
      mimeType = 'audio/webm';
    }
    
    // Convert to format OpenAI expects using their helper (works better in serverless)
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const file = await toFile(audioBuffer, fileName, { type: mimeType });
    
    console.log('[transcribe] Sending to Whisper...');
    
    // Transcribe with word-level timestamps
    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });
    
    console.log('[transcribe] Success, text length:', transcription.text?.length);
    
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
