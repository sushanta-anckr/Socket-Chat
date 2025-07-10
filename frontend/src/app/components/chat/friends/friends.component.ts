import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService, User } from '../../../services/auth.service';

interface Friend {
  id: string;
  username: string;
  displayName?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    displayName?: string;
  };
  timestamp: Date;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss']
})
export class FriendsComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  @Input() onlineUsers: any[] = [];
  
  friends: Friend[] = [];
  friendRequests: FriendRequest[] = [];
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  selectedTab: 'friends' | 'requests' | 'add' = 'friends';

  constructor(
    private socketService: SocketService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSocketListeners();
    this.loadFriends();
  }

  ngOnDestroy(): void {
    this.socketService.off('friends_list');
    this.socketService.off('friend_requests');
    this.socketService.off('friend_added');
    this.socketService.off('friend_request_sent');
  }

  private setupSocketListeners(): void {
    this.socketService.on('friends_list', (friends: any[]) => {
      console.log('Friends: Received friends list:', friends);
      this.friends = friends;
    });

    this.socketService.on('friend_requests', (requests: any[]) => {
      console.log('Friends: Received friend requests:', requests);
      this.friendRequests = requests.map(req => ({
        id: req.id,
        sender: req.sender,
        timestamp: new Date(req.timestamp)
      }));
    });

    this.socketService.on('friend_added', (friend: any) => {
      console.log('Friends: Friend added:', friend);
      this.friends.push(friend);
      this.toastService.showSuccess('Friend Added', `${friend.displayName || friend.username} is now your friend`);
    });

    this.socketService.on('friend_request_sent', (data: any) => {
      console.log('Friends: Friend request sent:', data);
      this.toastService.showSuccess('Friend Request Sent', `Friend request sent to ${data.username}`);
    });
  }

  private loadFriends(): void {
    console.log('Friends: Loading friends...');
    // this.socketService.emit('get_friends');
    // this.socketService.emit('get_friend_requests');
  }

  // Tab Management
  switchTab(tab: 'friends' | 'requests' | 'add'): void {
    this.selectedTab = tab;
    this.searchQuery = '';
    this.searchResults = [];
  }

  // Search for users to add as friends
  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    
    // Filter online users (excluding friends and self)
    setTimeout(() => {
      this.searchResults = this.onlineUsers.filter(user => 
        user.id !== this.currentUser?.id &&
        !this.friends.some(f => f.id === user.id) &&
        (user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
         user.displayName?.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
      this.isSearching = false;
    }, 300);
  }

  // Send friend request
  sendFriendRequest(user: any): void {
    console.log('Friends: Sending friend request to:', user.username);
    // this.socketService.emit('send_friend_request', { userId: user.id });
    this.toastService.showInfo('Friend Request', `Friend request sent to ${user.displayName || user.username}`);
  }

  // Accept friend request
  acceptFriendRequest(request: FriendRequest): void {
    console.log('Friends: Accepting friend request from:', request.sender.username);
    // this.socketService.emit('accept_friend_request', { requestId: request.id });
    this.friendRequests = this.friendRequests.filter(r => r.id !== request.id);
    this.toastService.showSuccess('Friend Request Accepted', `You are now friends with ${request.sender.displayName || request.sender.username}`);
  }

  // Decline friend request
  declineFriendRequest(request: FriendRequest): void {
    console.log('Friends: Declining friend request from:', request.sender.username);
    // this.socketService.emit('decline_friend_request', { requestId: request.id });
    this.friendRequests = this.friendRequests.filter(r => r.id !== request.id);
    this.toastService.showInfo('Friend Request Declined', `Friend request from ${request.sender.displayName || request.sender.username} declined`);
  }

  // Remove friend
  removeFriend(friend: Friend): void {
    console.log('Friends: Removing friend:', friend.username);
    // this.socketService.emit('remove_friend', { friendId: friend.id });
    this.friends = this.friends.filter(f => f.id !== friend.id);
    this.toastService.showInfo('Friend Removed', `${friend.displayName || friend.username} removed from friends`);
  }

  // Utility methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 