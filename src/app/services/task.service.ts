import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Task } from '../models/task';  

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  // Directly defining the base URL here
  private readonly BASE_URL = 'http://localhost:5000';  
  private apiUrl = `${this.BASE_URL}/tasks`;  // Define the full API URL for tasks

  constructor(private http: HttpClient) {}

  // Get all tasks
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl).pipe(
      catchError(this.handleError)  // Handle error
    );
  }

  // Get a single task by ID
  getTaskById(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)  // Handle error
    );
  }

  createTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task).pipe(
      catchError(this.handleError)  // Handle error
    );
  }

  updateTask(task: Task): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${task._id}`, task).pipe(
      catchError(this.handleError)  
    );
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  lockTask(taskId: string, socketId: string) {
    return this.http.post<Task>(`${this.BASE_URL}/lock-task/${taskId}`, { socketId });
  }

  unlockTask(taskId: string, socketId: string) {
    return this.http.post<Task>(`${this.BASE_URL}/unlock-task/${taskId}`, { socketId });
  }

  // Handle errors
  private handleError(error: any): Observable<never> {
    console.error('An error occurred', error); 
    return throwError(() => new Error('Something went wrong, please try again later.'));  
  }
}
