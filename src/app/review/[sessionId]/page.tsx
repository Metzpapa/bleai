'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { FeedbackReview } from '@/components/feedback-review';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { currentSession, tasks } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if we have a valid session
    if (!currentSession || currentSession.id !== sessionId) {
      // Session not found, redirect home
      router.push('/');
      return;
    }
    
    if (currentSession.status !== 'complete' || !currentSession.analysis) {
      // Session not complete, redirect home
      router.push('/');
      return;
    }
    
    setIsLoading(false);
  }, [currentSession, sessionId, router]);
  
  if (isLoading || !currentSession?.analysis || !currentSession?.videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const task = tasks.find(t => t.id === currentSession.taskId);
  
  return (
    <main className="min-h-screen bg-grid relative overflow-hidden">
      {/* Background orbs */}
      <div className="gradient-orb -top-40 -left-40" />
      <div className="gradient-orb -bottom-40 -right-40" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to tasks
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {task?.title || 'Feedback Review'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Review your performance and AI feedback
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {currentSession.analysis.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </header>
        
        <FeedbackReview
          videoUrl={currentSession.videoUrl}
          analysis={currentSession.analysis}
          transcription={currentSession.transcription}
        />
      </div>
    </main>
  );
}


