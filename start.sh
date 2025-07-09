#!/bin/bash

# Socket Chat Application Startup Script
# This script helps you start all services for the chat application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_colored() {
    printf "${1}${2}${NC}\n"
}

print_colored $BLUE "🚀 Socket Chat Application Startup Script"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_colored $RED "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_colored $RED "❌ npm is not installed. Please install npm."
    exit 1
fi

# Check if Angular CLI is installed
if ! command -v ng &> /dev/null; then
    print_colored $YELLOW "⚠️  Angular CLI is not installed. Installing globally..."
    npm install -g @angular/cli@18
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_colored $RED "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v18 or higher."
    exit 1
fi

print_colored $GREEN "✅ Node.js v$(node -v) detected"

# Function to check if a service is running
check_service() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if a port is in use
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if PostgreSQL is running
print_colored $BLUE "🔍 Checking PostgreSQL..."
if check_service "postgres" || check_port 5432; then
    print_colored $GREEN "✅ PostgreSQL is running"
else
    print_colored $YELLOW "⚠️  PostgreSQL is not running. Please start PostgreSQL:"
    echo "   sudo systemctl start postgresql"
    echo "   or"
    echo "   brew services start postgresql (macOS)"
    echo ""
    print_colored $YELLOW "📝 Don't forget to create the database:"
    echo "   createdb socket_app"
    echo ""
fi

# Check if Redis is running
print_colored $BLUE "🔍 Checking Redis..."
if check_service "redis" || check_port 6379; then
    print_colored $GREEN "✅ Redis is running"
else
    print_colored $YELLOW "⚠️  Redis is not running. Please start Redis:"
    echo "   sudo systemctl start redis"
    echo "   or"
    echo "   brew services start redis (macOS)"
    echo "   or"
    echo "   docker run -d -p 6379:6379 redis:alpine"
    echo ""
fi

# Install backend dependencies
print_colored $BLUE "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    print_colored $YELLOW "Installing backend dependencies..."
    npm install
    print_colored $GREEN "✅ Backend dependencies installed"
else
    print_colored $GREEN "✅ Backend dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_colored $YELLOW "⚠️  .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_colored $GREEN "✅ .env file created. Please edit it with your configuration."
    else
        print_colored $RED "❌ .env.example not found. Please create .env manually."
    fi
fi

cd ..

# Install frontend dependencies
print_colored $BLUE "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    print_colored $YELLOW "Installing frontend dependencies..."
    npm install
    print_colored $GREEN "✅ Frontend dependencies installed"
else
    print_colored $GREEN "✅ Frontend dependencies already installed"
fi

cd ..

# Ask user how they want to start the application
echo ""
print_colored $BLUE "🚀 How would you like to start the application?"
echo "1) Start both backend and frontend in separate terminals"
echo "2) Start backend only"
echo "3) Start frontend only"
echo "4) Exit"
echo ""
read -p "Choose an option (1-4): " choice

case $choice in
    1)
        print_colored $GREEN "🚀 Starting both backend and frontend..."
        
        # Check if ports are available
        if check_port 3000; then
            print_colored $RED "❌ Port 3000 is already in use. Please stop the service using this port."
            exit 1
        fi
        
        if check_port 4200; then
            print_colored $RED "❌ Port 4200 is already in use. Please stop the service using this port."
            exit 1
        fi
        
        # Start backend in a new terminal
        print_colored $YELLOW "📡 Starting backend server..."
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd backend && npm run dev; exec bash"
        elif command -v osascript &> /dev/null; then
            osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/backend && npm run dev"'
        elif command -v cmd.exe &> /dev/null; then
            cmd.exe /c start cmd /k "cd backend && npm run dev"
        else
            print_colored $YELLOW "Please manually run: cd backend && npm run dev"
        fi
        
        sleep 2
        
        # Start frontend in a new terminal
        print_colored $YELLOW "🌐 Starting frontend server..."
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd frontend && ng serve; exec bash"
        elif command -v osascript &> /dev/null; then
            osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/frontend && ng serve"'
        elif command -v cmd.exe &> /dev/null; then
            cmd.exe /c start cmd /k "cd frontend && ng serve"
        else
            print_colored $YELLOW "Please manually run: cd frontend && ng serve"
        fi
        
        print_colored $GREEN "🎉 Application is starting!"
        print_colored $GREEN "Frontend: http://localhost:4200"
        print_colored $GREEN "Backend: http://localhost:3000"
        ;;
    2)
        print_colored $GREEN "📡 Starting backend only..."
        cd backend
        npm run dev
        ;;
    3)
        print_colored $GREEN "🌐 Starting frontend only..."
        cd frontend
        ng serve
        ;;
    4)
        print_colored $YELLOW "👋 Goodbye!"
        exit 0
        ;;
    *)
        print_colored $RED "❌ Invalid option. Please choose 1-4."
        exit 1
        ;;
esac

print_colored $GREEN "✨ Done! Happy chatting! 🎉" 