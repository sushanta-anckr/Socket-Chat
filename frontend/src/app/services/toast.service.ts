import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  private toastIdCounter = 0;

  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  private addToast(toast: Omit<Toast, 'id' | 'timestamp'>): void {
    const newToast: Toast = {
      ...toast,
      id: ++this.toastIdCounter,
      timestamp: new Date(),
      duration: toast.duration || 5000 // Default 5 seconds
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, newToast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      this.removeToast(newToast.id);
    }, newToast.duration);
  }

  showSuccess(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'success', title, message, duration });
  }

  showError(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'error', title, message, duration: duration || 8000 }); // Errors stay longer
  }

  showWarning(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'warning', title, message, duration });
  }

  showInfo(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'info', title, message, duration });
  }

  removeToast(id: number): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  clearAll(): void {
    this.toastsSubject.next([]);
  }
} 