import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Task } from '../../models/task';
import { SocketService } from 'src/app/services/socket.service';
import { TaskService } from 'src/app/services/task.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  loadingSpinner: boolean = true;
  errorMessage: string = '';
  currentSocketId: string = ''; // current socket ID
  private subscriptions: Subscription[] = [];  // Store subscriptions

  constructor(
    private taskService: TaskService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTasks();

    // Listen for real-time task events
    this.subscriptions.push(
      this.socketService.onTaskCreated().subscribe((task: Task) => {
        this.tasks.push(task);
      }),
      this.socketService.onTaskUpdated().subscribe((task: Task) => {
        this.updateTask(task);
      }),
      this.socketService.onTaskDeleted().subscribe((taskId: string) => {
        this.deleteTaskFromList(taskId);
      })
    );

    // Get the current socket ID from the socket service
    this.subscriptions.push(
      this.socketService.getSocketId$().subscribe((socketId: string) => {
        this.currentSocketId = socketId;
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks: Task[]) => {
        this.tasks = tasks;
        this.loadingSpinner = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to load tasks.';
        this.loadingSpinner = false;
      }
    });
  }

  // Navigate to task form for creating a new task
  addTask(): void {
    this.router.navigate(['/task-form']);
  }

  // Navigate to task form for editing a task
  editTask(taskId: string): void {
    // You can pass mode as a query parameter if needed (e.g., mode: 'edit')
    this.router.navigate(['/task-form', { id: taskId, mode: 'edit' }]);
  }

  // Navigate to task form for deleting a task (to trigger confirm dialog)
  deleteTask(taskId: string): void {
    this.router.navigate(['/task-form', { id: taskId, mode: 'delete' }]);
  }

  // Update a task in the list when a task event comes via socket
  updateTask(updatedTask: Task): void {
    const index = this.tasks.findIndex(task => task._id === updatedTask._id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
    }
  }

  // Remove a deleted task from the list
  deleteTaskFromList(taskId: string): void {
    this.tasks = this.tasks.filter(task => task._id !== taskId);
  }
}
