'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { VideoRecorder } from '@/components/video-recorder';
import { ProcessingView } from '@/components/processing-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Task } from '@/lib/types';

interface RecordPageProps {
  params: Promise<{ taskId: string }>;
}

export default function RecordPage({ params }: RecordPageProps) {
  const { taskId } = use(params);
  const router = useRouter();
  const { tasks, currentSession, setCurrentSession, updateCurrentSession } = useAppStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  useEffect(() => {
    const foundTask = tasks.find(t => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    } else {
      router.push('/');
    }
  }, [taskId, tasks, router]);
  
  const handleRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
    
    // Create a new session
    const sessionId = `session-${Date.now()}`;
    setCurrentSession({
      id: sessionId,
      taskId,
      videoBlob: blob,
      status: 'processing',
      createdAt: new Date(),
    });
  };
  
  const handleAnalysisComplete = (sessionId: string) => {
    router.push(`/review/${sessionId}`);
  };
  
  const handleCancel = () => {
    router.push('/');
  };
  
  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-grid relative overflow-hidden">
      {/* Background orbs */}
      <div className="gradient-orb -top-40 -left-40" />
      <div className="gradient-orb -bottom-40 -right-40" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to tasks
          </Button>
          
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <p className="text-muted-foreground mt-1">{task.description}</p>
        </header>
        
        {/* Content */}
        {!videoBlob ? (
          <VideoRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={handleCancel}
          />
        ) : (
          <ProcessingView
            videoBlob={videoBlob}
            task={task}
            onComplete={handleAnalysisComplete}
            onRetry={() => {
              setVideoBlob(null);
              setCurrentSession(null);
            }}
          />
        )}
      </div>
    </main>
  );
}


