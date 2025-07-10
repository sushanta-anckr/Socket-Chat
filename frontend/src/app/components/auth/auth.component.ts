import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  authForm: FormGroup;
  authMode: 'login' | 'register' = 'login';
  authLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      displayName: ['']
    });
  }

  ngOnInit(): void {
    // If already authenticated, redirect to home
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }

    // Update form validators based on auth mode
    this.updateFormValidators();
  }

  toggleAuthMode(): void {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    this.authForm.reset();
    this.updateFormValidators();
  }

  private updateFormValidators(): void {
    if (this.authMode === 'login') {
      this.authForm.get('username')?.clearValidators();
      this.authForm.get('email')?.setValidators([Validators.required, Validators.email]);
    } else {
      this.authForm.get('username')?.setValidators([Validators.required, Validators.minLength(3)]);
      this.authForm.get('email')?.setValidators([Validators.required, Validators.email]);
    }
    
    this.authForm.get('username')?.updateValueAndValidity();
    this.authForm.get('email')?.updateValueAndValidity();
  }

  async onSubmit(): Promise<void> {
    if (this.authForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.authLoading = true;

    try {
      const formValue = this.authForm.value;

      if (this.authMode === 'register') {
        await this.authService.register(
          formValue.username,
          formValue.email,
          formValue.password,
          formValue.displayName
        );
        this.toastService.showSuccess('Success', 'Registration successful!');
      } else {
        await this.authService.login(
          formValue.email,
          formValue.password
        );
        this.toastService.showSuccess('Success', 'Login successful!');
      }

      this.router.navigate(['/home']);
    } catch (error: any) {
      this.toastService.showError('Error', error.message || 'Authentication failed');
    } finally {
      this.authLoading = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.authForm.controls).forEach(key => {
      const control = this.authForm.get(key);
      control?.markAsTouched();
    });
  }

  hasError(field: string, errorType: string): boolean {
    const control = this.authForm.get(field);
    return !!(control && control.hasError(errorType) && control.touched);
  }

  getError(field: string): string {
    const control = this.authForm.get(field);
    if (!control || !control.touched) return '';

    const errors = control.errors;
    if (!errors) return '';

    if (errors['required']) return `${field} is required`;
    if (errors['minlength']) return `${field} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['email']) return 'Invalid email format';

    return 'Invalid input';
  }
} 