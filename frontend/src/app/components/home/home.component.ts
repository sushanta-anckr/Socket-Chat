import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  onlineUsers: any[] = [];

  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.connectToSocket();
  }

  private loadUserData(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  private async connectToSocket(): Promise<void> {
    try {
      await this.socketService.connect();
      this.setupSocketListeners();
    } catch (error) {
      console.error('Failed to connect to socket:', error);
    }
  }

  private setupSocketListeners(): void {
    // Listen for online users
    this.socketService.on('online_users', (users: any[]) => {
      this.onlineUsers = users.filter(user => user.id !== this.currentUser?.id);
    });

    // Request initial online users
    this.socketService.emit('get_online_users');
  }

  goToChat(): void {
    this.router.navigate(['/chat']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
} 