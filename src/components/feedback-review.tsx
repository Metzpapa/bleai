'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisResult, FeedbackItem, Transcription } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ThumbsUp,
  Target,
  Sparkles,
} from 'lucide-react';

interface FeedbackReviewProps {
  videoUrl: string;
  analysis: AnalysisResult;
  transcription?: Transcription;
}

export function FeedbackReview({ videoUrl, analysis, transcription }: FeedbackReviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeFeedback, setActiveFeedback] = useState<FeedbackItem | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [isGuidedMode, setIsGuidedMode] = useState(true);
  
  // Sort feedback by time
  const sortedFeedback = [...analysis.feedback].sort((a, b) => a.startTime - b.startTime);
  
  // Update time display
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);
  
  // Start guided mode on mount
  useEffect(() => {
    if (isGuidedMode && sortedFeedback.length > 0 && duration > 0) {
      jumpToFeedback(0);
    }
  }, [duration]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const jumpToFeedback = (index: number) => {
    if (index < 0 || index >= sortedFeedback.length) return;
    
    const feedback = sortedFeedback[index];
    setFeedbackIndex(index);
    setActiveFeedback(feedback);
    
    if (videoRef.current) {
      videoRef.current.currentTime = feedback.startTime;
      videoRef.current.pause();
    }
  };
  
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    videoRef.current.currentTime = newTime;
  };
  
  const handleFeedbackMarkerClick = (feedback: FeedbackItem) => {
    const index = sortedFeedback.findIndex(f => f.id === feedback.id);
    if (index !== -1) {
      jumpToFeedback(index);
    }
  };
  
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };
  
  const exitGuidedMode = () => {
    setIsGuidedMode(false);
    setActiveFeedback(null);
  };
  
  const getCategoryIcon = (category: FeedbackItem['category']) => {
    switch (category) {
      case 'positive':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'improvement':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  const getCategoryColor = (category: FeedbackItem['category']) => {
    switch (category) {
      case 'positive':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'improvement':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video and Timeline */}
      <div className="lg:col-span-2 space-y-4">
        {/* Video Player */}
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              playsInline
            />
            
            {/* Active feedback overlay */}
            {activeFeedback && (
              <div className="absolute bottom-20 left-4 right-4 animate-fade-in">
                <Card className={cn(
                  "p-4 border",
                  getCategoryColor(activeFeedback.category)
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      getCategoryColor(activeFeedback.category)
                    )}>
                      {getCategoryIcon(activeFeedback.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium truncate">{activeFeedback.title}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setActiveFeedback(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{activeFeedback.feedback}</p>
                      {activeFeedback.suggestion && (
                        <p className="text-sm mt-2 italic opacity-75">
                          💡 {activeFeedback.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="p-4 space-y-3">
            {/* Timeline */}
            <div 
              ref={timelineRef}
              className="relative h-8 bg-secondary/50 rounded-lg cursor-pointer group"
              onClick={handleTimelineClick}
            >
              {/* Progress bar */}
              <div 
                className="absolute top-0 left-0 h-full bg-primary/30 rounded-lg"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              
              {/* Feedback markers */}
              {sortedFeedback.map((feedback) => {
                const position = (feedback.startTime / duration) * 100;
                const width = ((feedback.endTime - feedback.startTime) / duration) * 100;
                
                return (
                  <div
                    key={feedback.id}
                    className={cn(
                      "absolute top-1 bottom-1 rounded cursor-pointer transition-all",
                      "hover:opacity-100",
                      activeFeedback?.id === feedback.id ? "opacity-100 ring-2 ring-white" : "opacity-60",
                      feedback.category === 'positive' && "bg-green-500/50",
                      feedback.category === 'improvement' && "bg-amber-500/50",
                      feedback.category === 'critical' && "bg-red-500/50",
                    )}
                    style={{ 
                      left: `${position}%`,
                      width: `${Math.max(width, 1)}%`,
                      minWidth: '8px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeedbackMarkerClick(feedback);
                    }}
                    title={feedback.title}
                  />
                );
              })}
              
              {/* Playhead */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-primary shadow-lg"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            {/* Playback controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, currentTime - 10);
                    }
                  }}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlay}
                  className="w-10 h-10"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration, currentTime + 10);
                    }
                  }}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground ml-2 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              {/* Guided mode navigation */}
              {isGuidedMode && sortedFeedback.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => jumpToFeedback(feedbackIndex - 1)}
                    disabled={feedbackIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    {feedbackIndex + 1} / {sortedFeedback.length}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => jumpToFeedback(feedbackIndex + 1)}
                    disabled={feedbackIndex === sortedFeedback.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exitGuidedMode}
                    className="ml-2"
                  >
                    Exit Guided Mode
                  </Button>
                </div>
              )}
              
              {!isGuidedMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsGuidedMode(true);
                    jumpToFeedback(0);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Guided Review
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Sidebar - Summary and Feedback List */}
      <div className="space-y-4">
        {/* Summary Card */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Summary</h3>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          
          {/* Strengths */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-500">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">Strengths</span>
            </div>
            <ul className="text-sm space-y-1">
              {analysis.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-green-500 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Areas for Improvement */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Areas to Improve</span>
            </div>
            <ul className="text-sm space-y-1">
              {analysis.areasForImprovement.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-amber-500 mt-1">•</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </Card>
        
        {/* Feedback List */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Detailed Feedback</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Click on any feedback to jump to that moment
            </p>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-2">
              {sortedFeedback.map((feedback, index) => (
                <button
                  key={feedback.id}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all",
                    "hover:bg-secondary/50",
                    activeFeedback?.id === feedback.id && "bg-secondary ring-1 ring-primary"
                  )}
                  onClick={() => jumpToFeedback(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded",
                      getCategoryColor(feedback.category)
                    )}>
                      {getCategoryIcon(feedback.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {feedback.title}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(feedback.startTime)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {feedback.feedback}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}


