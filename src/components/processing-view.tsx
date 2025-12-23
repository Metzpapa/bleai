'use client';

import { useState, useEffect } from 'react';
import { Task, ContactSheet, Transcription, AnalysisResult, ConversationMessage } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { extractContactSheets } from '@/lib/contact-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Film,
  AudioLines,
  Brain,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingViewProps {
  videoBlob: Blob;
  task: Task;
  conversationLog?: ConversationMessage[]; // For interactive scenarios
  onComplete: (sessionId: string) => void;
  onRetry: () => void;
}

type ProcessingStep = 'frames' | 'transcription' | 'analysis';

interface StepStatus {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress?: number;
  error?: string;
}

export function ProcessingView({ videoBlob, task, conversationLog, onComplete, onRetry }: ProcessingViewProps) {
  const { currentSession, updateCurrentSession } = useAppStore();
  const isInteractive = task.interactive;
  
  const [steps, setSteps] = useState<Record<ProcessingStep, StepStatus>>({
    frames: { status: 'pending' },
    transcription: { status: 'pending' },
    analysis: { status: 'pending' },
  });
  
  const [contactSheets, setContactSheets] = useState<ContactSheet[]>([]);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [overallError, setOverallError] = useState<string | null>(null);
  
  const updateStep = (step: ProcessingStep, update: Partial<StepStatus>) => {
    setSteps(prev => ({
      ...prev,
      [step]: { ...prev[step], ...update }
    }));
  };
  
  useEffect(() => {
    let cancelled = false;
    
    const process = async () => {
      try {
        // Start transcription immediately (in parallel with frame extraction)
        let transcriptionPromise: Promise<Transcription | null>;
        
        if (isInteractive) {
          // For interactive scenarios, use conversation log directly
          // NO word-level estimation - only accurate turn-level timestamps
          updateStep('transcription', { status: 'processing' });
          
          if (!conversationLog || conversationLog.length === 0) {
            console.warn('[processing] interactive session has no conversation log; skipping Whisper');
          }

          const transcriptionData = {
            text: (conversationLog ?? []).map(msg => 
              `${msg.role === 'assistant' ? '[AI]' : '[User]'}: ${msg.content}`
            ).join('\n'),
            words: [], // No word-level data - we only have turn-level timestamps
            turns: conversationLog ?? [], // Pass the actual turn data
          };
          
          updateStep('transcription', { status: 'complete' });
          transcriptionPromise = Promise.resolve(transcriptionData);
        } else {
          // For standard recordings, use Whisper
          updateStep('transcription', { status: 'processing' });
          
          transcriptionPromise = (async () => {
            const formData = new FormData();
            formData.append('audio', videoBlob, 'recording.webm');
            
            const transcribeResponse = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });
            
            if (!transcribeResponse.ok) {
              throw new Error('Transcription failed');
            }
            
            const transcriptionData = await transcribeResponse.json();
            
            if (cancelled) return null;
            
            updateStep('transcription', { status: 'complete' });
            return transcriptionData;
          })();
        }
        
        // Extract contact sheets in parallel
        updateStep('frames', { status: 'processing', progress: 0 });
        
        const framesPromise = (async () => {
          const sheets = await extractContactSheets(videoBlob, (progress) => {
            if (!cancelled) {
              updateStep('frames', { progress: progress * 100 });
            }
          });
          
          if (cancelled) return null;
          
          updateStep('frames', { status: 'complete', progress: 100 });
          return sheets;
        })();
        
        const [sheets, transcriptionData] = await Promise.all([framesPromise, transcriptionPromise]);
        
        if (cancelled || !sheets || !transcriptionData) return;
        
        setContactSheets(sheets);
        setTranscription(transcriptionData);
        
        // Step 3: Analyze with AI
        updateStep('analysis', { status: 'processing' });
        
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactSheets: sheets.map(s => ({
              timestamp: s.timestamp,
              duration: s.duration,
              imageDataUrl: s.imageDataUrl,
              frameTimestamps: s.frameTimestamps,
            })),
            transcription: transcriptionData,
            conversationLog: conversationLog,
            rubric: task.rubric,
            taskTitle: task.title,
            isInteractive: task.interactive,
          }),
        });
        
        if (!analyzeResponse.ok) {
          throw new Error('Analysis failed');
        }
        
        const analysisData = await analyzeResponse.json();
        
        if (cancelled) return;
        
        setAnalysis(analysisData);
        updateStep('analysis', { status: 'complete' });
        
        // Update session and navigate
        if (currentSession) {
          updateCurrentSession({
            status: 'complete',
            transcription: transcriptionData,
            analysis: analysisData,
            videoUrl: URL.createObjectURL(videoBlob),
          });
          
          // Small delay before navigation for UX
          setTimeout(() => {
            onComplete(currentSession.id);
          }, 500);
        }
        
      } catch (error) {
        console.error('Processing error:', error);
        if (!cancelled) {
          setOverallError(error instanceof Error ? error.message : 'Processing failed');
          
          // Mark current step as error
          const currentStep = Object.entries(steps).find(
            ([_, status]) => status.status === 'processing'
          )?.[0] as ProcessingStep | undefined;
          
          if (currentStep) {
            updateStep(currentStep, { 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Failed' 
            });
          }
        }
      }
    };
    
    process();
    
    return () => {
      cancelled = true;
    };
  }, [videoBlob, task, conversationLog, isInteractive]);
  
  const stepConfig = [
    {
      id: 'frames' as ProcessingStep,
      icon: Film,
      label: 'Extracting frames',
      description: 'Creating contact sheets from video',
    },
    {
      id: 'transcription' as ProcessingStep,
      icon: AudioLines,
      label: isInteractive ? 'Processing conversation' : 'Transcribing audio',
      description: isInteractive
        ? 'Using conversation log from live session' 
        : 'Converting speech to text with timestamps',
    },
    {
      id: 'analysis' as ProcessingStep,
      icon: Brain,
      label: 'Analyzing performance',
      description: 'AI is evaluating your presentation',
    },
  ];
  
  return (
    <Card className="p-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Processing your recording</h2>
        <p className="text-muted-foreground">
          This may take a minute depending on the length of your video
        </p>
      </div>
      
      <div className="space-y-4">
        {stepConfig.map((step, index) => {
          const status = steps[step.id];
          const Icon = step.icon;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg transition-colors",
                status.status === 'processing' && "bg-primary/5",
                status.status === 'complete' && "bg-green-500/5",
                status.status === 'error' && "bg-destructive/5",
              )}
            >
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-lg",
                status.status === 'pending' && "bg-muted text-muted-foreground",
                status.status === 'processing' && "bg-primary/10 text-primary",
                status.status === 'complete' && "bg-green-500/10 text-green-500",
                status.status === 'error' && "bg-destructive/10 text-destructive",
              )}>
                {status.status === 'processing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status.status === 'complete' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : status.status === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-medium",
                    status.status === 'pending' && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {status.status === 'complete' && (
                    <span className="text-xs text-green-500">Complete</span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {status.error || step.description}
                </p>
                
                {status.status === 'processing' && status.progress !== undefined && (
                  <Progress value={status.progress} className="h-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {overallError && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-destructive text-center">{overallError}</p>
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      )}
      
      {/* Preview of extracted sheets (small) */}
      {contactSheets.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Extracted {contactSheets.length} contact sheets
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {contactSheets.slice(0, 5).map((sheet, i) => (
              <img
                key={i}
                src={sheet.imageDataUrl}
                alt={`Sheet ${i + 1}`}
                className="w-20 h-20 rounded-md object-cover flex-shrink-0"
              />
            ))}
            {contactSheets.length > 5 && (
              <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  +{contactSheets.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
