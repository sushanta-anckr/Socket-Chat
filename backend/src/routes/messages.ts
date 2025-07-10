import { Router } from 'express';
import { MessageController } from '@/controllers/MessageController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// All message routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/messages
 * @desc    Create a new message
 * @access  Private
 */
router.post('/', MessageController.createMessage);

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
router.get('/:id', MessageController.getMessageById);

/**
 * @route   PUT /api/messages/:id
 * @desc    Update a message
 * @access  Private
 */
router.put('/:id', MessageController.updateMessage);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:id', MessageController.deleteMessage);

/**
 * @route   GET /api/messages/search/:chat_id
 * @desc    Search messages in a chat
 * @access  Private
 */
router.get('/search/:chat_id', MessageController.searchMessages);

export default router; 