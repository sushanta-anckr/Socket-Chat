-- Seed data for chat application
-- This file contains sample data for testing and development

-- Clear existing data (be careful in production!)
TRUNCATE TABLE messages, room_invites, chat_members, friendships, user_sessions, chats, users RESTART IDENTITY CASCADE;

-- Insert sample users
INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, is_online) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'john_doe',
    'john@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvyGL6KdEwDTfXu', -- password: 'password123'
    'John Doe',
    'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'jane_smith',
    'jane@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvyGL6KdEwDTfXu', -- password: 'password123'
    'Jane Smith',
    'https://ui-avatars.com/api/?name=Jane+Smith&background=FF6B6B&color=fff',
    true
);

-- Insert chats
INSERT INTO chats (id, name, description, chat_type, created_by, avatar_url) VALUES
-- Public/General chat
(
    '660e8400-e29b-41d4-a716-446655440001',
    'General',
    'Public chat for everyone',
    'public',
    '550e8400-e29b-41d4-a716-446655440001',
    'https://ui-avatars.com/api/?name=General&background=4ECDC4&color=fff'
),
-- Private chat between John and Jane
(
    '660e8400-e29b-41d4-a716-446655440002',
    NULL,
    NULL,
    'private',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL
),
-- Room chat created by John
(
    '660e8400-e29b-41d4-a716-446655440003',
    'Project Team',
    'Discussion about our awesome project',
    'room',
    '550e8400-e29b-41d4-a716-446655440001',
    'https://ui-avatars.com/api/?name=Project+Team&background=95A5A6&color=fff'
);

-- Insert chat members
INSERT INTO chat_members (chat_id, user_id, role, joined_at, last_read_at) VALUES
-- Public chat - both users are members
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'member',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
-- Private chat - John and Jane
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'member',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'member',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes'
),
-- Room chat - both users
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes'
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'member',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes'
);

-- Insert sample messages
INSERT INTO messages (id, chat_id, sender_id, content, message_type, created_at) VALUES
-- Public chat messages
(
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Welcome to the general chat! 👋',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Hello everyone! Great to be here.',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '23 hours'
),
(
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'How is everyone doing today?',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),

-- Private chat messages
(
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Hey Jane! How are you?',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    '770e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Hi John! I''m doing great, thanks for asking!',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '5 minutes'
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'That''s awesome! Want to grab coffee sometime?',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    '770e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Sure! I''d love that. Let''s plan for this weekend.',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),

-- Room chat messages
(
    '770e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Welcome to the Project Team room! 🚀',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
),
(
    '770e8400-e29b-41d4-a716-446655440009',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'Thanks for creating this room, John!',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '10 minutes'
),
(
    '770e8400-e29b-41d4-a716-446655440010',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Let''s discuss our project milestones here.',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    '770e8400-e29b-41d4-a716-446655440011',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'Great idea! I''ve been working on the frontend components.',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    '770e8400-e29b-41d4-a716-446655440012',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Perfect! I''m focusing on the backend API endpoints.',
    'text',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- Insert friendship between John and Jane
INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES
(
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'accepted',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- Insert sample user sessions (active sessions)
INSERT INTO user_sessions (id, user_id, token_hash, device_info, ip_address, expires_at) VALUES
(
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'hashed_token_john_123',
    'Chrome 118.0.0.0 on Windows 10',
    '192.168.1.100',
    CURRENT_TIMESTAMP + INTERVAL '7 days'
),
(
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'hashed_token_jane_456',
    'Safari 17.0 on macOS 14.0',
    '192.168.1.101',
    CURRENT_TIMESTAMP + INTERVAL '7 days'
);

-- Verify the data
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Chats', COUNT(*) FROM chats
UNION ALL
SELECT 'Chat Members', COUNT(*) FROM chat_members
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Friendships', COUNT(*) FROM friendships
UNION ALL
SELECT 'User Sessions', COUNT(*) FROM user_sessions;

-- Show sample data
SELECT 'Sample Users:' as info;
SELECT username, email, display_name, is_online FROM users;

SELECT 'Sample Chats:' as info;
SELECT name, chat_type, description FROM chats;

SELECT 'Sample Messages:' as info;
SELECT 
    c.name as chat_name,
    c.chat_type,
    u.display_name as sender,
    m.content,
    m.created_at
FROM messages m
JOIN chats c ON m.chat_id = c.id
JOIN users u ON m.sender_id = u.id
ORDER BY m.created_at; 