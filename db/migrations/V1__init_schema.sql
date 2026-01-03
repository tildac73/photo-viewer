CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    file_path TEXT NOT NULL,
    upload_time TIMESTAMP DEFAULT now(),
    tags TEXT,
    alt_text TEXT
);