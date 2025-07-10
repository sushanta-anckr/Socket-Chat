import { Router } from 'express';
import { ChatController } from '@/controllers/ChatController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/chats
 * @desc    Get user's chats
 * @access  Private
 */
router.get('/', ChatController.getUserChats);

/**
 * @route   POST /api/chats
 * @desc    Create a new chat
 * @access  Private
 */
router.post('/', ChatController.createChat);

/**
 * @route   POST /api/chats/private
 * @desc    Create or get private chat with another user
 * @access  Private
 */
router.post('/private', ChatController.createPrivateChat);

/**
 * @route   POST /api/chats/join
 * @desc    Join a chat
 * @access  Private
 */
router.post('/join', ChatController.joinChat);

/**
 * @route   GET /api/chats/:id
 * @desc    Get chat by ID
 * @access  Private
 */
router.get('/:id', ChatController.getChatById);

/**
 * @route   GET /api/chats/:id/messages
 * @desc    Get chat messages
 * @access  Private
 */
router.get('/:id/messages', ChatController.getChatMessages);

/**
 * @route   DELETE /api/chats/:id/leave
 * @desc    Leave a chat
 * @access  Private
 */
router.delete('/:id/leave', ChatController.leaveChat);

export default router; 