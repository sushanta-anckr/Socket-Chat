import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '@/database/connection';
import { 
  User, 
  UserCreateDto, 
  UserResponse, 
  UserQueryOptions 
} from '@/types';

export class UserModel {
  
  static async create(userData: UserCreateDto): Promise<UserResponse> {
    const { username, email, password, display_name } = userData;
    
    // Hash the password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (id, username, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, display_name, avatar_url, is_online, last_seen, created_at
    `;
    
    const values = [
      uuidv4(),
      username,
      email,
      password_hash,
      display_name || username
    ];
    
    const user = await db.queryOne<UserResponse>(query, values);
    
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    return user;
  }
  
  static async findById(id: string): Promise<UserResponse | null> {
    const query = `
      SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at
      FROM users
      WHERE id = $1
    `;
    
    return await db.queryOne<UserResponse>(query, [id]);
  }
  
  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, display_name, avatar_url, is_online, last_seen, created_at, updated_at
      FROM users
      WHERE username = $1
    `;
    
    return await db.queryOne<User>(query, [username]);
  }
  
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, display_name, avatar_url, is_online, last_seen, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    return await db.queryOne<User>(query, [email]);
  }
  
  static async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, display_name, avatar_url, is_online, last_seen, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $1
    `;
    
    return await db.queryOne<User>(query, [identifier]);
  }
  
  static async authenticate(username: string, password: string): Promise<UserResponse | null> {
    const user = await this.findByUsernameOrEmail(username);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Update last seen
    await this.updateLastSeen(user.id);
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_online: user.is_online,
      last_seen: user.last_seen,
      created_at: user.created_at
    };
  }
  
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const query = `
      UPDATE users
      SET is_online = $2, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await db.query(query, [userId, isOnline]);
  }
  
  static async updateLastSeen(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await db.query(query, [userId]);
  }
  
  static async updateProfile(
    userId: string, 
    updates: Partial<Pick<User, 'display_name' | 'avatar_url'>>
  ): Promise<UserResponse | null> {
    const { display_name, avatar_url } = updates;
    
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (display_name !== undefined) {
      setParts.push(`display_name = $${paramIndex++}`);
      values.push(display_name);
    }
    
    if (avatar_url !== undefined) {
      setParts.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }
    
    if (setParts.length === 0) {
      return await this.findById(userId);
    }
    
    setParts.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const query = `
      UPDATE users
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, display_name, avatar_url, is_online, last_seen, created_at
    `;
    
    return await db.queryOne<UserResponse>(query, values);
  }
  
  static async search(options: UserQueryOptions): Promise<UserResponse[]> {
    const { 
      search, 
      is_online, 
      exclude_user_id,
      limit = 20,
      offset = 0,
      order_by = 'display_name',
      order_direction = 'ASC'
    } = options;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(
        LOWER(username) LIKE $${paramIndex} OR 
        LOWER(email) LIKE $${paramIndex} OR 
        LOWER(display_name) LIKE $${paramIndex}
      )`);
      values.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }
    
    if (is_online !== undefined) {
      conditions.push(`is_online = $${paramIndex++}`);
      values.push(is_online);
    }
    
    if (exclude_user_id) {
      conditions.push(`id != $${paramIndex++}`);
      values.push(exclude_user_id);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at
      FROM users
      ${whereClause}
      ORDER BY 
        CASE WHEN is_online THEN 0 ELSE 1 END,
        ${order_by} ${order_direction}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    
    return await db.query<UserResponse>(query, values);
  }
  
  static async getOnlineUsers(): Promise<UserResponse[]> {
    const query = `
      SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at
      FROM users
      WHERE is_online = true
      ORDER BY last_seen DESC
    `;
    
    return await db.query<UserResponse>(query);
  }
  
  static async getUserCount(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM users`;
    const result = await db.queryOne<{ count: string }>(query);
    return parseInt(result?.count || '0');
  }
  
  static async checkUsernameExists(username: string): Promise<boolean> {
    const query = `SELECT 1 FROM users WHERE username = $1`;
    const result = await db.queryOne(query, [username]);
    return result !== null;
  }
  
  static async checkEmailExists(email: string): Promise<boolean> {
    const query = `SELECT 1 FROM users WHERE email = $1`;
    const result = await db.queryOne(query, [email]);
    return result !== null;
  }
  
  static async deleteUser(userId: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await db.query(query, [userId]);
    return result.length > 0;
  }
} 