import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  profileForm: FormGroup;
  isEditing = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      displayName: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email,
          displayName: user.displayName || ''
        });
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset form when canceling edit
      this.loadUserProfile();
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;

    try {
      // In a real app, you would make an API call here
      // For now, we'll just show a success message
      this.toastService.showSuccess('Profile Updated', 'Your profile has been updated successfully');
      this.isEditing = false;
    } catch (error: any) {
      this.toastService.showError('Error', error.message || 'Failed to update profile');
    } finally {
      this.isLoading = false;
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  hasError(field: string, errorType: string): boolean {
    const control = this.profileForm.get(field);
    return !!(control && control.hasError(errorType) && control.touched);
  }

  getError(field: string): string {
    const control = this.profileForm.get(field);
    if (!control || !control.touched) return '';

    const errors = control.errors;
    if (!errors) return '';

    if (errors['required']) return `${field} is required`;
    if (errors['minlength']) return `${field} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['email']) return 'Invalid email format';

    return 'Invalid input';
  }

  getInitials(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }
} 