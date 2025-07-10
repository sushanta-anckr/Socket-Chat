import { v4 as uuidv4 } from 'uuid';
import db from '@/database/connection';
import { 
  Chat, 
  ChatCreateDto, 
  ChatResponse, 
  ChatQueryOptions,
  UserResponse 
} from '@/types';

export class ChatModel {
  
  static async create(chatData: ChatCreateDto & { created_by: string }): Promise<ChatResponse> {
    const { name, description, chat_type, avatar_url, created_by } = chatData;
    
    const chatId = uuidv4();
    
    // Use transaction to create chat and add creator as admin
    const result = await db.transaction(async (client) => {
      // Create the chat
      const chatQuery = `
        INSERT INTO chats (id, name, description, chat_type, created_by, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, description, chat_type, created_by, avatar_url, is_active, created_at, updated_at
      `;
      
      const chatValues = [
        chatId,
        name,
        description,
        chat_type,
        created_by,
        avatar_url
      ];
      
      const chatResult = await client.query(chatQuery, chatValues);
      const chat = chatResult.rows[0];
      
      // Add creator as admin member
      const memberQuery = `
        INSERT INTO chat_members (id, chat_id, user_id, role)
        VALUES ($1, $2, $3, $4)
      `;
      
      const memberValues = [
        uuidv4(),
        chatId,
        created_by,
        'admin'
      ];
      
      await client.query(memberQuery, memberValues);
      
      return chat;
    });
    
    return result;
  }
  
  static async findById(id: string): Promise<ChatResponse | null> {
    const query = `
      SELECT id, name, description, chat_type, created_by, avatar_url, is_active, created_at, updated_at
      FROM chats
      WHERE id = $1 AND is_active = true
    `;
    
    return await db.queryOne<ChatResponse>(query, [id]);
  }
  
  static async findByIdWithMembers(id: string): Promise<ChatResponse | null> {
    const chatQuery = `
      SELECT c.id, c.name, c.description, c.chat_type, c.created_by, c.avatar_url, c.is_active, c.created_at, c.updated_at,
             COUNT(cm.id) as member_count
      FROM chats c
      LEFT JOIN chat_members cm ON c.id = cm.chat_id
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id, c.name, c.description, c.chat_type, c.created_by, c.avatar_url, c.is_active, c.created_at, c.updated_at
    `;
    
    const chat = await db.queryOne<ChatResponse & { member_count: string }>(chatQuery, [id]);
    
    if (!chat) {
      return null;
    }
    
    // Get members
    const membersQuery = `
      SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at
      FROM users u
      JOIN chat_members cm ON u.id = cm.user_id
      WHERE cm.chat_id = $1
      ORDER BY cm.role DESC, u.display_name ASC
    `;
    
    const members = await db.query<UserResponse>(membersQuery, [id]);
    
    return {
      ...chat,
      member_count: parseInt(chat.member_count),
      members
    };
  }
  
  static async findPublicChats(options: ChatQueryOptions = {}): Promise<ChatResponse[]> {
    const { 
      limit = 50,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC',
      include_members = false
    } = options;
    
    let query = `
      SELECT c.id, c.name, c.description, c.chat_type, c.created_by, c.avatar_url, c.is_active, c.created_at, c.updated_at
      FROM chats c
      WHERE c.chat_type = 'public' AND c.is_active = true
      ORDER BY ${order_by} ${order_direction}
      LIMIT $1 OFFSET $2
    `;
    
    const chats = await db.query<ChatResponse>(query, [limit, offset]);
    
    if (include_members) {
      for (const chat of chats) {
        const membersQuery = `
          SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at
          FROM users u
          JOIN chat_members cm ON u.id = cm.user_id
          WHERE cm.chat_id = $1
          ORDER BY cm.role DESC, u.display_name ASC
        `;
        
        chat.members = await db.query<UserResponse>(membersQuery, [chat.id]);
        chat.member_count = chat.members.length;
      }
    }
    
    return chats;
  }
  
  static async findUserChats(userId: string, options: ChatQueryOptions = {}): Promise<ChatResponse[]> {
    const { 
      limit = 50,
      offset = 0,
      order_by = 'cm.joined_at',
      order_direction = 'DESC',
      chat_type
    } = options;
    
    const conditions: string[] = ['cm.user_id = $1', 'c.is_active = true'];
    const values: any[] = [userId];
    let paramIndex = 2;
    
    if (chat_type) {
      conditions.push(`c.chat_type = $${paramIndex++}`);
      values.push(chat_type);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const query = `
      SELECT c.id, c.name, c.description, c.chat_type, c.created_by, c.avatar_url, c.is_active, c.created_at, c.updated_at,
             cm.role, cm.joined_at, cm.last_read_at, cm.is_muted
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE ${whereClause}
      ORDER BY ${order_by} ${order_direction}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    
    return await db.query<ChatResponse>(query, values);
  }
  
  static async findPrivateChat(userId1: string, userId2: string): Promise<ChatResponse | null> {
    const query = `
      SELECT c.id, c.name, c.description, c.chat_type, c.created_by, c.avatar_url, c.is_active, c.created_at, c.updated_at
      FROM chats c
      JOIN chat_members cm1 ON c.id = cm1.chat_id
      JOIN chat_members cm2 ON c.id = cm2.chat_id
      WHERE c.chat_type = 'private' 
        AND c.is_active = true
        AND cm1.user_id = $1 
        AND cm2.user_id = $2
        AND cm1.user_id != cm2.user_id
    `;
    
    return await db.queryOne<ChatResponse>(query, [userId1, userId2]);
  }
  
  static async addMember(chatId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member'): Promise<void> {
    const query = `
      INSERT INTO chat_members (id, chat_id, user_id, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (chat_id, user_id) DO NOTHING
    `;
    
    await db.query(query, [uuidv4(), chatId, userId, role]);
  }
  
  static async removeMember(chatId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM chat_members
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    await db.query(query, [chatId, userId]);
  }
  
  static async updateMemberRole(chatId: string, userId: string, role: 'admin' | 'moderator' | 'member'): Promise<void> {
    const query = `
      UPDATE chat_members
      SET role = $3, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    await db.query(query, [chatId, userId, role]);
  }
  
  static async isMember(chatId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM chat_members
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    const result = await db.queryOne(query, [chatId, userId]);
    return result !== null;
  }
  
  static async getMemberRole(chatId: string, userId: string): Promise<string | null> {
    const query = `
      SELECT role FROM chat_members
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    const result = await db.queryOne<{ role: string }>(query, [chatId, userId]);
    return result?.role || null;
  }
  
  static async getMembers(chatId: string): Promise<UserResponse[]> {
    const query = `
      SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_online, u.last_seen, u.created_at,
             cm.role, cm.joined_at, cm.last_read_at, cm.is_muted
      FROM users u
      JOIN chat_members cm ON u.id = cm.user_id
      WHERE cm.chat_id = $1
      ORDER BY cm.role DESC, u.display_name ASC
    `;
    
    return await db.query<UserResponse>(query, [chatId]);
  }
  
  static async updateLastReadAt(chatId: string, userId: string): Promise<void> {
    const query = `
      UPDATE chat_members
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 AND user_id = $2
    `;
    
    await db.query(query, [chatId, userId]);
  }
  
  static async updateChat(chatId: string, updates: Partial<Pick<Chat, 'name' | 'description' | 'avatar_url'>>): Promise<ChatResponse | null> {
    const { name, description, avatar_url } = updates;
    
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      setParts.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      setParts.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    
    if (avatar_url !== undefined) {
      setParts.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }
    
    if (setParts.length === 0) {
      return await this.findById(chatId);
    }
    
    setParts.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(chatId);
    
    const query = `
      UPDATE chats
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, chat_type, created_by, avatar_url, is_active, created_at, updated_at
    `;
    
    return await db.queryOne<ChatResponse>(query, values);
  }
  
  static async deleteChat(chatId: string): Promise<void> {
    const query = `
      UPDATE chats
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await db.query(query, [chatId]);
  }
  
  static async getChatCount(chatType?: 'public' | 'private' | 'room'): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM chats WHERE is_active = true`;
    const values: any[] = [];
    
    if (chatType) {
      query += ` AND chat_type = $1`;
      values.push(chatType);
    }
    
    const result = await db.queryOne<{ count: string }>(query, values);
    return parseInt(result?.count || '0');
  }
} 