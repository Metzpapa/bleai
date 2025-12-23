'use client';

import { Task } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Users, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onStart: (task: Task) => void;
  onEdit: (task: Task) => void;
  delay?: number;
}

const iconMap = {
  presentation: Mic,
  dilemma: Users,
  custom: Plus,
};

export function TaskCard({ task, onStart, onEdit, delay = 0 }: TaskCardProps) {
  const Icon = iconMap[task.icon];
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm",
        "hover:border-primary/50 hover:bg-card/80 transition-all duration-300",
        "cursor-pointer opacity-0 animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => onStart(task)}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        task.color
      )} />
      
      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-3 rounded-xl bg-primary/10 text-primary",
            "group-hover:bg-primary/20 transition-colors"
          )}>
            <Icon className="w-6 h-6" />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            {task.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        </div>
        
        {/* Footer */}
        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-secondary/50">
              {task.icon === 'presentation' ? '5 min' : '2-3 min'}
            </span>
            <span className="px-2 py-1 rounded-md bg-secondary/50">
              {task.icon === 'presentation' ? '20 pts' : '20 pts'}
            </span>
            {task.interactive && (
              <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">
                🎙️ Live AI
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}

// Add new task card
interface AddTaskCardProps {
  onClick: () => void;
  delay?: number;
}

export function AddTaskCard({ onClick, delay = 0 }: AddTaskCardProps) {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border-dashed border-2 border-border/50 bg-transparent",
        "hover:border-primary/50 hover:bg-card/30 transition-all duration-300",
        "cursor-pointer flex items-center justify-center min-h-[200px]",
        "opacity-0 animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
        <div className="p-4 rounded-full border-2 border-dashed border-current">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium">Create Custom Task</span>
      </div>
    </Card>
  );
}


