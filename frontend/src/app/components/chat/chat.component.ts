import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../../services/toast.service';

// Import sub-components
import { GeneralChatComponent } from './general-chat/general-chat.component';
import { PrivateChatComponent } from './private-chat/private-chat.component';
import { RoomChatComponent } from './room-chat/room-chat.component';
import { FriendsComponent } from './friends/friends.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    GeneralChatComponent,
    PrivateChatComponent,
    RoomChatComponent,
    FriendsComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  // User and Auth
  currentUser: User | null = null;
  onlineUsers: any[] = [];
  
  // Navigation
  activeTab: 'general' | 'private' | 'rooms' | 'friends' = 'general';
  
  // Unified Lists
  allUsers: any[] = [];
  allRooms: any[] = [];
  
  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private toastService: ToastService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.initializeChat();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  private async initializeChat(): Promise<void> {
    // Load user data
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('Chat: Current user loaded:', user);
    });

    // Connect to socket
    try {
      console.log('Chat: Connecting to socket...');
      await this.socketService.connect();
      console.log('Chat: Socket connected, setting up listeners...');
      this.setupSocketListeners();
      console.log('Chat: Loading initial data...');
      await this.loadInitialData();
    } catch (error) {
      console.error('Chat: Failed to connect to socket:', error);
      this.toastService.showError('Connection Error', 'Failed to connect to chat server');
    }
  }

  private setupSocketListeners(): void {
    // User presence listeners
    this.socketService.on('online_users', (users: any[]) => {
      console.log('Chat: Received online users:', users);
      this.onlineUsers = users.filter(user => user.id !== this.currentUser?.id);
      this.updateAllUsers();
    });

    this.socketService.on('online_users_updated', (users: any[]) => {
      console.log('Chat: Online users updated:', users);
      this.onlineUsers = users.filter(user => user.id !== this.currentUser?.id);
      this.updateAllUsers();
      
      // Show toast with current online count
      const onlineCount = users.length;
      this.toastService.showInfo('Online Users', `${onlineCount} users online now`);
    });

    this.socketService.on('user_joined', (user: any) => {
      console.log('Chat: User joined:', user);
      if (user.id !== this.currentUser?.id) {
        // Find if user is already in the list
        const existingUserIndex = this.onlineUsers.findIndex(u => u.id === user.id);
        if (existingUserIndex === -1) {
          this.onlineUsers.push(user);
          this.updateAllUsers();
        }
        
        // Show toast notification
        this.toastService.showSuccess('User Joined', `${user.displayName || user.username} joined the chat`);
      }
    });

    this.socketService.on('user_left', (user: any) => {
      console.log('Chat: User left:', user);
      this.onlineUsers = this.onlineUsers.filter(u => u.id !== user.id);
      this.updateAllUsers();
      
      // Show toast notification
      this.toastService.showInfo('User Left', `${user.displayName || user.username} left the chat`);
    });

    // Room listeners
    this.socketService.on('user_rooms', (rooms: any[]) => {
      console.log('Chat: Received user rooms:', rooms);
      this.updateAllRooms();
    });

    this.socketService.on('public_rooms', (rooms: any[]) => {
      console.log('Chat: Received public rooms:', rooms);
      this.updateAllRooms();
    });

    console.log('Chat: Socket listeners set up complete');
  }

  private async loadInitialData(): Promise<void> {
    console.log('Chat: Loading initial data...');
    
    // Load online users
    this.socketService.emit('get_online_users');

    // Load user rooms
    this.socketService.emit('get_user_rooms');

    // Load public rooms
    this.socketService.emit('get_public_rooms');
  }

  private updateAllUsers(): void {
    this.allUsers = [...this.onlineUsers];
    console.log('Chat: Updated all users list:', this.allUsers);
  }

  private updateAllRooms(): void {
    // This would combine user rooms and public rooms
    // For now, we'll get the data from the sub-components
    console.log('Chat: Updated all rooms list');
  }

  // Tab Management
  switchTab(tab: 'general' | 'private' | 'rooms' | 'friends'): void {
    console.log('Chat: Switching to tab:', tab);
    this.activeTab = tab;
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
