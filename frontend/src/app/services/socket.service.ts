import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email?: string;
  isOnline: boolean;
  joinedAt: string;
  rooms: string[];
}

export interface Message {
  id: string;
  type: 'private' | 'room' | 'broadcast';
  sender: {
    id: string;
    username: string;
  };
  recipient?: string;
  roomId?: string;
  message: string;
  timestamp: string;
}

export interface Room {
  id: string;
  name: string;
  users: Array<{
    id: string;
    username: string;
    socketId: string;
    joinedAt: string;
  }>;
  createdAt: string;
  messageCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private readonly SERVER_URL = 'http://localhost:3000';
  
  // Subjects for reactive programming
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private onlineUsersSubject = new BehaviorSubject<User[]>([]);
  private activeRoomsSubject = new BehaviorSubject<Room[]>([]);
  private messagesSubject = new Subject<Message>();
  private privateMessagesSubject = new Subject<Message>();
  private roomMessagesSubject = new Subject<Message>();
  private broadcastMessagesSubject = new Subject<Message>();
  private notificationsSubject = new Subject<any>();
  private errorsSubject = new Subject<string>();
  private typingSubject = new Subject<{
    roomId: string;
    userId: string;
    username: string;
    isTyping: boolean;
  }>();

  // Observable streams
  public connected$ = this.connectedSubject.asObservable();
  public authenticated$ = this.authenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  public activeRooms$ = this.activeRoomsSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public privateMessages$ = this.privateMessagesSubject.asObservable();
  public roomMessages$ = this.roomMessagesSubject.asObservable();
  public broadcastMessages$ = this.broadcastMessagesSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public errors$ = this.errorsSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    this.socket = io(this.SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.connectedSubject.next(false);
      this.authenticatedSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.errorsSubject.next('Connection failed. Please try again.');
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authentication successful:', data);
      this.authenticatedSubject.next(true);
      this.currentUserSubject.next(data.user);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('❌ Authentication error:', error);
      this.errorsSubject.next(error.message || 'Authentication failed');
    });

    // User events
    this.socket.on('online_users', (users) => {
      this.onlineUsersSubject.next(users);
    });

    this.socket.on('user_online', (data) => {
      console.log('👤 User came online:', data);
      this.notificationsSubject.next({
        type: 'user_online',
        message: `${data.username} is now online`,
        data
      });
    });

    this.socket.on('user_offline', (data) => {
      console.log('👤 User went offline:', data);
      this.notificationsSubject.next({
        type: 'user_offline',
        message: `${data.username} went offline`,
        data
      });
    });

    // Room events
    this.socket.on('active_rooms', (rooms) => {
      this.activeRoomsSubject.next(rooms);
    });

    this.socket.on('room_joined', (data) => {
      console.log('🏠 Joined room:', data);
      this.notificationsSubject.next({
        type: 'room_joined',
        message: data.message,
        data
      });
    });

    this.socket.on('room_left', (data) => {
      console.log('🚪 Left room:', data);
      this.notificationsSubject.next({
        type: 'room_left',
        message: data.message,
        data
      });
    });

    this.socket.on('user_joined_room', (data) => {
      console.log('👤 User joined room:', data);
      this.notificationsSubject.next({
        type: 'user_joined_room',
        message: data.message,
        data
      });
    });

    this.socket.on('user_left_room', (data) => {
      console.log('👤 User left room:', data);
      this.notificationsSubject.next({
        type: 'user_left_room',
        message: data.message,
        data
      });
    });

    // Message events
    this.socket.on('private_message', (message) => {
      console.log('💬 Private message received:', message);
      this.messagesSubject.next(message);
      this.privateMessagesSubject.next(message);
    });

    this.socket.on('room_message', (message) => {
      console.log('💬 Room message received:', message);
      this.messagesSubject.next(message);
      this.roomMessagesSubject.next(message);
    });

    this.socket.on('broadcast_message', (message) => {
      console.log('📢 Broadcast message received:', message);
      this.messagesSubject.next(message);
      this.broadcastMessagesSubject.next(message);
    });

    this.socket.on('message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      this.notificationsSubject.next({
        type: 'message_sent',
        message: data.message,
        data
      });
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      this.typingSubject.next(data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.notificationsSubject.next(data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.errorsSubject.next(error.message || 'An error occurred');
    });

    // Ping/Pong for keepalive
    this.socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });
  }

  // Connection methods
  connect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Authentication method
  authenticate(userData: { username: string; email?: string; userId?: string }): void {
    this.socket.emit('authenticate', userData);
  }

  // Room methods
  joinRoom(roomId: string, roomName?: string): void {
    this.socket.emit('join_room', { roomId, roomName });
  }

  leaveRoom(roomId: string): void {
    this.socket.emit('leave_room', { roomId });
  }

  // Get data methods
  getActiveRooms(): void {
    this.socket.emit('get_active_rooms');
  }

  // Message methods
  sendPrivateMessage(recipientId: string, message: string): void {
    this.socket.emit('private_message', { recipientId, message });
  }

  sendRoomMessage(roomId: string, message: string): void {
    this.socket.emit('room_message', { roomId, message });
  }

  sendBroadcastMessage(message: string, isAdmin: boolean = false): void {
    this.socket.emit('broadcast_message', { message, isAdmin });
  }

  // Typing methods
  startTyping(roomId: string): void {
    this.socket.emit('typing_start', { roomId });
  }

  stopTyping(roomId: string): void {
    this.socket.emit('typing_stop', { roomId });
  }

  // Utility methods
  getOnlineUsers(): void {
    this.socket.emit('get_online_users');
  }

  // Keep alive
  ping(): void {
    this.socket.emit('ping');
  }

  // Status methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Cleanup
  destroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
    }
    
    // Complete all subjects
    this.connectedSubject.complete();
    this.authenticatedSubject.complete();
    this.currentUserSubject.complete();
    this.onlineUsersSubject.complete();
    this.activeRoomsSubject.complete();
    this.messagesSubject.complete();
    this.privateMessagesSubject.complete();
    this.roomMessagesSubject.complete();
    this.broadcastMessagesSubject.complete();
    this.notificationsSubject.complete();
    this.errorsSubject.complete();
    this.typingSubject.complete();
  }
}
