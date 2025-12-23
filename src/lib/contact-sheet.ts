import { ContactSheet } from './types';

const MAX_SHEETS = 50;
const FRAMES_PER_SHEET = 9; // 3x3 grid
const FRAME_SIZE = 320; // Each frame in the grid
const GRID_SIZE = 3;

/**
 * Calculate the optimal sampling interval based on video duration
 */
export function calculateSamplingInterval(videoDurationSeconds: number): number {
  const idealInterval = 0.5; // seconds between frames
  const sheetDuration = FRAMES_PER_SHEET * idealInterval; // 4.5s
  const sheetsNeeded = videoDurationSeconds / sheetDuration;
  
  if (sheetsNeeded <= MAX_SHEETS) {
    return idealInterval;
  }
  
  // Scale up interval to fit in MAX_SHEETS
  const targetSheetDuration = videoDurationSeconds / MAX_SHEETS;
  return targetSheetDuration / FRAMES_PER_SHEET;
}

/**
 * Extract a single frame from video at a specific time
 */
async function extractFrame(
  video: HTMLVideoElement,
  time: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      
      // Draw the frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error(`Failed to seek to ${time}`));
    };
    
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

/**
 * Create a contact sheet (3x3 grid) from 9 frames
 */
async function createContactSheet(
  video: HTMLVideoElement,
  startTime: number,
  interval: number
): Promise<ContactSheet> {
  const sheetCanvas = document.createElement('canvas');
  const sheetSize = FRAME_SIZE * GRID_SIZE;
  sheetCanvas.width = sheetSize;
  sheetCanvas.height = sheetSize;
  const sheetCtx = sheetCanvas.getContext('2d')!;
  
  // Fill with dark background
  sheetCtx.fillStyle = '#1a1a1a';
  sheetCtx.fillRect(0, 0, sheetSize, sheetSize);
  
  // Temp canvas for individual frames
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = FRAME_SIZE;
  frameCanvas.height = FRAME_SIZE;
  const frameCtx = frameCanvas.getContext('2d')!;
  
  const frameTimestamps: number[] = [];
  
  for (let i = 0; i < FRAMES_PER_SHEET; i++) {
    const frameTime = startTime + (i * interval);
    
    // Don't exceed video duration
    if (frameTime >= video.duration) break;
    
    frameTimestamps.push(frameTime);
    
    try {
      // Extract frame
      await extractFrame(video, frameTime, frameCanvas, frameCtx);
      
      // Position in grid
      const col = i % GRID_SIZE;
      const row = Math.floor(i / GRID_SIZE);
      
      // Draw to contact sheet
      sheetCtx.drawImage(
        frameCanvas,
        col * FRAME_SIZE,
        row * FRAME_SIZE,
        FRAME_SIZE,
        FRAME_SIZE
      );
      
      // Add timestamp label
      sheetCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      sheetCtx.fillRect(
        col * FRAME_SIZE,
        row * FRAME_SIZE + FRAME_SIZE - 24,
        80,
        24
      );
      sheetCtx.fillStyle = '#fff';
      sheetCtx.font = '12px monospace';
      sheetCtx.fillText(
        formatTimestamp(frameTime),
        col * FRAME_SIZE + 6,
        row * FRAME_SIZE + FRAME_SIZE - 8
      );
    } catch (error) {
      console.warn(`Failed to extract frame at ${frameTime}s:`, error);
    }
  }
  
  return {
    timestamp: startTime,
    duration: interval * FRAMES_PER_SHEET,
    imageDataUrl: sheetCanvas.toDataURL('image/jpeg', 0.8),
    frameTimestamps,
  };
}

/**
 * Format seconds to MM:SS.ms
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Extract all contact sheets from a video
 */
export async function extractContactSheets(
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<ContactSheet[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const interval = calculateSamplingInterval(duration);
        const sheetDuration = interval * FRAMES_PER_SHEET;
        const totalSheets = Math.ceil(duration / sheetDuration);
        
        console.log(`Video duration: ${duration}s, Interval: ${interval}s, Sheets: ${totalSheets}`);
        
        const sheets: ContactSheet[] = [];
        
        for (let i = 0; i < totalSheets && i < MAX_SHEETS; i++) {
          const startTime = i * sheetDuration;
          
          const sheet = await createContactSheet(video, startTime, interval);
          sheets.push(sheet);
          
          onProgress?.((i + 1) / Math.min(totalSheets, MAX_SHEETS));
        }
        
        URL.revokeObjectURL(url);
        resolve(sheets);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Get video duration from blob
 */
export async function getVideoDuration(videoBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
}


