@echo off
setlocal enabledelayedexpansion

:: Socket Chat Application Startup Script for Windows
echo.
echo ================================
echo 🚀 Socket Chat Application Startup Script
echo ================================

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js v18 or higher.
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

:: Check if Angular CLI is installed
ng version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Angular CLI is not installed. Installing globally...
    npm install -g @angular/cli@18
)

echo ✅ Node.js is installed

:: Check if PostgreSQL is running (simplified check)
echo 🔍 Checking PostgreSQL...
netstat -an | findstr :5432 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL might not be running on port 5432.
    echo    Please start PostgreSQL and create the database:
    echo    createdb socket_app
    echo.
) else (
    echo ✅ PostgreSQL appears to be running
)

:: Check if Redis is running (simplified check)
echo 🔍 Checking Redis...
netstat -an | findstr :6379 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Redis might not be running on port 6379.
    echo    Please start Redis or run: docker run -d -p 6379:6379 redis:alpine
    echo.
) else (
    echo ✅ Redis appears to be running
)

:: Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    echo ✅ Backend dependencies installed
) else (
    echo ✅ Backend dependencies already installed
)

:: Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ .env file created. Please edit it with your configuration.
    ) else (
        echo ❌ .env.example not found. Please create .env manually.
    )
)

cd ..

:: Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    echo ✅ Frontend dependencies installed
) else (
    echo ✅ Frontend dependencies already installed
)

cd ..

:: Ask user how they want to start the application
echo.
echo 🚀 How would you like to start the application?
echo 1) Start both backend and frontend in separate windows
echo 2) Start backend only
echo 3) Start frontend only
echo 4) Exit
echo.
set /p choice="Choose an option (1-4): "

if "%choice%"=="1" (
    echo 🚀 Starting both backend and frontend...
    
    :: Check if ports are available
    netstat -an | findstr :3000 >nul 2>&1
    if not errorlevel 1 (
        echo ❌ Port 3000 is already in use. Please stop the service using this port.
        pause
        exit /b 1
    )
    
    netstat -an | findstr :4200 >nul 2>&1
    if not errorlevel 1 (
        echo ❌ Port 4200 is already in use. Please stop the service using this port.
        pause
        exit /b 1
    )
    
    :: Start backend in a new window
    echo 📡 Starting backend server...
    start "Backend Server" cmd /k "cd backend && npm run dev"
    
    :: Wait a moment
    timeout /t 3 /nobreak >nul
    
    :: Start frontend in a new window
    echo 🌐 Starting frontend server...
    start "Frontend Server" cmd /k "cd frontend && ng serve"
    
    echo 🎉 Application is starting!
    echo Frontend: http://localhost:4200
    echo Backend: http://localhost:3000
    
) else if "%choice%"=="2" (
    echo 📡 Starting backend only...
    cd backend
    npm run dev
    
) else if "%choice%"=="3" (
    echo 🌐 Starting frontend only...
    cd frontend
    ng serve
    
) else if "%choice%"=="4" (
    echo 👋 Goodbye!
    exit /b 0
    
) else (
    echo ❌ Invalid option. Please choose 1-4.
    pause
    exit /b 1
)

echo ✨ Done! Happy chatting! 🎉
pause 