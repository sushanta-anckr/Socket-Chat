const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  createUser, 
  authenticateUser, 
  getUserById,
  saveUserSession,
  validateUserSession,
  invalidateUserSession,
  updateUserOnlineStatus
} = require('../../config/database');
const { generateToken, hashToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters')
];

const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { username, email, password, displayName } = req.body;

    // Create user
    const user = await createUser(username, email, password, displayName);
    
    // Generate JWT token
    const token = generateToken(user);
    const tokenHash = hashToken(token);
    
    // Save session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    await saveUserSession(user.id, tokenHash, deviceInfo, expiresAt);

    // Update user online status
    await updateUserOnlineStatus(user.id, true);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      const field = error.constraint.includes('username') ? 'username' : 'email';
      return res.status(409).json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Authenticate user
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);
    const tokenHash = hashToken(token);
    
    // Save session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    await saveUserSession(user.id, tokenHash, deviceInfo, expiresAt);

    // Update user online status
    await updateUserOnlineStatus(user.id, true);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const tokenHash = hashToken(token);
      await invalidateUserSession(req.user.id, tokenHash);
    }

    // Update user online status
    await updateUserOnlineStatus(req.user.id, false);

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token and get user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isOnline: user.is_online,
        lastSeen: user.last_seen
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new token
    const newToken = generateToken(user);
    const newTokenHash = hashToken(newToken);
    
    // Invalidate old token
    const authHeader = req.headers['authorization'];
    const oldToken = authHeader && authHeader.split(' ')[1];
    if (oldToken) {
      const oldTokenHash = hashToken(oldToken);
      await invalidateUserSession(user.id, oldTokenHash);
    }

    // Save new session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    await saveUserSession(user.id, newTokenHash, deviceInfo, expiresAt);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 