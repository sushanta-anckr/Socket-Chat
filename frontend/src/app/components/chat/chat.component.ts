import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService, User, Message, Room } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Connection state
  connected = false;
  authenticated = false;
  currentUser: User | null = null;

  // User authentication
  username = '';
  email = '';
  isAuthenticating = false;

  // Chat data
  messages: Message[] = [];
  onlineUsers: User[] = [];
  activeRooms: Room[] = [];
  currentRoom: Room | null = null;
  
  // UI state
  currentTab: 'public' | 'private' | 'rooms' = 'public';
  messageText = '';
  privateRecipient = '';
  showUserModal = false;
  newRoomName = '';
  showRoomModal = false;
  
  // Typing indicator
  typingUsers: { [roomId: string]: string[] } = {};
  typingTimeout: any;
  
  // Notifications
  notifications: any[] = [];
  errors: string[] = [];

  private subscriptions: Subscription[] = [];

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    this.setupSocketSubscriptions();
    this.socketService.connect();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  private setupSocketSubscriptions() {
    // Connection status
    this.subscriptions.push(
      this.socketService.connected$.subscribe(connected => {
        this.connected = connected;
        if (connected) {
          this.addNotification('Connected to server', 'success');
        } else {
          this.addNotification('Disconnected from server', 'error');
        }
      })
    );

    // Authentication status
    this.subscriptions.push(
      this.socketService.authenticated$.subscribe(authenticated => {
        this.authenticated = authenticated;
        this.isAuthenticating = false;
        if (authenticated) {
          this.addNotification('Authentication successful', 'success');
          this.loadInitialData();
        }
      })
    );

    // Current user
    this.subscriptions.push(
      this.socketService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Online users
    this.subscriptions.push(
      this.socketService.onlineUsers$.subscribe(users => {
        this.onlineUsers = users;
      })
    );

    // Active rooms
    this.subscriptions.push(
      this.socketService.activeRooms$.subscribe(rooms => {
        this.activeRooms = rooms;
      })
    );

    // All messages
    this.subscriptions.push(
      this.socketService.messages$.subscribe(message => {
        this.messages.push(message);
        this.scrollToBottom();
      })
    );

    // Notifications
    this.subscriptions.push(
      this.socketService.notifications$.subscribe(notification => {
        this.addNotification(notification.message, notification.type);
      })
    );

    // Errors
    this.subscriptions.push(
      this.socketService.errors$.subscribe(error => {
        this.addNotification(error, 'error');
      })
    );

    // Typing indicators
    this.subscriptions.push(
      this.socketService.typing$.subscribe(typing => {
        this.handleTypingIndicator(typing);
      })
    );
  }

  private loadInitialData() {
    this.socketService.getOnlineUsers();
    this.socketService.getActiveRooms();
  }

  private handleTypingIndicator(typing: { roomId: string; userId: string; username: string; isTyping: boolean }) {
    if (!this.typingUsers[typing.roomId]) {
      this.typingUsers[typing.roomId] = [];
    }

    const typingList = this.typingUsers[typing.roomId];
    const index = typingList.indexOf(typing.username);

    if (typing.isTyping && index === -1) {
      typingList.push(typing.username);
    } else if (!typing.isTyping && index > -1) {
      typingList.splice(index, 1);
    }

    // Clean up empty typing lists
    if (typingList.length === 0) {
      delete this.typingUsers[typing.roomId];
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private addNotification(message: string, type: string) {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    this.notifications.unshift(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  removeNotification(id: number) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  // Authentication
  authenticate() {
    if (!this.username.trim()) {
      this.addNotification('Please enter a username', 'error');
      return;
    }

    this.isAuthenticating = true;
    this.socketService.authenticate({
      username: this.username,
      email: this.email || undefined
    });
  }

  // Room management
  joinRoom(roomId: string, roomName?: string) {
    this.socketService.joinRoom(roomId, roomName);
    this.currentRoom = this.activeRooms.find(r => r.id === roomId) || null;
    this.currentTab = 'rooms';
  }

  leaveRoom(roomId: string) {
    this.socketService.leaveRoom(roomId);
    if (this.currentRoom?.id === roomId) {
      this.currentRoom = null;
    }
  }

  createRoom() {
    if (!this.newRoomName.trim()) {
      this.addNotification('Please enter a room name', 'error');
      return;
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.socketService.joinRoom(roomId, this.newRoomName);
    this.newRoomName = '';
    this.showRoomModal = false;
  }

  // Message sending
  sendMessage() {
    if (!this.messageText.trim()) {
      return;
    }

    const message = this.messageText.trim();
    this.messageText = '';

    if (this.currentTab === 'public') {
      // For public messages, we'll use a default public room
      const publicRoomId = 'public_room';
      this.socketService.sendRoomMessage(publicRoomId, message);
    } else if (this.currentTab === 'private' && this.privateRecipient) {
      this.socketService.sendPrivateMessage(this.privateRecipient, message);
    } else if (this.currentTab === 'rooms' && this.currentRoom) {
      this.socketService.sendRoomMessage(this.currentRoom.id, message);
    }

    this.stopTyping();
  }

  sendPrivateMessage(recipientId: string) {
    this.privateRecipient = recipientId;
    this.currentTab = 'private';
    this.messageInput?.nativeElement.focus();
  }

  // Typing indicators
  onTyping() {
    if (this.currentTab === 'public') {
      this.socketService.startTyping('public_room');
    } else if (this.currentTab === 'rooms' && this.currentRoom) {
      this.socketService.startTyping(this.currentRoom.id);
    }

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set timeout to stop typing after 2 seconds
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  stopTyping() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (this.currentTab === 'public') {
      this.socketService.stopTyping('public_room');
    } else if (this.currentTab === 'rooms' && this.currentRoom) {
      this.socketService.stopTyping(this.currentRoom.id);
    }
  }

  // UI helpers
  switchTab(tab: 'public' | 'private' | 'rooms') {
    this.currentTab = tab;
    this.messageText = '';
    this.privateRecipient = '';
    this.currentRoom = null;
    
    if (tab === 'public') {
      // Join public room automatically
      this.socketService.joinRoom('public_room', 'Public Chat');
    }
  }

  getFilteredMessages(): Message[] {
    if (this.currentTab === 'public') {
      return this.messages.filter(m => m.type === 'room' && m.roomId === 'public_room' || m.type === 'broadcast');
    } else if (this.currentTab === 'private') {
      return this.messages.filter(m => 
        m.type === 'private' && 
        (m.sender.id === this.currentUser?.id || m.recipient === this.currentUser?.id)
      );
    } else if (this.currentTab === 'rooms' && this.currentRoom) {
      return this.messages.filter(m => m.type === 'room' && m.roomId === this.currentRoom?.id);
    }
    return [];
  }

  getCurrentTypingUsers(): string {
    let roomId = '';
    if (this.currentTab === 'public') {
      roomId = 'public_room';
    } else if (this.currentTab === 'rooms' && this.currentRoom) {
      roomId = this.currentRoom.id;
    }

    const typingList = this.typingUsers[roomId] || [];
    if (typingList.length === 0) return '';
    if (typingList.length === 1) return `${typingList[0]} is typing...`;
    if (typingList.length === 2) return `${typingList[0]} and ${typingList[1]} are typing...`;
    return `${typingList.slice(0, -1).join(', ')} and ${typingList[typingList.length - 1]} are typing...`;
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Handle Enter key
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Auto-join public room on authentication
  private autoJoinPublicRoom() {
    if (this.authenticated && this.currentTab === 'public') {
      this.socketService.joinRoom('public_room', 'Public Chat');
    }
  }

  // Track by functions for ngFor performance
  trackByNotification(index: number, notification: any): number {
    return notification.id;
  }

  trackByUser(index: number, user: User): string {
    return user.id;
  }

  trackByRoom(index: number, room: Room): string {
    return room.id;
  }

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }

  // Get recipient name for private messages
  getRecipientName(recipientId: string): string {
    const user = this.onlineUsers.find(u => u.id === recipientId);
    return user ? user.username : 'Unknown User';
  }
}
