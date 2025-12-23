'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Circle, 
  Square, 
  RotateCcw,
  Check
} from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // seconds
}

export function VideoRecorder({ 
  onRecordingComplete, 
  onCancel,
  maxDuration = 600 // 10 minutes default max
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready before playing
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {
              // Ignore AbortError - happens when source changes quickly
            });
          };
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to access camera:', err);
        setError('Failed to access camera. Please ensure you have granted camera and microphone permissions.');
      }
    };
    
    initCamera();
    
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);
  
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    
    setIsRecording(true);
    setDuration(0);
    
    // Start duration timer
    durationIntervalRef.current = setInterval(() => {
      setDuration(d => {
        if (d >= maxDuration - 1) {
          stopRecording();
          return d;
        }
        return d + 1;
      });
    }, 1000);
  }, [maxDuration]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, [isRecording]);
  
  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    
    // Reset video to live stream
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Ignore AbortError
      });
    }
  }, [recordedUrl]);
  
  const handleSubmit = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  }, [recordedBlob, onRecordingComplete]);
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (error) {
    return (
      <Card className="p-8 text-center space-y-4">
        <VideoOff className="w-12 h-12 mx-auto text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Video Preview */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={!recordedUrl}
          playsInline
          src={recordedUrl || undefined}
          controls={!!recordedUrl}
        />
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className="relative">
              <Circle className="w-3 h-3 fill-red-500 text-red-500" />
              <div className="absolute inset-0 animate-pulse-ring">
                <Circle className="w-3 h-3 fill-red-500/50 text-red-500/50" />
              </div>
            </div>
            <span className="text-sm font-mono text-white">
              {formatDuration(duration)}
            </span>
          </div>
        )}
        
        {/* Duration display when reviewing */}
        {recordedUrl && !isRecording && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-sm font-mono text-white">
              Duration: {formatDuration(duration)}
            </span>
          </div>
        )}
        
        {/* Loading overlay */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="text-center space-y-2">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!recordedUrl ? (
          <>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isRecording}
            >
              Cancel
            </Button>
            
            {!isRecording ? (
              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={startRecording}
                disabled={!isInitialized}
              >
                <Circle className="w-4 h-4 fill-current" />
                Start Recording
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="gap-2 px-8"
                onClick={stopRecording}
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Recording
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={resetRecording}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </Button>
            
            <Button
              size="lg"
              className="gap-2 px-8"
              onClick={handleSubmit}
            >
              <Check className="w-4 h-4" />
              Submit for Analysis
            </Button>
          </>
        )}
      </div>
      
      {/* Tips */}
      {!isRecording && !recordedUrl && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Tips for a great recording:</p>
          <ul className="list-disc list-inside">
            <li>Ensure good lighting on your face</li>
            <li>Find a quiet environment</li>
            <li>Look at the camera as you would an audience</li>
          </ul>
        </div>
      )}
    </div>
  );
}


