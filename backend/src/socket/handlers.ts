import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types/index';

// Store general messages in memory (in production, use database)
const generalMessages: any[] = [
  {
    id: '1',
    content: 'Welcome to the general chat! 🎉',
    sender: {
      id: 'system',
      username: 'System',
      displayName: 'System'
    },
    timestamp: new Date().toISOString(),
    chatId: 'general'
  }
];

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userEmail} (${socket.userId})`);

    // Auto-join general chat
    socket.join('general');

    // Send initial general messages to the new user immediately
    console.log('Sending initial general messages to user:', socket.userEmail);
    socket.emit('general_messages', generalMessages);

    // Get current online users (excluding the current user)
    const onlineUsers = Array.from(io.sockets.sockets.values())
      .filter((s): s is AuthenticatedSocket => 
        (s as AuthenticatedSocket).userId !== undefined && 
        (s as AuthenticatedSocket).userId !== socket.userId
      )
      .map((s: AuthenticatedSocket) => ({
        id: s.userId,
        username: s.username,
        email: s.userEmail,
        displayName: s.username,
        isOnline: true
      }));

    // Send current online users to the new user
    socket.emit('online_users', onlineUsers);

    // Notify others that user joined and send updated online users list
    socket.broadcast.emit('user_joined', {
      id: socket.userId,
      username: socket.username,
      email: socket.userEmail,
      displayName: socket.username
    });

    // Send updated online users list to all users
    const allOnlineUsers = Array.from(io.sockets.sockets.values())
      .filter((s): s is AuthenticatedSocket => 
        (s as AuthenticatedSocket).userId !== undefined
      )
      .map((s: AuthenticatedSocket) => ({
        id: s.userId,
        username: s.username,
        email: s.userEmail,
        displayName: s.username,
        isOnline: true
      }));

    io.emit('online_users_updated', allOnlineUsers);

    // Handle general chat messages request (only send once)
    socket.on('get_general_messages', () => {
      console.log('Manual request for general messages from:', socket.userEmail);
      socket.emit('general_messages', generalMessages);
    });

    socket.on('send_general_message', (data: { content: string }) => {
      console.log('New message from:', socket.userEmail, 'Content:', data.content);
      
      const message = {
        id: Date.now().toString(),
        content: data.content,
        sender: {
          id: socket.userId,
          username: socket.username,
          displayName: socket.username
        },
        timestamp: new Date().toISOString(),
        chatId: 'general'
      };

      // Store message in memory
      generalMessages.push(message);

      // Broadcast to all users in general chat
      io.to('general').emit('general_message', message);
      console.log('Message broadcasted to general chat');
    });

    // Handle online users request
    socket.on('get_online_users', () => {
      const onlineUsers = Array.from(io.sockets.sockets.values())
        .filter((s): s is AuthenticatedSocket => 
          (s as AuthenticatedSocket).userId !== undefined && 
          (s as AuthenticatedSocket).userId !== socket.userId
        )
        .map((s: AuthenticatedSocket) => ({
          id: s.userId,
          username: s.username,
          email: s.userEmail,
          displayName: s.username,
          isOnline: true
        }));

      socket.emit('online_users', onlineUsers);
    });

    // Handle user rooms
    socket.on('get_user_rooms', () => {
      // Return sample rooms for now
      const userRooms = [
        {
          id: '1',
          name: 'My Private Room',
          description: 'A private room for close friends',
          memberCount: 3,
          isPrivate: true,
          role: 'admin'
        }
      ];
      socket.emit('user_rooms', userRooms);
    });

    // Handle public rooms
    socket.on('get_public_rooms', () => {
      // Return sample public rooms
      const publicRooms = [
        {
          id: 'public1',
          name: 'Tech Talk',
          description: 'Discuss the latest in technology',
          memberCount: 25,
          isPrivate: false
        },
        {
          id: 'public2',
          name: 'Random Chat',
          description: 'General discussions about anything',
          memberCount: 15,
          isPrivate: false
        }
      ];
      socket.emit('public_rooms', publicRooms);
    });

    // Handle room creation
    socket.on('create_room', (data: { name: string; description: string; isPrivate: boolean }) => {
      const newRoom = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        memberCount: 1,
        isPrivate: data.isPrivate,
        role: 'admin',
        createdBy: socket.userId
      };

      socket.emit('room_created', newRoom);
    });

    // Handle room joining
    socket.on('join_room', (data: { roomId: string }) => {
      socket.join(data.roomId);
      socket.emit('room_joined', { roomId: data.roomId });
    });

    // Handle room leaving
    socket.on('leave_room', (data: { roomId: string }) => {
      socket.leave(data.roomId);
      socket.emit('room_left', { roomId: data.roomId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userEmail} (${socket.userId})`);
      
      // Notify others that user left
      socket.broadcast.emit('user_left', {
        id: socket.userId,
        username: socket.username,
        email: socket.userEmail,
        displayName: socket.username
      });

      // Send updated online users list to all remaining users
      const remainingOnlineUsers = Array.from(io.sockets.sockets.values())
        .filter((s): s is AuthenticatedSocket => 
          (s as AuthenticatedSocket).userId !== undefined
        )
        .map((s: AuthenticatedSocket) => ({
          id: s.userId,
          username: s.username,
          email: s.userEmail,
          displayName: s.username,
          isOnline: true
        }));

      socket.broadcast.emit('online_users_updated', remainingOnlineUsers);
    });
  });
} 