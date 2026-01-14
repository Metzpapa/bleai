'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface InteractiveScenarioProps {
  task: Task;
  onComplete: (videoBlob: Blob, audioBlob: Blob, conversationLog: ConversationMessage[]) => void;
  onCancel: () => void;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type ScenarioPhase = 'intro' | 'connecting' | 'conversation' | 'ending';

const getSupportedVideoMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

// Extract character info from task
function getScenarioCharacter(task: Task): { name: string; personality: string } {
  // Default character for "The Credit Taker" scenario
  if (task.id === 'dilemma') {
    return {
      name: 'Alex',
      personality: `You have TWO phases in this conversation:

PHASE 1 - EXPLAIN THE SCENARIO (do this first!):
When the conversation starts, briefly explain the situation to the user so they understand what's happening. Say something like:

"Hey! So here's the situation - we just wrapped up that big 3-month project together. You put in a ton of work on it, lots of late nights. We just got out of the presentation to leadership, and honestly, I might have gotten a bit more credit than I deserved. Leadership even mentioned I might be up for a promotion. Anyway, I wanted to chat with you about how you think it went. What's on your mind?"

PHASE 2 - ROLEPLAY AS ALEX:
After explaining, you become Alex - a friendly but somewhat oblivious coworker. You don't fully realize you took credit for their work. You're not a bad person, just a bit self-centered and unaware.

How to play Alex:
- Be friendly and casual
- If they bring up the credit issue, be genuinely confused at first
- You honestly think you contributed equally
- If they push back, you might get a little defensive but not mean
- If they handle it well and explain calmly, you can start to see their point
- Keep it natural - short responses, like a real conversation

Don't be robotic or follow a script. Just react naturally to what they say. This is practice for them, so give them a realistic experience.`,
    };
  }
  
  // Generic character for custom scenarios
  return {
    name: 'Jordan',
    personality: `You are playing a character in a practice scenario for the user.

First, briefly set the scene - explain what situation you're both in so the user understands the context. Then roleplay your character naturally.

Keep it conversational and realistic. Short responses, natural reactions. This is practice for them, so give them an authentic experience to work with.`,
  };
}

export function InteractiveScenario({ task, onComplete, onCancel }: InteractiveScenarioProps) {
  const [phase, setPhase] = useState<ScenarioPhase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [duration, setDuration] = useState(0);
  
  const sessionRef = useRef<RealtimeSession | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Video recorder (video + audio for playback)
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  
  // Audio recorder (audio-only, compressed, for transcription)
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const character = getScenarioCharacter(task);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);
  
  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore cleanup errors
      }
      sessionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    }
    
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, []);

  const attachStreamToPreview = useCallback(() => {
    if (!videoRef.current || !streamRef.current) {
      console.debug('[interactive] preview attach skipped', {
        hasVideo: !!videoRef.current,
        hasStream: !!streamRef.current,
      });
      return;
    }

    console.debug('[interactive] attaching stream to preview', {
      tracks: streamRef.current.getTracks().map((track) => track.kind),
    });
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.onloadedmetadata = () => {
      videoRef.current?.play().catch((err) => {
        console.warn('[interactive] preview play failed', err);
      });
    };
  }, []);

  useEffect(() => {
    if (phase === 'conversation') {
      attachStreamToPreview();
    }
  }, [attachStreamToPreview, phase]);
  
  const startConversation = async () => {
    setPhase('connecting');
    setError(null);
    
    try {
      // 1. Get ephemeral token from our API
      const tokenResponse = await fetch('/api/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: character.personality,
          voice: 'alloy', // You can change this to other voices
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token');
      }
      
      const { token } = await tokenResponse.json();
      
      // 2. Initialize camera for recording
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      
      streamRef.current = stream;
      console.debug('[interactive] getUserMedia success', {
        tracks: stream.getTracks().map((track) => track.kind),
      });
      attachStreamToPreview();
      
      // 3. Set up dual-stream recording (video+audio for playback, audio-only for transcription)
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported in this browser. Please try Chrome or Edge.');
      }
      
      videoChunksRef.current = [];
      audioChunksRef.current = [];
      
      const videoMimeType = getSupportedVideoMimeType();
      const audioMimeType = getSupportedAudioMimeType();
      
      // Video recorder (video + audio for playback)
      let videoRecorder: MediaRecorder;
      try {
        videoRecorder = videoMimeType
          ? new MediaRecorder(stream, { mimeType: videoMimeType })
          : new MediaRecorder(stream);
      } catch (err) {
        console.error('Failed to start video recording:', err);
        throw new Error('Failed to start recording. Please try a different browser.');
      }
      
      // Audio-only recorder (compressed, for transcription)
      const audioTracks = stream.getAudioTracks();
      const audioStream = new MediaStream(audioTracks);
      
      let audioRecorder: MediaRecorder;
      try {
        audioRecorder = audioMimeType
          ? new MediaRecorder(audioStream, { 
              mimeType: audioMimeType,
              audioBitsPerSecond: 32000, // 32kbps - plenty for speech
            })
          : new MediaRecorder(audioStream);
        console.log('[interactive] Audio recording at', audioMimeType, '32kbps');
      } catch (err) {
        console.error('Failed to start audio recording:', err);
        throw new Error('Failed to start audio recording. Please try a different browser.');
      }
      
      videoRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };
      
      audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      videoRecorderRef.current = videoRecorder;
      audioRecorderRef.current = audioRecorder;
      
      // 4. Create Realtime agent and session
      const agent = new RealtimeAgent({
        name: character.name,
        instructions: character.personality,
      });
      
      const session = new RealtimeSession(agent, {
        model: 'gpt-realtime',
      });
      
      // 5. Set up event listeners
      session.on('audio_start', () => {
        setIsAiSpeaking(true);
      });
      
      session.on('audio_stopped', () => {
        setIsAiSpeaking(false);
      });
      
      // Track conversation history
      session.on('history_added', (item) => {
        // Check if item has transcript content
        if (item.type === 'message' && item.content) {
          const content = item.content;
          // Handle different content types
          for (const part of content) {
            if (part.type === 'output_text' || part.type === 'input_text') {
              const text = 'text' in part ? part.text : '';
              if (text) {
                setConversationLog(prev => [...prev, {
                  role: item.role === 'assistant' ? 'assistant' : 'user',
                  content: text,
                  timestamp: (Date.now() - startTimeRef.current) / 1000,
                }]);
              }
            } else if (part.type === 'output_audio' || part.type === 'input_audio') {
              // Audio content - check for transcript
              const transcript = 'transcript' in part ? part.transcript : '';
              if (transcript) {
                setConversationLog(prev => [...prev, {
                  role: item.role === 'assistant' ? 'assistant' : 'user',
                  content: transcript,
                  timestamp: (Date.now() - startTimeRef.current) / 1000,
                }]);
              }
            }
          }
        }
      });
      
      sessionRef.current = session;
      
      // 6. Connect to the session
      await session.connect({ apiKey: token });
      
      // 7. Trigger AI to speak first
      // Send a brief trigger message to prompt the AI to start the conversation
      // The AI's instructions tell it to explain the scenario first
      session.sendMessage('(The user has just joined the conversation. Begin by explaining the scenario to them.)');
      
      // 8. Start both recorders and timer
      videoRecorder.start(1000);
      audioRecorder.start(1000);
      startTimeRef.current = Date.now();
      
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
      setPhase('conversation');
      
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      setPhase('intro');
      cleanup();
    }
  };
  
  const endConversation = useCallback(() => {
    setPhase('ending');
    
    // Stop the session
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    // Stop the timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    // Track when both recorders are done
    let videoStopped = false;
    let audioStopped = false;
    let videoBlob: Blob | null = null;
    let audioBlob: Blob | null = null;
    
    const onBothStopped = () => {
      if (videoStopped && audioStopped && videoBlob && audioBlob) {
        console.log('[interactive] Video:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('[interactive] Audio:', (audioBlob.size / 1024).toFixed(1), 'KB');
        
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Call completion handler with both blobs
        onComplete(videoBlob, audioBlob, conversationLog);
      }
    };
    
    // Stop video recorder
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.onstop = () => {
        const recordingType = videoRecorderRef.current?.mimeType || 'video/webm';
        videoBlob = new Blob(videoChunksRef.current, { type: recordingType });
        videoStopped = true;
        onBothStopped();
      };
      videoRecorderRef.current.stop();
    } else {
      videoStopped = true;
    }
    
    // Stop audio recorder
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.onstop = () => {
        const recordingType = audioRecorderRef.current?.mimeType || 'audio/webm';
        audioBlob = new Blob(audioChunksRef.current, { type: recordingType });
        audioStopped = true;
        onBothStopped();
      };
      audioRecorderRef.current.stop();
    } else {
      audioStopped = true;
    }
  }, [conversationLog, onComplete]);
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Intro phase
  if (phase === 'intro') {
    return (
      <Card className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          {/* Character avatar */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <User className="w-10 h-10 text-amber-500" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">{task.title}</h2>
            <p className="text-muted-foreground mt-2">
              Interactive Scenario with <span className="text-primary font-medium">{character.name}</span>
            </p>
          </div>
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium">Scenario Setup</h3>
          <p className="text-sm text-muted-foreground">
            {task.description}
          </p>
          <div className="text-sm text-muted-foreground border-t border-border pt-3 mt-3">
            <p className="font-medium text-foreground mb-1">How this works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You'll have a live conversation with {character.name}</li>
              <li>Your video will be recorded for analysis</li>
              <li>Speak naturally - {character.name} will respond in real-time</li>
              <li>End the conversation when you feel you've addressed the situation</li>
            </ul>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={startConversation} className="gap-2">
            <Phone className="w-4 h-4" />
            Start Conversation
          </Button>
        </div>
      </Card>
    );
  }
  
  // Connecting phase
  if (phase === 'connecting') {
    return (
      <Card className="p-8 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Connecting...</h2>
          <p className="text-muted-foreground">
            Setting up your conversation with {character.name}
          </p>
        </div>
      </Card>
    );
  }
  
  // Conversation phase
  if (phase === 'conversation') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isAiSpeaking 
                ? "bg-primary/20 text-primary animate-pulse" 
                : "bg-secondary text-muted-foreground"
            )}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{character.name}</p>
              <p className="text-xs text-muted-foreground">
                {isAiSpeaking ? 'Speaking...' : 'Listening...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono">{formatDuration(duration)}</span>
            </div>
            
            <Button 
              variant="destructive" 
              onClick={endConversation}
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Conversation
            </Button>
          </div>
        </div>
        
        {/* Video feed */}
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            
            {/* Recording indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white">Recording</span>
            </div>
            
            {/* AI speaking indicator */}
            {isAiSpeaking && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-sm text-white flex items-center gap-2">
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                    {character.name} is speaking...
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Conversation log (collapsible) */}
        {conversationLog.length > 0 && (
          <Card className="p-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Conversation transcript ({conversationLog.length} messages)
              </summary>
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {conversationLog.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className={cn(
                      "font-medium",
                      msg.role === 'assistant' ? 'text-primary' : 'text-foreground'
                    )}>
                      {msg.role === 'assistant' ? character.name : 'You'}:
                    </span>
                    <span className="text-muted-foreground ml-2">{msg.content}</span>
                  </div>
                ))}
              </div>
            </details>
          </Card>
        )}
      </div>
    );
  }
  
  // Ending phase
  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Wrapping up...</h2>
        <p className="text-muted-foreground">
          Saving your conversation for analysis
        </p>
      </div>
    </Card>
  );
}
