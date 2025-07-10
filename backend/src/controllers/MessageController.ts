import { Request, Response } from 'express';
import { MessageModel as Message } from '@/models/Message';
import { ChatModel as Chat } from '@/models/Chat';
import { logger } from '@/utils/logger';
import { ApiResponse, MessageResponse, CreateMessageRequest, UpdateMessageRequest } from '@/types';

export class MessageController {
  /**
   * Create a new message
   */
  static async createMessage(req: Request<{}, ApiResponse<MessageResponse>, CreateMessageRequest>, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { chat_id, content, message_type = 'text', reply_to } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Validate required fields
      if (!chat_id || !content) {
        res.status(400).json({
          success: false,
          message: 'Chat ID and content are required'
        });
        return;
      }

      // Check if user is a member of the chat
      const chat = await Chat.findById(chat_id);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
        return;
      }

      const isMember = chat.members?.some(member => member.id === user.userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          message: 'You are not a member of this chat'
        });
        return;
      }

      // Create message with proper type handling
      const messageData = {
        chat_id,
        sender_id: user.userId,
        content,
        message_type,
        ...(reply_to && { reply_to_id: reply_to })  // Only include if reply_to exists
      };

      const message = await Message.create(messageData);

      res.status(201).json({
        success: true,
        message: 'Message created successfully',
        data: message
      });
    } catch (error) {
      logger.error('Create message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get message by ID
   */
  static async getMessageById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
        return;
      }

      const message = await Message.findById(id);

      if (!message) {
        res.status(404).json({
          success: false,
          message: 'Message not found'
        });
        return;
      }

      // Check if user is a member of the chat
      const chat = await Chat.findById(message.chat_id);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
        return;
      }

      const isMember = chat.members?.some(member => member.id === user.userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          message: 'You are not a member of this chat'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Message retrieved successfully',
        data: message
      });
    } catch (error) {
      logger.error('Get message by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update a message
   */
  static async updateMessage(req: Request<{id: string}, ApiResponse<MessageResponse>, UpdateMessageRequest>, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;
      const { content } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
        return;
      }

      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Content is required'
        });
        return;
      }

      // Check if message exists and user is the sender
      const existingMessage = await Message.findById(id);
      if (!existingMessage) {
        res.status(404).json({
          success: false,
          message: 'Message not found'
        });
        return;
      }

      if (existingMessage.sender.id !== user.userId) {
        res.status(403).json({
          success: false,
          message: 'You can only edit your own messages'
        });
        return;
      }

      // TODO: Implement Message.update method
      // For now, return the existing message
      res.json({
        success: true,
        message: 'Message update not implemented yet',
        data: existingMessage
      });
    } catch (error) {
      logger.error('Update message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
        return;
      }

      // Check if message exists and user is the sender
      const existingMessage = await Message.findById(id);
      if (!existingMessage) {
        res.status(404).json({
          success: false,
          message: 'Message not found'
        });
        return;
      }

      if (existingMessage.sender.id !== user.userId) {
        res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
        return;
      }

      // TODO: Implement Message.delete method
      // For now, return success
      res.json({
        success: true,
        message: 'Message deletion not implemented yet'
      });
    } catch (error) {
      logger.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Search messages in a chat
   */
  static async searchMessages(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { chat_id } = req.params;
      const { q, limit = 20, offset = 0 } = req.query;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!chat_id) {
        res.status(400).json({
          success: false,
          message: 'Chat ID is required'
        });
        return;
      }

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      // Check if user is a member of the chat
      const chat = await Chat.findById(chat_id);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
        return;
      }

      const isMember = chat.members?.some(member => member.id === user.userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          message: 'You are not a member of this chat'
        });
        return;
      }

      // TODO: Implement Message.searchMessages method
      const messages: MessageResponse[] = [];

      res.json({
        success: true,
        message: 'Messages search completed',
        data: messages
      });
    } catch (error) {
      logger.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
} 