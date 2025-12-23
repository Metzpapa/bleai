// Task/Rubric types
export interface Task {
  id: string;
  title: string;
  description: string;
  rubric: string;
  icon: 'presentation' | 'dilemma' | 'custom';
  color: string;
}

// Feedback from AI
export interface FeedbackItem {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  category: 'positive' | 'improvement' | 'critical';
  title: string;
  feedback: string;
  suggestion?: string;
}

export interface AnalysisResult {
  overallScore: number; // 0-100
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  feedback: FeedbackItem[];
}

// Transcription types
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

export interface Transcription {
  text: string;
  words: TranscriptionWord[];
}

// Session types
export interface RecordingSession {
  id: string;
  taskId: string;
  videoBlob?: Blob;
  videoUrl?: string;
  transcription?: Transcription;
  analysis?: AnalysisResult;
  status: 'recording' | 'processing' | 'analyzing' | 'complete' | 'error';
  error?: string;
  createdAt: Date;
}

// Contact sheet types
export interface ContactSheet {
  timestamp: number; // start time in seconds
  duration: number; // how many seconds this sheet covers
  imageDataUrl: string; // base64 encoded image
  frameTimestamps: number[]; // individual frame timestamps
}

// Default tasks
export const DEFAULT_TASKS: Task[] = [
  {
    id: 'ted-talk',
    title: 'TED Talk Presentation',
    description: 'Deliver a 5-minute TED Talk showcasing your leadership development from BLE I–III',
    icon: 'presentation',
    color: 'from-violet-500/20 to-purple-500/20',
    rubric: `# BLE III Final Project – Part III: Lead – Your Leadership TED Talk

## Overview
This final project brings together everything you've learned in BLE I–III—Habits, Grit, and Everyday Leadership—to help you design your life intentionally and reflect on your growth as a leader.

In Part III, you will bring your leadership journey to life by delivering a TED Talk–style presentation. You'll share your story of growth—what you've learned, how you've developed, and how you plan to lead moving forward.

## Purpose
To help you:
- Reflect on your values, strengths, and leadership growth
- Communicate your leadership journey through authentic storytelling
- Inspire others by connecting your BLE experiences to your future vision
- Strengthen your public speaking and presentation skills

## Task
You will present a 5-minute TED Talk–style presentation that showcases your leadership development from BLE I–III and connects your insights to your future life designs.

This is your opportunity to tell your story as a leader—past, present, and future.

## Reflect On (Content Rubric - 15 pts)
Use these prompts to guide your talk:
- BLE I (Habits): What habits have shaped your leadership?
- BLE II (Grit): How have passion and perseverance fueled your growth?
- BLE III (Everyday Leadership): How have you practiced leadership in daily life?
- What actions, mindsets, or habits will sustain your leadership growth moving forward?
- How do your three life designs connect to your leadership vision and goals?

**Scoring:**
- 15 pts: All prompts are addressed thoughtfully
- 0 pts: All prompts are not addressed thoughtfully

## Presentation Guidelines (Style Rubric - 5 pts)
- Deliver in a TED Talk–style—engaging, confident, and authentic
- Use the classroom whiteboard or minimal visuals to enhance your story (no notes or cue cards)
- Keep your presentation within the 5-minute time limit
- Maintain strong eye contact, voice projection, and body language
- Dress Code: Business casual (no jeans, shorts, or flip-flops)

**Scoring:**
- 5 pts: All presentation guidelines are met
- 0 pts: Presentation guidelines are not met

## Total Points: 20`
  },
  {
    id: 'dilemma',
    title: 'The Credit Taker',
    description: 'Respond to a workplace dilemma where a colleague takes credit for your work',
    icon: 'dilemma',
    color: 'from-amber-500/20 to-orange-500/20',
    rubric: `# Workplace Dilemma: The Credit Taker

## Scenario
Your team just finished a major project that took 3 months to complete. You were the lead contributor, working late nights and weekends to ensure its success. 

During the final presentation to senior leadership, your colleague—who contributed minimally—presents your key insights as their own ideas. Leadership is impressed and praises them directly, even suggesting they might be ready for a promotion.

After the meeting, your colleague approaches you and says, "Great teamwork! I think that went really well."

## Your Task
Record a 2-3 minute response addressing:
1. How would you handle this situation in the moment?
2. What would you say to your colleague?
3. How would you ensure your contributions are recognized without damaging team dynamics?
4. What would you do differently to prevent this in the future?

## Evaluation Criteria (20 pts total)

### Emotional Intelligence (5 pts)
- Demonstrates self-awareness and emotional regulation
- Shows empathy while maintaining boundaries
- Avoids reactive or aggressive responses

### Communication Skills (5 pts)
- Clear and articulate delivery
- Uses "I" statements effectively
- Maintains professional tone

### Problem-Solving (5 pts)
- Proposes practical, actionable solutions
- Considers multiple perspectives
- Balances short-term and long-term outcomes

### Professionalism (5 pts)
- Maintains composure and confidence
- Shows leadership qualities
- Demonstrates ethical reasoning`
  }
];


