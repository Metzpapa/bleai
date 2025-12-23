# BLE Skills Analyzer

AI-powered soft skills analysis for presentations and workplace scenarios. Record yourself, get detailed feedback with timestamps.

![BLE Skills Analyzer](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)

## Features

- **Video Recording** - Record presentations directly in browser
- **Contact Sheet Extraction** - Automatically samples frames for visual analysis
- **Word-Level Transcription** - OpenAI Whisper with precise timestamps
- **AI Analysis** - Gemini 3 Flash analyzes content, delivery, and body language
- **Timestamped Feedback** - Click feedback items to jump to relevant video moments
- **Guided Review Mode** - Step through feedback one by one
- **Custom Rubrics** - Create your own evaluation criteria

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd bleai
npm install
```

### 2. Set Up Environment Variables

Copy the example env file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment on Railway

1. Push your code to GitHub
2. Connect Railway to your repo
3. Add environment variables in Railway dashboard:
   - `OPENAI_API_KEY`
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Railway URL)
4. Deploy!

## How It Works

### Video Processing Pipeline

```
Video Recording
      │
      ▼
┌─────────────────────────────────────┐
│ 1. Frame Extraction                 │
│    - Sample every 0.5-1.5 seconds   │
│    - Create 3x3 contact sheets      │
│    - Max 50 sheets per video        │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 2. Audio Transcription              │
│    - OpenAI Whisper API             │
│    - Word-level timestamps          │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 3. AI Analysis                      │
│    - Gemini 3 Flash via OpenRouter  │
│    - Visual + verbal analysis       │
│    - Rubric-based evaluation        │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ 4. Feedback Review                  │
│    - Interactive video player       │
│    - Timeline markers               │
│    - Guided mode for step-by-step   │
└─────────────────────────────────────┘
```

### Contact Sheet Strategy

Instead of sending individual frames, we create contact sheets (3x3 grids of frames) to:
- Reduce API calls and costs
- Provide temporal context to the AI
- Keep token usage manageable

For a 5-minute video:
- Sample ~100 frames
- Group into ~11 contact sheets
- Each sheet shows 4.5 seconds of footage

## Pre-built Tasks

### 1. TED Talk Presentation
A 5-minute leadership presentation based on the BLE III curriculum. Evaluates:
- Content (habits, grit, everyday leadership)
- Presentation style (engagement, confidence, authenticity)
- Delivery (eye contact, voice, body language)

### 2. The Credit Taker (Interactive Scenario) 🎙️
**Live AI conversation!** Talk to "Alex", a coworker who just took credit for your work. Uses OpenAI's Realtime API for natural, real-time dialogue. Evaluates:
- Emotional intelligence
- Communication skills
- Problem-solving
- Conflict resolution
- Professionalism under pressure

### 3. Custom Tasks
Create your own by pasting any rubric!

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **State**: Zustand
- **Transcription**: OpenAI Whisper API
- **Vision AI**: Google Gemini 3 Flash (via OpenRouter)
- **Voice Agent**: OpenAI Realtime API (for interactive scenarios)
- **Video**: Browser MediaRecorder API

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── record/[taskId]/      # Recording flow
│   ├── review/[sessionId]/   # Feedback review
│   └── api/
│       ├── transcribe/       # Whisper endpoint
│       └── analyze/          # OpenRouter endpoint
├── components/
│   ├── ui/                   # shadcn components
│   ├── task-card.tsx         # Task selection cards
│   ├── task-editor.tsx       # Rubric editor dialog
│   ├── video-recorder.tsx    # Recording component
│   ├── processing-view.tsx   # Processing pipeline UI
│   └── feedback-review.tsx   # Video + feedback player
└── lib/
    ├── types.ts              # TypeScript types
    ├── store.ts              # Zustand store
    ├── contact-sheet.ts      # Frame extraction
    └── utils.ts              # Utilities
```

## License

MIT
