import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Challenge,
  Device,
  LeaderboardRow,
  PagedResponse,
  TaskItem,
  UserProgress,
  User
} from '../models';

export interface ListQuery {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
  status?: string;
  region?: string;
}

function toParams(q: ListQuery = {}): HttpParams {
  let p = new HttpParams();
  if (q.page !== undefined) p = p.set('page', String(q.page));
  if (q.size !== undefined) p = p.set('size', String(q.size));
  if (q.search) p = p.set('search', q.search);
  if (q.sort) p = p.set('sort', q.sort);
  if (q.status) p = p.set('status', q.status);
  if (q.region) p = p.set('region', q.region);
  return p;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  health(): Observable<{ status: string; service: string; timestamp: string }> {
    return this.http.get<{ status: string; service: string; timestamp: string }>(`${this.base}/health`);
  }

  // Users -------------
  listUsers(): Observable<User[]> { return this.http.get<User[]>(`${this.base}/users`); }
  getUser(userId: number): Observable<{ user: User; progress: UserProgress }> {
    return this.http.get<{ user: User; progress: UserProgress }>(`${this.base}/user/${userId}`);
  }

  // Devices -----------
  listDevices(q: ListQuery = {}): Observable<PagedResponse<Device>> {
    return this.http.get<PagedResponse<Device>>(`${this.base}/device`, { params: toParams(q) });
  }
  getDevice(id: number): Observable<Device> {
    return this.http.get<Device>(`${this.base}/devices`).pipe();
  }
  createDevice(d: Partial<Device>): Observable<Device> {
    return this.http.post<Device>(`${this.base}/device`, d);
  }
  updateDevice(id: number, d: Partial<Device>): Observable<Device> {
    return this.http.put<Device>(`${this.base}/device/${id}`, d);
  }
  deleteDevice(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/device/${id}`);
  }

  // Tasks -------------
  listTasks(q: ListQuery = {}): Observable<PagedResponse<TaskItem>> {
    return this.http.get<PagedResponse<TaskItem>>(`${this.base}/task`, { params: toParams(q) });
  }
  getTask(id: number): Observable<TaskItem> {
    return this.http.get<TaskItem>(`${this.base}/task/${id}`);
  }
  createTask(t: Partial<TaskItem>): Observable<TaskItem> {
    return this.http.post<TaskItem>(`${this.base}/task`, t);
  }
  updateTask(id: number, t: Partial<TaskItem>): Observable<TaskItem> {
    return this.http.put<TaskItem>(`${this.base}/task/${id}`, t);
  }
  deleteTask(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/task/${id}`);
  }
  listTaskParticipants(id: number, q: ListQuery = {}): Observable<PagedResponse<User>> {
    return this.http.get<PagedResponse<User>>(`${this.base}/task/${id}/user`, { params: toParams(q) });
  }

  // Challenges --------
  listChallenges(q: ListQuery = {}): Observable<PagedResponse<Challenge>> {
    return this.http.get<PagedResponse<Challenge>>(`${this.base}/challenge`, { params: toParams(q) });
  }
  getChallenge(id: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.base}/challenge/${id}`);
  }
  createChallenge(c: Partial<Challenge>): Observable<Challenge> {
    return this.http.post<Challenge>(`${this.base}/challenge`, c);
  }
  updateChallenge(id: number, c: Partial<Challenge>): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.base}/challenge/${id}`, c);
  }
  deleteChallenge(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/challenge/${id}`);
  }
  joinChallenge(challengeId: number, userId: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/challenge/${challengeId}/${userId}`, {});
  }
  listChallengeParticipants(id: number, q: ListQuery = {}): Observable<PagedResponse<LeaderboardRow>> {
    return this.http.get<PagedResponse<LeaderboardRow>>(`${this.base}/challenge/${id}/user`, { params: toParams(q) });
  }

  // Telemetry ---------
  submitActivity(userId: number, payload: { activityDate: string; stepCountValue: number; heartRate?: number; calories?: number }) {
    return this.http.post(`${this.base}/user/${userId}`, payload);
  }

  // Ranking -----------
  triggerRanking(): Observable<{ message: string; timestamp: string }> {
    return this.http.get<{ message: string; timestamp: string }>(`${this.base}/rank`);
  }
}
