import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel as User } from '@/models/User';
import { generateToken, generateRefreshToken } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { 
  RegisterRequest, 
  LoginRequest, 
  RefreshTokenRequest,
  AuthResponse,
  ApiResponse 
} from '@/types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request<{}, ApiResponse<AuthResponse>, RegisterRequest>, res: Response): Promise<void> {
    try {
      const { username, email, password, displayName } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      // Check if username is taken
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
        return;
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
        display_name: displayName || username
      });

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Update user's online status
      await User.updateOnlineStatus(user.id, true);

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            isOnline: true,
            lastSeen: user.last_seen,
            createdAt: user.created_at
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request<{}, ApiResponse<AuthResponse>, LoginRequest>, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Find user and verify password
      const user = await User.authenticate(email, password);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Update user's online status
      await User.updateOnlineStatus(user.id, true);

      logger.info(`User logged in successfully: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            isOnline: true,
            lastSeen: user.last_seen,
            createdAt: user.created_at
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refresh authentication token
   */
  static async refresh(req: Request<{}, ApiResponse<{ token: string }>, RefreshTokenRequest>, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // TODO: Implement refresh token validation
      // For now, we'll just return an error
      res.status(501).json({
        success: false,
        message: 'Refresh token functionality not implemented yet'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      
      if (user) {
        // Update user's online status
        await User.updateOnlineStatus(user.userId, false);
        logger.info(`User logged out: ${user.email}`);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get full user details
      const userDetails = await User.findById(user.userId);
      if (!userDetails) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          id: userDetails.id,
          username: userDetails.username,
          email: userDetails.email,
          displayName: userDetails.display_name,
          avatarUrl: userDetails.avatar_url,
          isOnline: userDetails.is_online,
          lastSeen: userDetails.last_seen,
          createdAt: userDetails.created_at
        }
      });
    } catch (error) {
      logger.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
} 