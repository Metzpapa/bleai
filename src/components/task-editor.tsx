'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

interface TaskEditorProps {
  task: Task | null;
  isNew?: boolean;
  onClose: () => void;
}

export function TaskEditor({ task, isNew = false, onClose }: TaskEditorProps) {
  const { addTask, updateTask, deleteTask } = useAppStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rubric, setRubric] = useState('');
  
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setRubric(task.rubric);
    } else {
      setTitle('');
      setDescription('');
      setRubric('');
    }
  }, [task]);
  
  const handleSave = () => {
    if (!title.trim() || !rubric.trim()) return;
    
    if (isNew) {
      const newTask: Task = {
        id: `custom-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || 'Custom evaluation task',
        rubric: rubric.trim(),
        icon: 'custom',
        color: 'from-emerald-500/20 to-teal-500/20',
      };
      addTask(newTask);
    } else if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        rubric: rubric.trim(),
      });
    }
    
    onClose();
  };
  
  const handleDelete = () => {
    if (task && !isNew) {
      deleteTask(task.id);
      onClose();
    }
  };
  
  const isPreset = task?.id === 'ted-talk' || task?.id === 'dilemma';
  
  return (
    <Dialog open={!!task || isNew} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Create Custom Task' : 'Edit Task'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Conflict Resolution Scenario"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the task"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rubric / Instructions
              <span className="text-muted-foreground ml-2 font-normal">
                (This is what the AI uses to evaluate)
              </span>
            </label>
            <Textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder={`Paste your rubric here. Include:
- Task description
- Evaluation criteria
- Scoring guidelines
- Any specific requirements`}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 gap-2">
          {!isNew && !isPreset && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !rubric.trim()}>
            {isNew ? 'Create Task' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


