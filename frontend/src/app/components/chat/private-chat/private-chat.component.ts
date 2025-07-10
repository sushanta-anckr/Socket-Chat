import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService, User } from '../../../services/auth.service';

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
  selector: 'app-private-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.scss']
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  @Input() onlineUsers: any[] = [];
  
  messages: Message[] = [];
  messageInput = '';
  selectedUser: any = null;
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;

  constructor(
    private socketService: SocketService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.off('private_message');
    this.socketService.off('private_messages');
  }

  private setupSocketListeners(): void {
    this.socketService.on('private_message', (message: any) => {
      console.log('Private: Received new message:', message);
      
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
      
      this.messages.push(newMessage);
      
      // Show toast for messages from others
      if (!newMessage.isOwn) {
        this.toastService.showInfo('Private Message', 
          `${newMessage.sender.displayName || newMessage.sender.username}: ${newMessage.content}`);
      }
    });

    this.socketService.on('private_messages', (messages: any[]) => {
      console.log('Private: Received message history:', messages);
      
      this.messages = messages.map(msg => ({
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

  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    
    // Filter online users based on search query
    setTimeout(() => {
      this.searchResults = this.onlineUsers.filter(user => 
        user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      this.isSearching = false;
    }, 300);
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.searchResults = [];
    this.searchQuery = '';
    this.loadPrivateMessages(user.id);
  }

  loadPrivateMessages(userId: string): void {
    console.log('Private: Loading messages for user:', userId);
    this.messages = [];
    // this.socketService.emit('get_private_messages', { userId });
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.selectedUser) return;

    console.log('Private: Sending message to:', this.selectedUser.username);
    // this.socketService.emit('send_private_message', {
    //   recipientId: this.selectedUser.id,
    //   content: this.messageInput.trim()
    // });

    this.messageInput = '';
  }

  goBack(): void {
    this.selectedUser = null;
    this.messages = [];
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 