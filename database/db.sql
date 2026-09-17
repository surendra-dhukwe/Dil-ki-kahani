-- -- ================= DATABASE =================
-- CREATE DATABASE IF NOT EXISTS social_app;
-- USE social_app;
-- -- ================= USERS =================
-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100) UNIQUE
-- );
-- ALTER TABLE users ADD password VARCHAR(255);

-- select * from users;
-- -- ================= POSTS =================
-- CREATE TABLE posts (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_name VARCHAR(100),

--   title VARCHAR(255),
--   description TEXT,

--   content TEXT,      -- English
--   hindi TEXT,        -- Hindi
--   hinglish TEXT,     -- Hinglish

--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ================= COMMENTS =================
-- CREATE TABLE comments (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   post_id INT,
--   user VARCHAR(100),
--   comment TEXT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );