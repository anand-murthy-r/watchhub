export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  region: string;
  role: 'ROLE_ADMIN' | 'ROLE_USER';
  deviceId?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  user: User;
}

export interface Device {
  id: number;
  name: string;
  manufacturer: string;
  featureTags: string[];
}

export interface TaskItem {
  id: number;
  name: string;
  description: string;
  targetSteps: number;
  duration: number;
  active: boolean;
  requiredTags: string[];
  outcome: { reward: string };
  region: string;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  scope: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  ownerUserId: number;
  taskId: number;
  region: string;
  startAt: string;
  endAt: string;
  requiredTags: string[];
  participants?: number[];
}

export interface Activity {
  id: number;
  activityDate: string;
  stepCountValue: number;
  heartRate?: number;
  calories?: number;
}

export interface UserProgress {
  userId: number;
  totalPoints: number;
  activities: Activity[];
  rewards: string[];
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LeaderboardRow {
  userId: number;
  rank: number;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  totalPoints: number;
  rewards: string[];
}

export interface ApiError {
  code?: string;
  message?: string;
  timestamp?: string;
  errors?: Record<string, string>;
}
