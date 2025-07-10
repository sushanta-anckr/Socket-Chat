import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload, ApiResponse } from '@/types';
import { UserModel } from '@/models/User';
import { logger } from '@/utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      } as ApiResponse);
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      } as ApiResponse);
      return;
    }
    
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      res.status(500).json({
        success: false,
        message: 'Server configuration error',
        error: 'INVALID_CONFIG'
      } as ApiResponse);
      return;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    
    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      } as ApiResponse);
      return;
    }
    
    req.user = decoded;
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      } as ApiResponse);
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      } as ApiResponse);
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    } as ApiResponse);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      next();
      return;
    }
    
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      next();
      return;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    
    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (user) {
      req.user = decoded;
    }
    
    next();
    
  } catch (error) {
    // Token validation failed, continue without authentication
    logger.debug('Optional auth failed:', error);
    next();
  }
};

export const requireRole = (_roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      } as ApiResponse);
      return;
    }
    
    // For now, we don't have role-based access control in the user model
    // This is a placeholder for future implementation
    next();
  };
};

export const generateToken = (user: { id: string; username: string; email: string }): string => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }
  
  const expiresIn = process.env['JWT_EXPIRES_IN'] || '7d';
  
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    email: user.email
  };
  
  return jwt.sign(payload, jwtSecret, { expiresIn } as any);
};

export const generateRefreshToken = (user: { id: string; username: string; email: string }): string => {
  const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];
  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable not set');
  }
  
  const expiresIn = process.env['JWT_REFRESH_EXPIRES_IN'] || '30d';
  
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    email: user.email
  };
  
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn } as any);
};

export const verifyRefreshToken = (token: string): AuthTokenPayload | null => {
  try {
    const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];
    if (!jwtRefreshSecret) {
      return null;
    }
    
    return jwt.verify(token, jwtRefreshSecret) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
};

export const extractUserIdFromToken = (token: string): string | null => {
  try {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      return null;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}; 