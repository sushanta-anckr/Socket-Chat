import { Router } from 'express';
import { UserController } from '@/controllers/UserController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users/search
 * @desc    Search users by username or display name
 * @access  Private
 */
router.get('/search', UserController.searchUsers);

/**
 * @route   GET /api/users/online
 * @desc    Get online users
 * @access  Private
 */
router.get('/online', UserController.getOnlineUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/:id', UserController.getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', UserController.updateProfile);

/**
 * @route   PUT /api/users/status
 * @desc    Update user's online status
 * @access  Private
 */
router.put('/status', UserController.updateOnlineStatus);

export default router; 