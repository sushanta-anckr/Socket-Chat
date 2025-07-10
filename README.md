# 💬 Professional Chat Application

A modern, real-time chat application built with Angular 18 and Node.js/Express with Socket.IO integration.

## 🏗️ Architecture Overview

### **Frontend (Angular 18)**
- **Standalone Components**: Modern Angular architecture with standalone components
- **Proper Routing**: Separated pages for authentication, home, chat, and profile
- **Service-Oriented**: Dedicated services for authentication, socket communication, and notifications
- **TypeScript**: Full type safety throughout the application
- **Responsive Design**: Modern UI with SCSS styling

### **Backend (Node.js/Express)**
- **TypeScript**: Full TypeScript implementation
- **JWT Authentication**: Secure token-based authentication
- **Socket.IO**: Real-time communication
- **PostgreSQL**: Robust database with proper schema
- **RESTful API**: Clean API endpoints for data operations

## 📁 Project Structure

```
Project/
├── frontend/                    # Angular 18 Frontend
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── auth/           # Authentication (Login/Register)
│   │   │   ├── home/           # Landing page after login
│   │   │   ├── chat/           # Main chat interface
│   │   │   ├── profile/        # User profile management
│   │   │   └── toast/          # Notification system
│   │   ├── services/
│   │   │   ├── auth.service.ts # Authentication management
│   │   │   ├── socket.service.ts # Socket.IO communication
│   │   │   └── toast.service.ts # Notification system
│   │   ├── guards/
│   │   │   └── auth.guard.ts   # Route protection
│   │   └── app.routes.ts       # Application routing
│   └── ...
├── backend/                    # Node.js/Express Backend
│   ├── src/
│   │   ├── controllers/        # API route handlers
│   │   ├── middleware/         # Authentication middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── socket/            # Socket.IO handlers
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Utility functions
│   ├── database/              # Database schema and seeds
│   └── ...
└── README.md
```

## 🚀 Features

### **Authentication System**
- ✅ User registration and login
- ✅ JWT token-based authentication
- ✅ Secure password hashing with bcrypt
- ✅ Route protection with guards
- ✅ Automatic token refresh

### **Real-time Chat**
- ✅ General chat room (public)
- ✅ Private messaging
- ✅ Custom chat rooms
- ✅ User presence indicators
- ✅ Real-time message delivery
- ✅ Auto-join general chat on login

### **User Interface**
- ✅ Modern, responsive design
- ✅ Clean navigation with tabs
- ✅ Professional authentication pages
- ✅ User-friendly home dashboard
- ✅ Comprehensive profile management

### **Notification System**
- ✅ Toast notifications with auto-dismiss
- ✅ User join/leave notifications
- ✅ Message notifications
- ✅ Error and success feedback

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Project
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb chat_app

# Run schema
psql -d chat_app -f backend/database/schema.sql

# Run seed data
psql -d chat_app -f backend/database/seed.sql
```

### 3. Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start development server
npm start
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/chat_app

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:4200
```

## 📱 Usage

### 1. **Authentication**
- Navigate to `/auth` to register or login
- Valid email and password required
- Automatic redirect to home after successful authentication

### 2. **Home Dashboard**
- Overview of online users
- Quick access to chat and profile
- Feature highlights and navigation

### 3. **Chat Interface**
- **General Chat**: Public room for all users
- **Private Messages**: Direct messaging with other users
- **Rooms**: Create and join custom chat rooms
- **Friends**: Friend management (coming soon)

### 4. **Profile Management**
- Edit username, email, and display name
- View account information
- Logout functionality

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Route Protection**: Guards prevent unauthorized access
- **Input Validation**: Form validation on frontend and backend
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Proper cross-origin setup

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on desktop and mobile
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Non-intrusive notifications
- **Real-time Updates**: Live user presence and messages

## 🔄 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Token refresh

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database health check

## 🔌 Socket.IO Events

### Client → Server
- `get_general_messages` - Fetch general chat messages
- `send_general_message` - Send message to general chat
- `get_online_users` - Get list of online users
- `get_user_rooms` - Get user's rooms
- `get_public_rooms` - Get public rooms
- `create_room` - Create new room
- `join_room` - Join a room
- `leave_room` - Leave a room

### Server → Client
- `general_messages` - General chat messages
- `general_message` - New general message
- `online_users` - Online users list
- `user_joined` - User joined notification
- `user_left` - User left notification
- `user_rooms` - User's rooms
- `public_rooms` - Public rooms list
- `room_created` - Room creation confirmation

## 🚧 Planned Features

- [ ] File upload and sharing
- [ ] Voice/video calling
- [ ] Message search and history
- [ ] User profiles with avatars
- [ ] Advanced room management
- [ ] Message reactions and emojis
- [ ] Push notifications
- [ ] Dark mode theme

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Create an issue in the repository
3. Contact the development team

---

Built with ❤️ using Angular 18, Node.js, and Socket.IO 