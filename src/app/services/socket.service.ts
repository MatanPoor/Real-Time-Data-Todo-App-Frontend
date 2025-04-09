import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task } from '../models/task';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private socketId$ = new BehaviorSubject<string>(''); // To store socket ID
  
  constructor() {
    // Initialize socket connection to the backend
    this.socket = io('http://localhost:5000');  // Backend URL

    // When socket connects, store the socket ID
    this.socket.on('socketId', (id: string) => {
      this.socketId$.next(id);
      console.log('Received socketId from server:', id);
    });
  }

 // Observable version for subscriptions (already exists and keep it)
getSocketId$(): Observable<string> {
    return this.socketId$.asObservable();
  }
  
  // Synchronous getter version for quick access like in onSubmit
  getSocketId(): string {
    return this.socketId$.getValue();
  }

  // Listen for task creation
  onTaskCreated(): Observable<Task> {
    return new Observable(observer => {
      this.socket.on('taskCreated', (task: Task) => {
        observer.next(task);
      });
    });
  }

  // Listen for task update
  onTaskUpdated(): Observable<Task> {
    return new Observable(observer => {
      this.socket.on('taskUpdated', (task: Task) => {
        observer.next(task);
      });
    });
  }

  // Listen for task deletion
  onTaskDeleted(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('taskDeleted', (taskId: string) => {
        observer.next(taskId);
      });
    });
  }

  // Listen for task locked event
  onTaskLocked(): Observable<{ taskId: string; lockedBy: string }> {
    return new Observable(observer => {
      this.socket.on('taskLocked', (data: { taskId: string; lockedBy: string }) => {
        observer.next(data);
      });
    });
  }

  // Listen for task unlocked event
  onTaskUnlocked(): Observable<{ taskId: string; lockedBy: string }> {
    return new Observable(observer => {
      this.socket.on('taskUnlocked', (data: { taskId: string; lockedBy: string }) => {
        observer.next(data);
      });
    });
  }

  // Listen for task lock error (when task is already locked)
  onTaskLockError(): Observable<{ taskId: string; message: string; lockedBy:string|null ;}> {
    return new Observable(observer => {
      this.socket.on('taskLockError', (data: { taskId: string; message: string; lockedBy:string|null }) => {
        observer.next(data);
      });
    });
  }

  // Listen for task unlock error (when task isn't locked by this user)
  onTaskUnlockError(): Observable<{ taskId: string; message: string }> {
    return new Observable(observer => {
      this.socket.on('taskUnlockError', (data: { taskId: string; message: string }) => {
        observer.next(data);
      });
    });
  }

  // Emit task lock event
  emitTaskLock(taskId: string, socketId: string): void {
    this.socket.emit('lockTask', { taskId, socketId });
  }

  // Emit task unlock event
  emitTaskUnlock(taskId: string, socketId: string): void {
    this.socket.emit('unlockTask', { taskId, socketId });
  }

  // Disconnect the socket connection
  disconnect(): void {
    this.socket.disconnect();
  }
}
