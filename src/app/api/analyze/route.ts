import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-3-flash-preview';

interface AnalyzeRequest {
  contactSheets: {
    timestamp: number;
    duration: number;
    imageDataUrl: string;
    frameTimestamps: number[];
  }[];
  transcription: {
    text: string;
    words: { word: string; start: number; end: number }[];
  };
  rubric: string;
  taskTitle: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { contactSheets, transcription, rubric, taskTitle } = body;
    
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }
    
    // Build the prompt with transcription and timing info
    const transcriptWithTimestamps = transcription.words
      .reduce((acc: string[], word, i) => {
        // Add timestamp every 10 words or at start
        if (i % 10 === 0) {
          const mins = Math.floor(word.start / 60);
          const secs = (word.start % 60).toFixed(1);
          acc.push(`[${mins}:${secs.padStart(4, '0')}]`);
        }
        acc.push(word.word);
        return acc;
      }, [])
      .join(' ');
    
    const systemPrompt = `You are an expert presentation coach and soft skills evaluator. You analyze video presentations and provide detailed, constructive feedback.

Your task is to evaluate a presentation based on the provided rubric. You will receive:
1. Contact sheets (image grids) showing frames from the video at different timestamps
2. A word-level transcription with timestamps
3. The evaluation rubric

Analyze both the visual elements (body language, eye contact, gestures, posture, attire) and the verbal elements (content, structure, clarity, pacing, filler words).

IMPORTANT: When providing feedback, reference specific timestamps so the user can review those moments.

You MUST respond with valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<area 1>", "<area 2>", ...],
  "feedback": [
    {
      "id": "<unique id>",
      "startTime": <seconds>,
      "endTime": <seconds>,
      "category": "<positive|improvement|critical>",
      "title": "<short title>",
      "feedback": "<detailed feedback>",
      "suggestion": "<optional actionable suggestion>"
    }
  ]
}

Categories:
- "positive": Something done well, reinforce this behavior
- "improvement": Area that could be better, not critical
- "critical": Significant issue that needs addressing

Provide 5-10 feedback items, covering different aspects and timestamps throughout the presentation.`;

    const userPrompt = `# Task: ${taskTitle}

## Rubric
${rubric}

## Transcription with Timestamps
${transcriptWithTimestamps}

## Full Transcript
${transcription.text}

Please analyze this presentation and provide your evaluation in the JSON format specified.`;

    // Build messages with images
    const imageContent = contactSheets.map((sheet, i) => ({
      type: 'image_url' as const,
      image_url: {
        url: sheet.imageDataUrl,
        detail: 'low' as const,
      },
    }));
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'BLE Skills Analyzer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              ...imageContent,
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', errorData);
      return NextResponse.json(
        { error: 'Analysis failed', details: errorData },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }
    
    // Parse JSON from response (handle potential markdown code blocks)
    let analysis;
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: content },
        { status: 500 }
      );
    }
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

