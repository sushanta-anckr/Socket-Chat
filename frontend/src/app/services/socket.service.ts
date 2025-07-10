import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id: number;
  type: 'room' | 'private';
  content: string;
  sender: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  roomId?: number;
  recipientId?: number;
  timestamp: string;
  isEdited?: boolean;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  roomType: 'public' | 'private';
  createdAt: string;
  role?: string;
  memberCount?: number;
  members?: User[];
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private readonly SERVER_URL = 'http://localhost:3001';
  
  // Authentication state
  private authToken: string | null = null;
  private currentUser: User | null = null;
  
  // Subjects for reactive programming
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private onlineUsersSubject = new BehaviorSubject<User[]>([]);
  private userRoomsSubject = new BehaviorSubject<Room[]>([]);
  private publicRoomsSubject = new BehaviorSubject<Room[]>([]);
  private messagesSubject = new Subject<Message>();
  private privateMessagesSubject = new Subject<Message>();
  private roomMessagesSubject = new Subject<Message>();
  private notificationsSubject = new Subject<any>();
  private errorsSubject = new Subject<string>();
  private typingSubject = new Subject<{
    roomId?: number;
    userId?: number;
    user: User;
    isTyping: boolean;
  }>();

  // Observable streams
  public connected$ = this.connectedSubject.asObservable();
  public authenticated$ = this.authenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  public userRooms$ = this.userRoomsSubject.asObservable();
  public publicRooms$ = this.publicRoomsSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public privateMessages$ = this.privateMessagesSubject.asObservable();
  public roomMessages$ = this.roomMessagesSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public errors$ = this.errorsSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();

  constructor() {
    this.loadAuthFromStorage();
    this.initializeSocket();
  }

  // Authentication methods
  private loadAuthFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');
    
    if (token && user) {
      this.authToken = token;
      this.currentUser = JSON.parse(user);
      this.authenticatedSubject.next(true);
      this.currentUserSubject.next(this.currentUser);
    }
  }

  private saveAuthToStorage(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.authToken = token;
    this.currentUser = user;
    this.authenticatedSubject.next(true);
    this.currentUserSubject.next(user);
  }

  private clearAuthFromStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.authToken = null;
    this.currentUser = null;
    this.authenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  // HTTP authentication methods
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

      // Backend returns: { success: true, message: "...", data: { user: {...}, token: "..." } }
      // Frontend expects: { message: "...", user: {...}, token: "..." }
      const authResponse = {
        message: data.message,
        user: data.data.user,
        token: data.data.token
      };

      this.saveAuthToStorage(authResponse.token, authResponse.user);
      return authResponse;
    } catch (error: any) {
      this.errorsSubject.next(error.message);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Backend returns: { success: true, message: "...", data: { user: {...}, token: "..." } }
      // Frontend expects: { message: "...", user: {...}, token: "..." }
      const authResponse = {
        message: data.message,
        user: data.data.user,
        token: data.data.token
      };

      this.saveAuthToStorage(authResponse.token, authResponse.user);
      return authResponse;
    } catch (error: any) {
      this.errorsSubject.next(error.message);
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
      this.disconnect();
    }
  }

  private initializeSocket(): void {
    if (!this.authToken) {
      return;
    }

    this.socket = io(this.SERVER_URL, {
      auth: {
        token: this.authToken
      },
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.errorsSubject.next('Connection failed. Please check your login.');
      if (error.message.includes('Authentication')) {
        this.clearAuthFromStorage();
      }
    });

    // Authentication events
    this.socket.on('connection_success', (data) => {
      console.log('✅ Socket connection successful:', data);
      this.notificationsSubject.next({
        type: 'success',
        message: data.message
      });
    });

    // User events
    this.socket.on('online_users', (users) => {
      this.onlineUsersSubject.next(users);
    });

    this.socket.on('user_online', (data) => {
      console.log('👤 User came online:', data);
      this.notificationsSubject.next({
        type: 'user_online',
        message: `${data.displayName || data.username} is now online`,
        data
      });
    });

    this.socket.on('user_offline', (data) => {
      console.log('👤 User went offline:', data);
      this.notificationsSubject.next({
        type: 'user_offline',
        message: `${data.displayName || data.username} went offline`,
        data
      });
    });

    // Room events
    this.socket.on('user_rooms', (rooms) => {
      this.userRoomsSubject.next(rooms);
    });

    this.socket.on('public_rooms', (rooms) => {
      this.publicRoomsSubject.next(rooms);
    });

    this.socket.on('room_created', (data) => {
      console.log('🏠 Room created:', data);
      this.notificationsSubject.next({
        type: 'room_created',
        message: data.message,
        data
      });
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

    this.socket.on('message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      this.notificationsSubject.next({
        type: 'message_sent',
        message: data.message,
        data
      });
    });

    // Message history events
    this.socket.on('room_messages', (data) => {
      console.log('📜 Room messages received:', data);
      this.notificationsSubject.next({
        type: 'room_messages',
        data
      });
    });

    this.socket.on('private_messages', (data) => {
      console.log('📜 Private messages received:', data);
      this.notificationsSubject.next({
        type: 'private_messages',
        data
      });
    });

    // New event listeners for updated functionality
    this.socket.on('general_messages', (data) => {
      console.log('📜 General messages received:', data);
      this.notificationsSubject.next({
        type: 'general_messages',
        data
      });
    });

    this.socket.on('general_message', (message) => {
      console.log('💬 General message received:', message);
      this.messagesSubject.next(message);
    });

    this.socket.on('chat_history', (data) => {
      console.log('📜 Chat history received:', data);
      this.notificationsSubject.next({
        type: 'chat_history',
        data
      });
    });

    this.socket.on('search_results', (data) => {
      console.log('🔍 Search results received:', data);
      this.notificationsSubject.next({
        type: 'search_results',
        data
      });
    });

    this.socket.on('user_invited', (data) => {
      console.log('👥 User invited to room:', data);
      this.notificationsSubject.next({
        type: 'user_invited',
        message: data.message,
        data
      });
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      this.typingSubject.next(data);
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
    if (this.authToken && this.socket) {
      this.socket.connect();
    } else if (this.authToken) {
      this.initializeSocket();
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Data retrieval methods
  // Get online users via REST API
  async getOnlineUsersRest(): Promise<User[]> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/users/online`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get online users');
      }

      // Update the subject with the new data
      const users = data.data || [];
      this.onlineUsersSubject.next(users);
      return users;
    } catch (error: any) {
      console.error('Get online users error:', error);
      this.errorsSubject.next(error.message);
      return [];
    }
  }

  // Legacy socket method for backward compatibility
  getOnlineUsers(): void {
    this.socket?.emit('get_online_users');
  }

  // Get user chats via REST API
  async getUserChatsRest(): Promise<Room[]> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user chats');
      }

      // Update the subject with the new data
      const chats = data.data || [];
      this.userRoomsSubject.next(chats);
      return chats;
    } catch (error: any) {
      console.error('Get user chats error:', error);
      this.errorsSubject.next(error.message);
      return [];
    }
  }

  // Legacy socket method for backward compatibility
  getUserRooms(): void {
    this.socket?.emit('get_user_rooms');
  }

  getPublicRooms(): void {
    this.socket?.emit('get_public_rooms');
  }

  // Room methods
  createRoom(name: string, description?: string, roomType: 'public' | 'private' = 'public'): void {
    this.socket?.emit('create_room', { name, description, roomType });
  }

  joinRoom(roomId: number): void {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: number): void {
    this.socket?.emit('leave_room', { roomId });
  }

  // Message methods
  sendRoomMessage(roomId: number, content: string): void {
    this.socket?.emit('send_room_message', { roomId, content });
  }

  sendPrivateMessage(recipientId: number, content: string): void {
    this.socket?.emit('send_private_message', { recipientId, content });
  }

  // Message history methods
  getRoomMessages(roomId: number, limit: number = 50, offset: number = 0): void {
    this.socket?.emit('get_room_messages', { roomId, limit, offset });
  }

  getPrivateMessages(userId: number, limit: number = 50, offset: number = 0): void {
    this.socket?.emit('get_private_messages', { userId, limit, offset });
  }

  // New methods for updated functionality
  getGeneralMessages(limit: number = 50, offset: number = 0): void {
    this.socket?.emit('get_general_messages', { limit, offset });
  }

  sendGeneralMessage(content: string): void {
    this.socket?.emit('send_general_message', { content });
  }

  getChatHistory(): void {
    this.socket?.emit('get_chat_history');
  }

  // Search users via REST API
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Search failed');
      }

      // Return the search results
      return data.data || [];
    } catch (error: any) {
      console.error('Search error:', error);
      this.errorsSubject.next(error.message);
      return [];
    }
  }

  // Legacy socket method for backward compatibility
  searchUsersSocket(query: string): void {
    this.socket?.emit('search_users', { query });
  }

  inviteToRoom(roomId: number, userId: number): void {
    this.socket?.emit('invite_to_room', { roomId, userId });
  }

  // Typing methods
  startTyping(roomId?: number, userId?: number): void {
    this.socket?.emit('typing_start', { roomId, userId });
  }

  stopTyping(roomId?: number, userId?: number): void {
    this.socket?.emit('typing_stop', { roomId, userId });
  }

  // Keep alive
  ping(): void {
    this.socket?.emit('ping');
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

  getAuthToken(): string | null {
    return this.authToken;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Add these methods after the existing public methods but before the private methods
  
  // Public methods to expose socket.on and socket.emit
  public on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  public off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
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
    this.userRoomsSubject.complete();
    this.publicRoomsSubject.complete();
    this.messagesSubject.complete();
    this.privateMessagesSubject.complete();
    this.roomMessagesSubject.complete();
    this.notificationsSubject.complete();
    this.errorsSubject.complete();
    this.typingSubject.complete();
  }

  // Get chat messages via REST API
  async getChatMessagesRest(chatId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/v1/chats/${chatId}/messages?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get chat messages');
      }

      // Return the messages
      return data.data || [];
    } catch (error: any) {
      console.error('Get chat messages error:', error);
      this.errorsSubject.next(error.message);
      return [];
    }
  }
}
