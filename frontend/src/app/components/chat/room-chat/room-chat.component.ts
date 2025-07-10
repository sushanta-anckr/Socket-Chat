import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService, User } from '../../../services/auth.service';

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  role?: string;
}

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    displayName?: string;
  };
  timestamp: Date;
  isOwn: boolean;
}

@Component({
  selector: 'app-room-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room-chat.component.html',
  styleUrls: ['./room-chat.component.scss']
})
export class RoomChatComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  
  userRooms: ChatRoom[] = [];
  publicRooms: ChatRoom[] = [];
  selectedRoom: ChatRoom | null = null;
  roomMessages: Message[] = [];
  messageInput = '';
  
  // Room Creation
  showCreateRoom = false;
  newRoomName = '';
  newRoomDescription = '';
  isCreatingRoom = false;

  constructor(
    private socketService: SocketService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSocketListeners();
    this.loadRooms();
  }

  ngOnDestroy(): void {
    this.socketService.off('user_rooms');
    this.socketService.off('public_rooms');
    this.socketService.off('room_created');
    this.socketService.off('room_joined');
    this.socketService.off('room_message');
    this.socketService.off('room_messages');
  }

  private setupSocketListeners(): void {
    this.socketService.on('user_rooms', (rooms: any[]) => {
      console.log('Rooms: Received user rooms:', rooms);
      this.userRooms = rooms;
    });

    this.socketService.on('public_rooms', (rooms: any[]) => {
      console.log('Rooms: Received public rooms:', rooms);
      this.publicRooms = rooms;
    });

    this.socketService.on('room_created', (room: any) => {
      console.log('Rooms: Room created:', room);
      this.userRooms.push(room);
      this.toastService.showSuccess('Room Created', `Room "${room.name}" created successfully`);
      this.showCreateRoom = false;
      this.newRoomName = '';
      this.newRoomDescription = '';
      this.isCreatingRoom = false;
    });

    this.socketService.on('room_joined', (data: any) => {
      console.log('Rooms: Joined room:', data);
      this.toastService.showSuccess('Room Joined', 'You joined the room');
    });

    this.socketService.on('room_message', (message: any) => {
      console.log('Rooms: Received room message:', message);
      
      const newMessage: Message = {
        id: message.id,
        content: message.content,
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          displayName: message.sender.displayName
        },
        timestamp: new Date(message.timestamp),
        isOwn: message.sender.id === this.currentUser?.id
      };
      
      this.roomMessages.push(newMessage);
      
      // Show toast for messages from others
      if (!newMessage.isOwn) {
        this.toastService.showInfo('Room Message', 
          `${newMessage.sender.displayName || newMessage.sender.username}: ${newMessage.content}`);
      }
    });

    this.socketService.on('room_messages', (messages: any[]) => {
      console.log('Rooms: Received room messages:', messages);
      
      this.roomMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
          displayName: msg.sender.displayName
        },
        timestamp: new Date(msg.timestamp),
        isOwn: msg.sender.id === this.currentUser?.id
      }));
    });
  }

  private loadRooms(): void {
    console.log('Rooms: Loading rooms...');
    this.socketService.emit('get_user_rooms');
    this.socketService.emit('get_public_rooms');
  }

  // Room Management
  toggleCreateRoom(): void {
    this.showCreateRoom = !this.showCreateRoom;
  }

  createRoom(): void {
    if (!this.newRoomName.trim()) return;

    console.log('Rooms: Creating room:', this.newRoomName);
    this.isCreatingRoom = true;
    this.socketService.emit('create_room', {
      name: this.newRoomName.trim(),
      description: this.newRoomDescription.trim(),
      isPrivate: false
    });
  }

  joinRoom(room: ChatRoom): void {
    console.log('Rooms: Joining room:', room.name);
    this.selectedRoom = room;
    this.socketService.emit('join_room', { roomId: room.id });
    this.loadRoomMessages(room.id);
  }

  loadRoomMessages(roomId: string): void {
    console.log('Rooms: Loading messages for room:', roomId);
    this.roomMessages = [];
    // this.socketService.emit('get_room_messages', { roomId });
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.selectedRoom) return;

    console.log('Rooms: Sending message to room:', this.selectedRoom.name);
    // this.socketService.emit('send_room_message', {
    //   roomId: this.selectedRoom.id,
    //   content: this.messageInput.trim()
    // });

    this.messageInput = '';
  }

  leaveRoom(): void {
    if (!this.selectedRoom) return;

    console.log('Rooms: Leaving room:', this.selectedRoom.name);
    this.socketService.emit('leave_room', { roomId: this.selectedRoom.id });
    this.selectedRoom = null;
    this.roomMessages = [];
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 