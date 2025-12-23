import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-3-flash-preview';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AnalyzeRequest {
  contactSheets: {
    timestamp: number;
    duration: number;
    imageDataUrl: string;
    frameTimestamps: number[];
  }[];
  transcription: {
    text: string;
    words?: { word: string; start: number; end: number }[];
    turns?: ConversationMessage[]; // For interactive scenarios - turn-level timestamps only
  };
  conversationLog?: ConversationMessage[];
  rubric: string;
  taskTitle: string;
  isInteractive?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { contactSheets, transcription, conversationLog, rubric, taskTitle, isInteractive } = body;
    
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }
    
    // Build the prompt with transcription and timing info
    let transcriptWithTimestamps: string;
    
    if (isInteractive && transcription.turns && transcription.turns.length > 0) {
      // For interactive scenarios: use turn-level timestamps (accurate)
      transcriptWithTimestamps = transcription.turns.map(turn => {
        const mins = Math.floor(turn.timestamp / 60);
        const secs = (turn.timestamp % 60).toFixed(1);
        const speaker = turn.role === 'assistant' ? 'Alex' : 'User';
        return `[${mins}:${secs.padStart(4, '0')}] ${speaker}: ${turn.content}`;
      }).join('\n');
    } else if (transcription.words && transcription.words.length > 0) {
      // For standard recordings: use word-level timestamps from Whisper
      transcriptWithTimestamps = transcription.words
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
    } else {
      // Fallback: just use the text
      transcriptWithTimestamps = transcription.text;
    }
    
    // Different system prompts for interactive vs standard
    const systemPrompt = isInteractive 
      ? `You are an expert soft skills coach specializing in workplace communication and conflict resolution. You analyze recorded conversations and provide detailed, constructive feedback.

Your task is to evaluate an interactive conversation scenario based on the provided rubric. You will receive:
1. Contact sheets (image grids) showing frames from the video at different timestamps
2. The conversation transcript between the user and an AI character
3. Audio transcription of what the user said
4. The evaluation rubric

Analyze:
- How the user handled the difficult conversation
- Their communication style, tone, and word choices
- Body language, facial expressions, and composure (from video)
- Problem-solving approach and conflict resolution skills
- Emotional intelligence and empathy demonstrated
- Professionalism and assertiveness balance

IMPORTANT: When providing feedback, reference specific timestamps so the user can review those moments.

You MUST respond with valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment of how they handled the scenario>",
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
- "positive": Something done well - good communication technique, appropriate response
- "improvement": Could be handled better - missed opportunity, slightly off tone
- "critical": Significant issue - unprofessional, escalating, or ineffective approach

Provide 5-10 feedback items, covering different moments in the conversation.`
      : `You are an expert presentation coach and soft skills evaluator. You analyze video presentations and provide detailed, constructive feedback.

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

    // Build conversation log section for interactive scenarios
    let conversationSection = '';
    if (isInteractive && conversationLog && conversationLog.length > 0) {
      conversationSection = `\n## Conversation Log
${conversationLog.map(msg => {
  const mins = Math.floor(msg.timestamp / 60);
  const secs = (msg.timestamp % 60).toFixed(1);
  const speaker = msg.role === 'assistant' ? 'Alex (AI Character)' : 'User';
  return `[${mins}:${secs.padStart(4, '0')}] ${speaker}: ${msg.content}`;
}).join('\n')}`;
    }

    const userPrompt = `# Task: ${taskTitle}

## Rubric
${rubric}
${conversationSection}
## Audio Transcription with Timestamps
${transcriptWithTimestamps}

## Full Audio Transcript
${transcription.text}

Please analyze this ${isInteractive ? 'conversation' : 'presentation'} and provide your evaluation in the JSON format specified.`;

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
