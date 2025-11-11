-- Таблица сессий (вместо полноценных пользователей)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    hashed_password TEXT  NOT NULL,
    "name" VARCHAR(255)  NOT NULL,
);



CREATE TABLE conversations (
    conversation_id SERIAL PRIMARY KEY,
    title VARCHAR(100) DEFAULT 'Новый диалог',
    business_context TEXT,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(user_id)
);


CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    file_url VARCHAR(1024), 
    enriched_prompt TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    conversation_id INT  NOT NULL REFERENCES conversations(conversation_id)
);

