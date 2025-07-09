# 🚀 Socket Chat Application

A modern, real-time chat application built with Node.js/Express backend and Angular 18+ frontend, featuring Socket.IO for real-time communication and Redis for pub/sub messaging.

## 🏗️ Project Structure

```
Project/
├── backend/                 # Node.js + Express + Socket.IO + Redis
│   ├── src/
│   │   ├── server.js       # Main server file
│   │   └── config/
│   │       ├── redis.js    # Redis configuration & pub/sub
│   │       ├── socket.js   # Socket.IO event handlers
│   │       └── database.js # PostgreSQL configuration
│   ├── package.json
│   └── .env                # Environment variables
├── frontend/               # Angular 18+ application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   └── chat/   # Main chat component
│   │   │   └── services/
│   │   │       └── socket.service.ts
│   │   └── ...
│   ├── package.json
│   └── angular.json
└── README.md
```

## ✨ Features

### Backend Features
- **Real-time Communication**: Socket.IO with WebSocket and polling fallback
- **Redis Pub/Sub**: Stable socket connections with Redis for clustering
- **PostgreSQL Database**: User management, rooms, and message history
- **Authentication**: JWT-based user authentication
- **Room Management**: Create, join, and leave chat rooms
- **Private Messaging**: Direct messages between users
- **Typing Indicators**: Real-time typing notifications
- **Connection Health**: Ping/pong for connection monitoring
- **Graceful Shutdown**: Proper cleanup on server shutdown

### Frontend Features
- **Angular 18+**: Modern Angular with standalone components
- **Reactive UI**: RxJS streams for real-time updates
- **Beautiful Design**: Modern, responsive Material Design-inspired UI
- **Multiple Chat Modes**: Public chat, private messages, and rooms
- **Real-time Notifications**: Toast notifications for events
- **Typing Indicators**: Visual typing indicators
- **User Management**: Online users list and status
- **Room Management**: Create and manage chat rooms
- **Message History**: Scrollable message history
- **Responsive Design**: Mobile-friendly interface

## 🛠️ Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v13 or higher)
- **Redis** (v6 or higher)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd Project

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Create database (replace with your credentials)
createdb socket_app

# The application will automatically create tables on first run
```

### 3. Redis Setup

```bash
# Start Redis service
sudo systemctl start redis

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Environment Configuration

```bash
# Copy environment file
cd backend
cp .env.example .env

# Edit .env with your configuration
# Update database credentials, Redis settings, etc.
```

### 5. Run the Application

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend development server
cd frontend
ng serve
```

### 6. Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🔧 Configuration

### Backend Configuration (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=socket_app
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4200

# Socket.IO Configuration
SOCKET_ORIGINS=http://localhost:4200
```

### Frontend Configuration

The frontend automatically connects to the backend at `http://localhost:3000`. To change this, update the `SERVER_URL` in `src/app/services/socket.service.ts`.

## 🏃‍♂️ Running in Production

### Backend Production

```bash
cd backend
npm start
```

### Frontend Production

```bash
cd frontend
ng build --prod
# Serve the dist/ folder with your preferred web server
```

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
ng test
```

## 📡 API Documentation

### Socket.IO Events

#### Client to Server Events

- `authenticate`: User authentication
- `join_room`: Join a chat room
- `leave_room`: Leave a chat room
- `private_message`: Send private message
- `room_message`: Send room message
- `typing_start`: Start typing indicator
- `typing_stop`: Stop typing indicator
- `get_online_users`: Get list of online users
- `get_active_rooms`: Get list of active rooms
- `ping`: Connection health check

#### Server to Client Events

- `authenticated`: Authentication success
- `authentication_error`: Authentication failed
- `online_users`: List of online users
- `active_rooms`: List of active rooms
- `private_message`: Received private message
- `room_message`: Received room message
- `user_online`: User came online
- `user_offline`: User went offline
- `user_typing`: User typing indicator
- `room_joined`: Successfully joined room
- `room_left`: Successfully left room
- `notification`: General notification
- `error`: Error message
- `pong`: Health check response

### REST API Endpoints

- `GET /`: Server status
- `GET /health`: Health check

## 🔐 Security Features

- **CORS Protection**: Configurable CORS origins
- **Helmet**: Security headers
- **Input Validation**: Sanitized user inputs
- **Rate Limiting**: Built-in rate limiting
- **JWT Authentication**: Secure user authentication
- **SQL Injection Protection**: Parameterized queries

## 🎨 UI/UX Features

- **Modern Design**: Material Design-inspired interface
- **Dark/Light Theme**: Responsive color scheme
- **Emoji Support**: Full emoji support in messages
- **File Upload**: Image and file sharing (future feature)
- **Message Reactions**: React to messages (future feature)
- **Message Threading**: Threaded conversations (future feature)

## 🚀 Deployment

### Docker Deployment

```bash
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN ng build --prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
  
  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=socket_app
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Socket.IO** for real-time communication
- **Redis** for pub/sub messaging
- **PostgreSQL** for reliable data storage
- **Angular** for the modern frontend framework
- **Express.js** for the backend framework

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

---

**Happy Chatting! 🎉** 