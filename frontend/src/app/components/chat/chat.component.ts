import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SocketService, User, Message, Room, AuthResponse } from '../../services/socket.service';

interface ChatMessage extends Message {
  isOwn?: boolean;
  isRead?: boolean;
  isDelivered?: boolean;
}

interface ActiveChat {
  type: 'room' | 'private';
  id: number;
  name: string;
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
}

interface TypingStatus {
  userId?: number;
  roomId?: number;
  user: User;
  isTyping: boolean;
  timeoutId?: number;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('roomModal') roomModal!: ElementRef;

  private destroy$ = new Subject<void>();
  private typingTimer?: number;
  private messageLoadingTimer?: number;

  // Authentication state
  isAuthenticated = false;
  currentUser: User | null = null;
  authMode: 'login' | 'register' = 'login';
  authForm: FormGroup;
  authLoading = false;
  authError = '';

  // Connection state
  isConnected = false;
  connectionError = '';

  // Chat state
  activeChat: ActiveChat | null = null;
  onlineUsers: User[] = [];
  userRooms: Room[] = [];
  publicRooms: Room[] = [];
  privateChatUsers: User[] = [];
  
  // UI state
  selectedTab: 'public' | 'rooms' | 'private' = 'public';
  showRoomModal = false;
  roomModalLoading = false;
  notifications: any[] = [];
  typingUsers: TypingStatus[] = [];

  // Forms
  roomForm: FormGroup;
  messageText = '';
  isTyping = false;

  constructor(
    private socketService: SocketService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      displayName: ['']
    });

    this.roomForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      roomType: ['public']
    });
  }

  ngOnInit(): void {
    this.setupSocketListeners();
    this.checkAuthenticationStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTypingTimer();
    this.clearMessageLoadingTimer();
  }

  private setupSocketListeners(): void {
    // Authentication state
    this.socketService.authenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => {
        this.isAuthenticated = authenticated;
        if (authenticated) {
          this.socketService.connect();
        }
        this.cdr.detectChanges();
      });

    // Current user
    this.socketService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.cdr.detectChanges();
      });

    // Connection state
    this.socketService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        if (connected) {
          this.loadInitialData();
        }
        this.cdr.detectChanges();
      });

    // Online users
    this.socketService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.onlineUsers = users;
        this.updatePrivateChatUsers();
        this.cdr.detectChanges();
      });

    // User rooms
    this.socketService.userRooms$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rooms => {
        this.userRooms = rooms;
        this.cdr.detectChanges();
      });

    // Public rooms
    this.socketService.publicRooms$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rooms => {
        this.publicRooms = rooms;
        this.cdr.detectChanges();
      });

    // Messages
    this.socketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleNewMessage(message);
      });

    // Notifications
    this.socketService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.handleNotification(notification);
      });

    // Typing indicators
    this.socketService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(typing => {
        this.handleTyping(typing);
      });

    // Errors
    this.socketService.errors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.showError(error);
      });
  }

  private checkAuthenticationStatus(): void {
    if (this.socketService.isAuthenticated()) {
      this.isAuthenticated = true;
      this.currentUser = this.socketService.getCurrentUser();
      this.socketService.connect();
    }
  }

  private loadInitialData(): void {
    this.socketService.getOnlineUsers();
    this.socketService.getUserRooms();
    this.socketService.getPublicRooms();
  }

  private updatePrivateChatUsers(): void {
    // Filter out current user from online users for private chat
    this.privateChatUsers = this.onlineUsers.filter(user => 
      user.id !== this.currentUser?.id
    );
  }

  private handleNewMessage(message: Message): void {
    const chatMessage: ChatMessage = {
      ...message,
      isOwn: message.sender.id === this.currentUser?.id,
      isRead: false,
      isDelivered: true
    };

    // Add to active chat if it matches
    if (this.activeChat) {
      const isActiveChat = (
        (this.activeChat.type === 'room' && message.roomId === this.activeChat.id) ||
        (this.activeChat.type === 'private' && 
         (message.recipientId === this.currentUser?.id || message.recipientId === this.activeChat.id) &&
         (message.sender.id === this.activeChat.id || message.sender.id === this.currentUser?.id))
      );

      if (isActiveChat) {
        this.activeChat.messages.push(chatMessage);
        this.scrollToBottom();
      }
    }

    // Show notification if not from current user
    if (!chatMessage.isOwn) {
      this.showNotification({
        type: 'message',
        title: message.type === 'room' ? `Room: ${this.getRoomName(message.roomId!)}` : `Private from ${message.sender.displayName}`,
        message: message.content,
        timestamp: new Date()
      });
    }

    this.cdr.detectChanges();
  }

  private handleNotification(notification: any): void {
    switch (notification.type) {
      case 'room_messages':
        this.handleRoomMessages(notification.data);
        break;
      case 'private_messages':
        this.handlePrivateMessages(notification.data);
        break;
      case 'room_created':
        this.showSuccess('Room created successfully');
        this.closeRoomModal();
        this.socketService.getUserRooms();
        break;
      case 'room_joined':
        this.showSuccess('Joined room successfully');
        this.loadRoomChat(notification.data.roomId);
        break;
      default:
        if (notification.message) {
          this.showNotification(notification);
        }
    }
  }

  private handleRoomMessages(data: any): void {
    if (this.activeChat && this.activeChat.type === 'room' && this.activeChat.id === data.roomId) {
      const messages = data.messages.map((msg: Message) => ({
        ...msg,
        isOwn: msg.sender.id === this.currentUser?.id,
        isRead: true,
        isDelivered: true
      }));

      if (data.offset === 0) {
        this.activeChat.messages = messages;
      } else {
        this.activeChat.messages = [...messages, ...this.activeChat.messages];
      }

      this.activeChat.hasMore = data.hasMore;
      this.activeChat.isLoading = false;
      this.scrollToBottom();
    }
  }

  private handlePrivateMessages(data: any): void {
    if (this.activeChat && this.activeChat.type === 'private' && this.activeChat.id === data.userId) {
      const messages = data.messages.map((msg: Message) => ({
        ...msg,
        isOwn: msg.sender.id === this.currentUser?.id,
        isRead: true,
        isDelivered: true
      }));

      if (data.offset === 0) {
        this.activeChat.messages = messages;
      } else {
        this.activeChat.messages = [...messages, ...this.activeChat.messages];
      }

      this.activeChat.hasMore = data.hasMore;
      this.activeChat.isLoading = false;
      this.scrollToBottom();
    }
  }

  private handleTyping(typing: TypingStatus): void {
    // Remove existing typing status for this user
    this.typingUsers = this.typingUsers.filter(t => t.user.id !== typing.user.id);

    // Add new typing status if user is typing
    if (typing.isTyping) {
      this.typingUsers.push(typing);
      
      // Auto-remove typing status after 3 seconds
      typing.timeoutId = window.setTimeout(() => {
        this.typingUsers = this.typingUsers.filter(t => t.user.id !== typing.user.id);
        this.cdr.detectChanges();
      }, 3000);
    }

    this.cdr.detectChanges();
  }

  // Authentication methods
  async onAuth(): Promise<void> {
    if (this.authForm.invalid) {
      this.markFormGroupTouched(this.authForm);
      return;
    }

    this.authLoading = true;
    this.authError = '';

    try {
      const formValue = this.authForm.value;
      let result: AuthResponse;

      if (this.authMode === 'register') {
        result = await this.socketService.register(
          formValue.username,
          formValue.email,
          formValue.password,
          formValue.displayName
        );
      } else {
        result = await this.socketService.login(
          formValue.username,
          formValue.password
        );
      }

      this.showSuccess(result.message);
      this.authForm.reset();
      this.socketService.connect();
    } catch (error: any) {
      this.authError = error.message || 'Authentication failed';
    } finally {
      this.authLoading = false;
    }
  }

  async onLogout(): Promise<void> {
    try {
      await this.socketService.logout();
      this.resetChatState();
      this.showSuccess('Logged out successfully');
    } catch (error) {
      this.showError('Logout failed');
    }
  }

  toggleAuthMode(): void {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    this.authForm.reset();
    this.authError = '';
  }

  // Chat methods
  loadRoomChat(roomId: number): void {
    const room = this.userRooms.find(r => r.id === roomId) || 
                 this.publicRooms.find(r => r.id === roomId);

    if (!room) return;

    this.activeChat = {
      type: 'room',
      id: roomId,
      name: room.name,
      messages: [],
      unreadCount: 0,
      isLoading: true,
      hasMore: true,
      offset: 0
    };

    this.socketService.getRoomMessages(roomId);
  }

  loadPrivateChat(userId: number): void {
    const user = this.privateChatUsers.find(u => u.id === userId);
    if (!user) return;

    this.activeChat = {
      type: 'private',
      id: userId,
      name: user.displayName,
      messages: [],
      unreadCount: 0,
      isLoading: true,
      hasMore: true,
      offset: 0
    };

    this.socketService.getPrivateMessages(userId);
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeChat) return;

    const content = this.messageText.trim();
    this.messageText = '';

    if (this.activeChat.type === 'room') {
      this.socketService.sendRoomMessage(this.activeChat.id, content);
    } else {
      this.socketService.sendPrivateMessage(this.activeChat.id, content);
    }

    this.stopTyping();
  }

  onMessageInput(): void {
    if (!this.activeChat) return;

    if (!this.isTyping) {
      this.isTyping = true;
      if (this.activeChat.type === 'room') {
        this.socketService.startTyping(this.activeChat.id);
      } else {
        this.socketService.startTyping(undefined, this.activeChat.id);
      }
    }

    this.clearTypingTimer();
    this.typingTimer = window.setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  private stopTyping(): void {
    if (this.isTyping && this.activeChat) {
      this.isTyping = false;
      if (this.activeChat.type === 'room') {
        this.socketService.stopTyping(this.activeChat.id);
      } else {
        this.socketService.stopTyping(undefined, this.activeChat.id);
      }
    }
    this.clearTypingTimer();
  }

  private clearTypingTimer(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = undefined;
    }
  }

  private clearMessageLoadingTimer(): void {
    if (this.messageLoadingTimer) {
      clearTimeout(this.messageLoadingTimer);
      this.messageLoadingTimer = undefined;
    }
  }

  // Room methods
  openRoomModal(): void {
    this.showRoomModal = true;
    this.roomForm.reset({
      name: '',
      description: '',
      roomType: 'public'
    });
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.roomForm.reset();
  }

  async createRoom(): Promise<void> {
    if (this.roomForm.invalid) {
      this.markFormGroupTouched(this.roomForm);
      return;
    }

    this.roomModalLoading = true;
    const formValue = this.roomForm.value;
    
    this.socketService.createRoom(
      formValue.name,
      formValue.description,
      formValue.roomType
    );

    // The modal will be closed by the notification handler
  }

  joinRoom(roomId: number): void {
    this.socketService.joinRoom(roomId);
  }

  leaveRoom(roomId: number): void {
    this.socketService.leaveRoom(roomId);
    
    // Close active chat if it's this room
    if (this.activeChat && this.activeChat.type === 'room' && this.activeChat.id === roomId) {
      this.activeChat = null;
    }
  }

  // Utility methods
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private resetChatState(): void {
    this.activeChat = null;
    this.onlineUsers = [];
    this.userRooms = [];
    this.publicRooms = [];
    this.privateChatUsers = [];
    this.typingUsers = [];
    this.notifications = [];
  }

  // UI helper methods
  getRoomName(roomId: number): string {
    const room = this.userRooms.find(r => r.id === roomId) || 
                 this.publicRooms.find(r => r.id === roomId);
    return room?.name || 'Unknown Room';
  }

  getUserDisplayName(userId: number): string {
    const user = this.onlineUsers.find(u => u.id === userId);
    return user?.displayName || 'Unknown User';
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    
    const names = this.typingUsers.map(t => t.user.displayName);
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    } else {
      return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing...`;
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  // Notification methods
  private showNotification(notification: any): void {
    this.notifications.unshift({
      ...notification,
      id: Date.now(),
      timestamp: new Date()
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  private showSuccess(message: string): void {
    this.showNotification({
      type: 'success',
      title: 'Success',
      message,
      timestamp: new Date()
    });
  }

  private showError(message: string): void {
    this.showNotification({
      type: 'error',
      title: 'Error',
      message,
      timestamp: new Date()
    });
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  // Tab methods
  selectTab(tab: 'public' | 'rooms' | 'private'): void {
    this.selectedTab = tab;
  }

  // Validation helper
  hasError(formGroup: FormGroup, field: string, errorType: string): boolean {
    const control = formGroup.get(field);
    return !!(control && control.hasError(errorType) && control.touched);
  }

  getError(formGroup: FormGroup, field: string): string {
    const control = formGroup.get(field);
    if (!control || !control.touched) return '';

    const errors = control.errors;
    if (!errors) return '';

    if (errors['required']) return `${field} is required`;
    if (errors['minlength']) return `${field} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['email']) return 'Invalid email format';

    return 'Invalid input';
  }
}
