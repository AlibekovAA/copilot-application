CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    name VARCHAR(255) NOT NULL
);
CREATE TABLE conversations (
    conversation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(100) DEFAULT 'Новый диалог',
    business_context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id BIGINT NOT NULL REFERENCES users(user_id)
);
CREATE TABLE messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    file_name TEXT,
    content_type TEXT,
    enriched_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id)
);
