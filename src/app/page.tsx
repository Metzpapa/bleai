'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Task } from '@/lib/types';
import { TaskCard, AddTaskCard } from '@/components/task-card';
import { TaskEditor } from '@/components/task-editor';

export default function Home() {
  const router = useRouter();
  const { tasks, setEditingTask, editingTask } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  
  const handleStart = (task: Task) => {
    router.push(`/record/${task.id}`);
  };
  
  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };
  
  return (
    <main className="min-h-screen bg-grid relative overflow-hidden">
      {/* Background orbs */}
      <div className="gradient-orb -top-40 -left-40" />
      <div className="gradient-orb -bottom-40 -right-40" />
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center space-y-4 mb-16 opacity-0 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Skills Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practice presentations and workplace scenarios. Get AI-powered feedback 
            on your delivery, content, and soft skills.
          </p>
        </header>
        
        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={handleStart}
              onEdit={handleEdit}
              delay={100 + index * 100}
            />
          ))}
          
          <AddTaskCard 
            onClick={() => setIsCreating(true)}
            delay={100 + tasks.length * 100}
          />
        </div>
        
        {/* Instructions */}
        <div className="mt-16 text-center opacity-0 animate-fade-in delay-500">
          <p className="text-sm text-muted-foreground">
            Click a card to start recording • Edit rubrics with the pencil icon
          </p>
        </div>
      </div>
      
      {/* Task Editor Dialog */}
      <TaskEditor
        task={editingTask}
        onClose={() => setEditingTask(null)}
      />
      
      {/* New Task Dialog */}
      {isCreating && (
        <TaskEditor
          task={null}
          isNew
          onClose={() => setIsCreating(false)}
        />
      )}
    </main>
  );
}
