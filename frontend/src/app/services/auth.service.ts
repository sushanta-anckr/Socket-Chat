import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SERVER_URL = 'http://localhost:3001';
  private authToken: string | null = null;
  private currentUser: User | null = null;

  // Subjects for reactive programming
  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  // Observable streams
  public authenticated$ = this.authenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    this.loadAuthFromStorage();
  }

  private loadAuthFromStorage(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('current_user');
      
      if (token && userStr) {
        try {
          this.authToken = token;
          this.currentUser = JSON.parse(userStr);
          this.authenticatedSubject.next(true);
          this.currentUserSubject.next(this.currentUser);
        } catch (error) {
          this.clearAuthFromStorage();
        }
      }
    }
  }

  private saveAuthToStorage(token: string, user: User): void {
    if (typeof window !== 'undefined') {
      this.authToken = token;
      this.currentUser = user;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));
      this.authenticatedSubject.next(true);
      this.currentUserSubject.next(user);
    }
  }

  private clearAuthFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.authToken = null;
      this.currentUser = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      this.authenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  async register(username: string, email: string, password: string, displayName?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      const authResponse = {
        message: data.message,
        user: data.data.user,
        token: data.data.token
      };

      this.saveAuthToStorage(authResponse.token, authResponse.user);
      return authResponse;
    } catch (error: any) {
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const authResponse = {
        message: data.message,
        user: data.data.user,
        token: data.data.token
      };

      this.saveAuthToStorage(authResponse.token, authResponse.user);
      return authResponse;
    } catch (error: any) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.authToken) {
        await fetch(`${this.SERVER_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthFromStorage();
      this.router.navigate(['/auth']);
    }
  }

  // Getters
  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }
} 