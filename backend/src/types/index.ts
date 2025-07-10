import { Socket } from 'socket.io';

// Core entity types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Chat {
  id: string;
  name: string | null;
  description: string | null;
  chat_type: 'public' | 'private' | 'room';
  created_by: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: Date;
  last_read_at: Date | null;
  is_muted: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: Date;
  updated_at: Date;
}

export interface RoomInvite {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: string | null;
  ip_address: string | null;
  expires_at: Date;
  created_at: Date;
  is_active: boolean;
}

// DTOs (Data Transfer Objects)
export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface UserLoginDto {
  username: string;
  password: string;
}

export interface ChatCreateDto {
  name?: string;
  description?: string;
  chat_type: 'public' | 'private' | 'room';
  avatar_url?: string;
}

export interface MessageCreateDto {
  chat_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
}

export interface FriendshipCreateDto {
  addressee_id: string;
}

export interface RoomInviteCreateDto {
  room_id: string;
  invitee_id: string;
  expires_at?: Date;
}

// Response types
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: Date;
  created_at: Date;
}

export interface ChatResponse {
  id: string;
  name: string | null;
  description: string | null;
  chat_type: 'public' | 'private' | 'room';
  created_by: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  member_count?: number;
  members?: UserResponse[];
  last_message?: MessageResponse;
}

export interface MessageResponse {
  id: string;
  chat_id: string;
  sender: UserResponse;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to?: MessageResponse | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FriendshipResponse {
  id: string;
  requester: UserResponse;
  addressee: UserResponse;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: Date;
}

export interface RoomInviteResponse {
  id: string;
  room: ChatResponse;
  inviter: UserResponse;
  invitee: UserResponse;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: Date | null;
  created_at: Date;
}

// API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: string[];
}

// Authentication types
export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
  expires_at: Date;
}

// Socket.IO Types
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  username?: string;
}

export interface SocketEventData {
  userId: string;
  chatId: string;
  message?: string;
  timestamp?: string;
}

export interface SocketUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  socket_id: string;
  is_online: boolean;
}

export interface SocketMessage {
  id: string;
  chat_id: string;
  sender: SocketUser;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
  created_at: Date;
}

export interface SocketTypingData {
  chat_id: string;
  user: SocketUser;
  is_typing: boolean;
}

// Database query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

// Chat query options
export interface ChatQueryOptions extends QueryOptions {
  chat_type?: 'public' | 'private' | 'room';
  user_id?: string;
  include_members?: boolean;
  include_last_message?: boolean;
}

// Message query options
export interface MessageQueryOptions extends QueryOptions {
  chat_id?: string;
  sender_id?: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  before_date?: Date;
  after_date?: Date;
}

// User query options
export interface UserQueryOptions extends QueryOptions {
  is_online?: boolean;
  search?: string;
  exclude_user_id?: string;
}

// Error types
export interface CustomError extends Error {
  statusCode: number;
  code?: string;
  details?: any;
}

// Utility types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface CreateMessageRequest {
  chat_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  reply_to?: string;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface CreateChatRequest {
  name: string;
  description?: string;
  type: 'private' | 'group' | 'room';
  members?: string[];
}

export interface JoinChatRequest {
  chat_id: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
} 