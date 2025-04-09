import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit, OnDestroy {
  taskForm!: FormGroup;
  isEditMode = false;
  isDeleteMode = false;
  taskId: string  = "";
  submitting = false;
  isLocked = false;
  lockedBy: string | null = null;  // Track who locked the task
  socketId = ''; // current socket ID
  subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private router: Router,
    private dialog: MatDialog,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    // Subscribe to get the socket ID
    this.subscriptions.push(
      this.socketService.getSocketId$().subscribe(id => {
        this.socketId = id;
        console.log('Socket ID:', this.socketId);
      })
    );
    
    // Get parameters and determine mode
    this.taskId = this.route.snapshot.paramMap.get('id')??"";
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (this.taskId && mode === 'delete') {
      this.isDeleteMode = true;
      this.isEditMode = false;
    } else {
      this.isEditMode = !!this.taskId;
      this.isDeleteMode = mode === 'delete';
    }

    // Initialize form
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      priority: ['Low', Validators.required],
      dueDate: [null, Validators.required],
      completed: [false]
    });

    // If editing, load the task and lock it
    if (this.taskId && !this.isDeleteMode) {
      this.taskService.getTaskById(this.taskId).subscribe({
        next: (task: Task) => {
          this.taskForm.patchValue({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate) : null
          });
          // Lock the task immediately
          this.lockTask();
        },
        error: () => alert('Failed to load task.')
      });
    }

    // Listen for lock and unlock errors
    this.subscriptions.push(
      this.socketService.onTaskLockError().subscribe(data => {
        console.log('Received task lock error:', data);
        if (data.taskId === this.taskId) {
          this.isLocked = true;
          this.lockedBy = data.lockedBy;
          alert(`This task is locked by ${this.lockedBy}. You cannot edit it.`);
          this.router.navigate(['/']);  // Optionally navigate away from the task
        }
      }),
      this.socketService.onTaskUnlockError().subscribe(data => {
        console.log('Received task unlock error:', data);
        if (data.taskId === this.taskId) {
          alert('You cannot unlock this task because you are not the owner.');
        }
      })
    );
  }

  // Lock the task: emit the lock event via the socket service
  lockTask(): void {
    if (!this.socketId || !this.taskId) {
      console.error('Socket ID or Task ID missing!');
      return;
    }
    // Prevent multiple lock attempts
    if (this.isLocked) {
      alert('Task is already locked by someone else.');
      return;
    }
    this.socketService.emitTaskLock(this.taskId, this.socketId);
    this.isLocked = true;
  }

  // Unlock the task: emit the unlock event
  unlockTask(): void {
    if (this.taskId && this.socketId) {
      this.socketService.emitTaskUnlock(this.taskId, this.socketId);
      this.isLocked = false;
    }
  }

  onSubmit(): void {
    if (this.taskForm.invalid) return;
    this.submitting = true;
  
    // let socketId : string = "";
    const socketId = this.socketService.getSocketId();
  
    const formValue = this.taskForm.value;
    const taskData: Task = {
      _id: this.taskId || '',
      title: formValue.title,
      description: formValue.description,
      priority: formValue.priority,
      dueDate: formValue.dueDate instanceof Date
        ? formValue.dueDate.toISOString()
        : new Date(formValue.dueDate).toISOString(),
      completed: formValue.completed,
      isLocked: true,               // ✅ still locked during update
      lockedBy: socketId            // ✅ use consistent ID
    };
  
    const saveObservable = this.isEditMode
      ? this.taskService.updateTask(taskData)
      : this.taskService.createTask(taskData);
  
    saveObservable.subscribe({
      next: () => {
        this.socketService.emitTaskUnlock(this.taskId, socketId); // ✅ Unlock via service
        this.router.navigate(['/']);
      },
      error: () => {
        this.submitting = false;
        alert('Failed to save task.');
      }
    });
  }

  confirmAndDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: 'Are you sure you want to delete this task?' }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Only delete if confirmed
        if (this.taskId) {
          this.taskService.deleteTask(this.taskId).subscribe({
            next: () => {
              this.unlockTask();
              this.router.navigate(['/']); // Navigate to the task list after deletion
            },
            error: () => alert('Failed to delete task.')
          });
        }
      } else {
        this.router.navigate(['/']); // Navigate to the task list if canceled
      }
    });
  }

  cancel(): void {
    this.unlockTask();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    // Unlock the task when leaving the component (if needed)
    if (this.isEditMode && this.taskId && !this.isDeleteMode) {
      this.unlockTask();
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
