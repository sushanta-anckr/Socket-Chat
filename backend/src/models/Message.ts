import { v4 as uuidv4 } from 'uuid';
import db from '@/database/connection';
import { 
  Message, 
  MessageCreateDto, 
  MessageResponse, 
  MessageQueryOptions,
  UserResponse 
} from '@/types';

export class MessageModel {
  
  static async create(messageData: MessageCreateDto & { sender_id: string }): Promise<MessageResponse> {
    const { chat_id, sender_id, content, message_type = 'text', reply_to_id } = messageData;
    
    const messageId = uuidv4();
    
    const query = `
      INSERT INTO messages (id, chat_id, sender_id, content, message_type, reply_to_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, chat_id, sender_id, content, message_type, reply_to_id, is_edited, is_deleted, created_at, updated_at
    `;
    
    const values = [
      messageId,
      chat_id,
      sender_id,
      content,
      message_type,
      reply_to_id || null
    ];
    
    const message = await db.queryOne<Message>(query, values);
    
    if (!message) {
      throw new Error('Failed to create message');
    }
    
    // Get sender information
    const senderQuery = `
      SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at
      FROM users
      WHERE id = $1
    `;
    
    const sender = await db.queryOne<UserResponse>(senderQuery, [sender_id]);
    
    if (!sender) {
      throw new Error('Sender not found');
    }
    
    let reply_to: MessageResponse | null = null;
    
    // Get reply-to message if exists
    if (reply_to_id) {
      reply_to = await this.findById(reply_to_id);
    }
    
    return {
      id: message.id,
      chat_id: message.chat_id,
      sender: sender,
      content: message.content,
      message_type: message.message_type,
      reply_to: reply_to,
      is_edited: message.is_edited,
      is_deleted: message.is_deleted,
      created_at: message.created_at,
      updated_at: message.updated_at
    };
  }
  
  static async findById(id: string): Promise<MessageResponse | null> {
    const query = `
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.message_type, m.reply_to_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
             u.id as sender_id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at as sender_created_at
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1 AND m.is_deleted = false
    `;
    
    const result = await db.queryOne<any>(query, [id]);
    
    if (!result) {
      return null;
    }
    
    // Get reply-to message if exists
    let reply_to: MessageResponse | null = null;
    if (result.reply_to_id) {
      reply_to = await this.findById(result.reply_to_id);
    }
    
    return {
      id: result.id,
      chat_id: result.chat_id,
      sender: {
        id: result.sender_id,
        username: result.username,
        email: result.email,
        display_name: result.display_name,
        avatar_url: result.avatar_url,
        is_online: result.is_online,
        last_seen: result.last_seen,
        created_at: result.sender_created_at
      },
      content: result.content,
      message_type: result.message_type,
      reply_to: reply_to,
      is_edited: result.is_edited,
      is_deleted: result.is_deleted,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  }
  
  static async findByChatId(chatId: string, options: MessageQueryOptions = {}): Promise<MessageResponse[]> {
    const { 
      limit = 50,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC',
      before_date,
      after_date,
      message_type
    } = options;
    
    const conditions: string[] = ['m.chat_id = $1', 'm.is_deleted = false'];
    const values: any[] = [chatId];
    let paramIndex = 2;
    
    if (before_date) {
      conditions.push(`m.created_at < $${paramIndex++}`);
      values.push(before_date);
    }
    
    if (after_date) {
      conditions.push(`m.created_at > $${paramIndex++}`);
      values.push(after_date);
    }
    
    if (message_type) {
      conditions.push(`m.message_type = $${paramIndex++}`);
      values.push(message_type);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const query = `
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.message_type, m.reply_to_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
             u.id as sender_id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at as sender_created_at
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ${whereClause}
      ORDER BY m.${order_by} ${order_direction}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    
    const results = await db.query<any>(query, values);
    
    const messages: MessageResponse[] = [];
    
    for (const result of results) {
      // Get reply-to message if exists
      let reply_to: MessageResponse | null = null;
      if (result.reply_to_id) {
        reply_to = await this.findById(result.reply_to_id);
      }
      
      messages.push({
        id: result.id,
        chat_id: result.chat_id,
        sender: {
          id: result.sender_id,
          username: result.username,
          email: result.email,
          display_name: result.display_name,
          avatar_url: result.avatar_url,
          is_online: result.is_online,
          last_seen: result.last_seen,
          created_at: result.sender_created_at
        },
        content: result.content,
        message_type: result.message_type,
        reply_to: reply_to,
        is_edited: result.is_edited,
        is_deleted: result.is_deleted,
        created_at: result.created_at,
        updated_at: result.updated_at
      });
    }
    
    return messages;
  }
  
  static async findLatestByChat(chatId: string): Promise<MessageResponse | null> {
    const messages = await this.findByChatId(chatId, { 
      limit: 1, 
      offset: 0,
      order_by: 'created_at',
      order_direction: 'DESC'
    });
    
    return messages.length > 0 ? messages[0] || null : null;
  }
  
  static async updateMessage(messageId: string, senderId: string, content: string): Promise<MessageResponse | null> {
    // First check if the message exists and belongs to the sender
    const checkQuery = `
      SELECT sender_id FROM messages 
      WHERE id = $1 AND sender_id = $2 AND is_deleted = false
    `;
    
    const existingMessage = await db.queryOne(checkQuery, [messageId, senderId]);
    
    if (!existingMessage) {
      return null;
    }
    
    const query = `
      UPDATE messages
      SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND sender_id = $3
      RETURNING id, chat_id, sender_id, content, message_type, reply_to_id, is_edited, is_deleted, created_at, updated_at
    `;
    
    const message = await db.queryOne<Message>(query, [content, messageId, senderId]);
    
    if (!message) {
      return null;
    }
    
    // Get updated message with sender info
    return await this.findById(messageId);
  }
  
  static async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    const query = `
      UPDATE messages
      SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND sender_id = $2
      RETURNING id
    `;
    
    const result = await db.queryOne(query, [messageId, senderId]);
    return result !== null;
  }
  
  static async getMessageCount(chatId?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM messages WHERE is_deleted = false`;
    const values: any[] = [];
    
    if (chatId) {
      query += ` AND chat_id = $1`;
      values.push(chatId);
    }
    
    const result = await db.queryOne<{ count: string }>(query, values);
    return parseInt(result?.count || '0');
  }
  
  static async searchMessages(chatId: string, searchTerm: string, options: MessageQueryOptions = {}): Promise<MessageResponse[]> {
    const { 
      limit = 50,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC'
    } = options;
    
    const query = `
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.message_type, m.reply_to_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
             u.id as sender_id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at as sender_created_at
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1 
        AND m.is_deleted = false
        AND LOWER(m.content) LIKE $2
      ORDER BY m.${order_by} ${order_direction}
      LIMIT $3 OFFSET $4
    `;
    
    const values = [chatId, `%${searchTerm.toLowerCase()}%`, limit, offset];
    
    const results = await db.query<any>(query, values);
    
    const messages: MessageResponse[] = [];
    
    for (const result of results) {
      // Get reply-to message if exists
      let reply_to: MessageResponse | null = null;
      if (result.reply_to_id) {
        reply_to = await this.findById(result.reply_to_id);
      }
      
      messages.push({
        id: result.id,
        chat_id: result.chat_id,
        sender: {
          id: result.sender_id,
          username: result.username,
          email: result.email,
          display_name: result.display_name,
          avatar_url: result.avatar_url,
          is_online: result.is_online,
          last_seen: result.last_seen,
          created_at: result.sender_created_at
        },
        content: result.content,
        message_type: result.message_type,
        reply_to: reply_to,
        is_edited: result.is_edited,
        is_deleted: result.is_deleted,
        created_at: result.created_at,
        updated_at: result.updated_at
      });
    }
    
    return messages;
  }
  
  static async getUnreadMessageCount(chatId: string, userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM messages m
      JOIN chat_members cm ON m.chat_id = cm.chat_id
      WHERE m.chat_id = $1 
        AND cm.user_id = $2
        AND m.is_deleted = false
        AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamp)
    `;
    
    const result = await db.queryOne<{ count: string }>(query, [chatId, userId]);
    return parseInt(result?.count || '0');
  }
  
  static async markAsRead(chatId: string, userId: string): Promise<void> {
    const query = `
      UPDATE chat_members
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    await db.query(query, [chatId, userId]);
  }
  
  static async getMessagesByDateRange(chatId: string, startDate: Date, endDate: Date): Promise<MessageResponse[]> {
    return await this.findByChatId(chatId, {
      after_date: startDate,
      before_date: endDate,
      order_by: 'created_at',
      order_direction: 'ASC'
    });
  }
  
  static async getMessageStats(chatId: string): Promise<{
    total_messages: number;
    text_messages: number;
    image_messages: number;
    file_messages: number;
    system_messages: number;
    edited_messages: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
        COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
        COUNT(CASE WHEN message_type = 'file' THEN 1 END) as file_messages,
        COUNT(CASE WHEN message_type = 'system' THEN 1 END) as system_messages,
        COUNT(CASE WHEN is_edited = true THEN 1 END) as edited_messages
      FROM messages
      WHERE chat_id = $1 AND is_deleted = false
    `;
    
    const result = await db.queryOne<{
      total_messages: string;
      text_messages: string;
      image_messages: string;
      file_messages: string;
      system_messages: string;
      edited_messages: string;
    }>(query, [chatId]);
    
    return {
      total_messages: parseInt(result?.total_messages || '0'),
      text_messages: parseInt(result?.text_messages || '0'),
      image_messages: parseInt(result?.image_messages || '0'),
      file_messages: parseInt(result?.file_messages || '0'),
      system_messages: parseInt(result?.system_messages || '0'),
      edited_messages: parseInt(result?.edited_messages || '0')
    };
  }
} 