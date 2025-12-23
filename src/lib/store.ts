import { create } from 'zustand';
import { Task, RecordingSession, DEFAULT_TASKS } from './types';

interface AppState {
  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Current session
  currentSession: RecordingSession | null;
  setCurrentSession: (session: RecordingSession | null) => void;
  updateCurrentSession: (updates: Partial<RecordingSession>) => void;
  
  // UI state
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Tasks - initialized with defaults
  tasks: DEFAULT_TASKS,
  
  addTask: (task) => set((state) => ({ 
    tasks: [...state.tasks, task] 
  })),
  
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => 
      t.id === id ? { ...t, ...updates } : t
    )
  })),
  
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
  
  // Session
  currentSession: null,
  
  setCurrentSession: (session) => set({ currentSession: session }),
  
  updateCurrentSession: (updates) => set((state) => ({
    currentSession: state.currentSession 
      ? { ...state.currentSession, ...updates }
      : null
  })),
  
  // UI
  editingTask: null,
  setEditingTask: (task) => set({ editingTask: task }),
  
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
}));


