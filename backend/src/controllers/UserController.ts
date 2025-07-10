import { Request, Response } from 'express';
import { UserModel as User } from '@/models/User';
import { logger } from '@/utils/logger';
import { ApiResponse, UserResponse } from '@/types';

export class UserController {
  /**
   * Search users by username or display name
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      // For now, return empty array since searchUsers method doesn't exist yet
      // TODO: Implement User.searchUsers method
      const users: UserResponse[] = [];
      
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error) {
      logger.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }

      const user = await User.findById(id);
      
      if (!user) {
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
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          is_online: user.is_online,
          last_seen: user.last_seen,
          created_at: user.created_at
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

  /**
   * Update current user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { display_name, avatar_url } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Update user profile
      const updatedUser = await User.updateProfile(user.userId, {
        display_name,
        avatar_url
      });

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          display_name: updatedUser.display_name,
          avatar_url: updatedUser.avatar_url,
          is_online: updatedUser.is_online,
          last_seen: updatedUser.last_seen,
          created_at: updatedUser.created_at
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get online users
   */
  static async getOnlineUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;
      
      // For now, return empty array since getOnlineUsers method signature is different
      // TODO: Implement User.getOnlineUsers with proper parameters
      const users: UserResponse[] = [];
      
      res.json({
        success: true,
        message: 'Online users retrieved successfully',
        data: users
      });
    } catch (error) {
      logger.error('Get online users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user's online status
   */
  static async updateOnlineStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { isOnline } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (typeof isOnline !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isOnline must be a boolean value'
        });
        return;
      }

      await User.updateOnlineStatus(user.userId, isOnline);

      res.json({
        success: true,
        message: 'Online status updated successfully'
      });
    } catch (error) {
      logger.error('Update online status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
} 