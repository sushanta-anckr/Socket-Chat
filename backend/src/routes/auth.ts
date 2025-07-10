import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authenticateToken, optionalAuth } from '@/middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Public
 */
router.post('/refresh', AuthController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', optionalAuth, AuthController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, AuthController.me);

export default router; 