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
  selector: 'app-general-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-chat.component.html',
  styleUrls: ['./general-chat.component.scss']
})
export class GeneralChatComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  
  messages: Message[] = [];
  messageInput = '';
  isLoading = false;
  messagesLoaded = false;

  constructor(
    private socketService: SocketService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSocketListeners();
    this.loadInitialMessages();
  }

  ngOnDestroy(): void {
    this.socketService.off('general_messages');
    this.socketService.off('general_message');
  }

  private setupSocketListeners(): void {
    this.socketService.on('general_messages', (messages: any[]) => {
      console.log('General: Received initial messages:', messages);
      
      if (!this.messagesLoaded) {
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
        this.messagesLoaded = true;
        this.isLoading = false;
        console.log('General: Messages loaded successfully');
      }
    });

    this.socketService.on('general_message', (message: any) => {
      console.log('General: Received new message:', message);
      
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
        this.toastService.showInfo('New Message', 
          `${newMessage.sender.displayName || newMessage.sender.username}: ${newMessage.content}`);
      }
    });
  }

  private loadInitialMessages(): void {
    if (!this.messagesLoaded) {
      console.log('General: Loading initial messages...');
      this.isLoading = true;
      
      // Backend should send automatically, but fallback after 2 seconds
      setTimeout(() => {
        if (!this.messagesLoaded) {
          console.log('General: Requesting messages manually...');
          this.socketService.emit('get_general_messages');
        }
      }, 2000);
    }
  }

  sendMessage(): void {
    if (!this.messageInput.trim()) return;

    console.log('General: Sending message:', this.messageInput);
    this.socketService.emit('send_general_message', {
      content: this.messageInput.trim()
    });

    this.messageInput = '';
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 