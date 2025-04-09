export interface Task {
  _id: string;  // Unique identifier
  title: string;
  description: string;
  priority: string; 
  dueDate: string; 
  completed: boolean;
  isLocked?:boolean;
  lockedBy?: string; 
  }