-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: Store user information and authentication data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_username_length CHECK (length(username) >= 3),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Chats table: Store different types of chats (public, private, room)
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    description TEXT,
    chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('public', 'private', 'room')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chats_name_required_for_room CHECK (
        (chat_type = 'room' AND name IS NOT NULL) OR 
        (chat_type IN ('public', 'private'))
    )
);

-- Chat members table: Handle chat membership and roles
CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    
    -- Prevent duplicate memberships
    UNIQUE(chat_id, user_id)
);

-- Messages table: Store all chat messages with proper tracking
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Friendships table: Manage user friendships for private chat discovery
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent self-friendship and duplicate requests
    CONSTRAINT friendships_no_self_friend CHECK (requester_id != addressee_id),
    UNIQUE(requester_id, addressee_id)
);

-- Room invites table: Handle controlled room access
CREATE TABLE room_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate invites
    UNIQUE(room_id, invitee_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- User sessions table: JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_users_last_seen ON users(last_seen);

CREATE INDEX idx_chats_type ON chats(chat_type);
CREATE INDEX idx_chats_created_by ON chats(created_by);
CREATE INDEX idx_chats_is_active ON chats(is_active);

CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_role ON chat_members(role);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

CREATE INDEX idx_room_invites_room_id ON room_invites(room_id);
CREATE INDEX idx_room_invites_invitee_id ON room_invites(invitee_id);
CREATE INDEX idx_room_invites_status ON room_invites(status);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create composite indexes for common queries
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX idx_chat_members_user_chat ON chat_members(user_id, chat_id);
CREATE INDEX idx_friendships_users ON friendships(requester_id, addressee_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_invites_updated_at BEFORE UPDATE ON room_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent duplicate private chats
CREATE OR REPLACE FUNCTION prevent_duplicate_private_chats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.chat_type = 'private' THEN
        -- Check if a private chat already exists between the same users
        IF EXISTS (
            SELECT 1 FROM chats c
            JOIN chat_members cm1 ON c.id = cm1.chat_id
            JOIN chat_members cm2 ON c.id = cm2.chat_id
            WHERE c.chat_type = 'private'
            AND c.id != NEW.id
            AND cm1.user_id = (SELECT user_id FROM chat_members WHERE chat_id = NEW.id LIMIT 1)
            AND cm2.user_id = (SELECT user_id FROM chat_members WHERE chat_id = NEW.id LIMIT 1 OFFSET 1)
        ) THEN
            RAISE EXCEPTION 'Private chat already exists between these users';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to prevent duplicate private chats
CREATE TRIGGER prevent_duplicate_private_chats_trigger
    AFTER INSERT ON chats
    FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_private_chats(); 