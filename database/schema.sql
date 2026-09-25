-- Создание базы данных
CREATE DATABASE IF NOT EXISTS trip_planner;
USE trip_planner;

-- Пользователи
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Путешествия
CREATE TABLE trips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(10, 2) DEFAULT 0,
    status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Участники путешествий (многие-ко-многим)
CREATE TABLE trip_members (
    trip_id INT,
    user_id INT,
    role ENUM('creator', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Точки интереса (места)
CREATE TABLE places (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('attraction', 'restaurant', 'hotel', 'transport', 'other') DEFAULT 'attraction',
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    cost DECIMAL(10, 2) DEFAULT 0,
    suggested_by INT,
    status ENUM('suggested', 'approved', 'rejected', 'visited') DEFAULT 'suggested',
    visit_date DATE,
    visit_time TIME,
    visit_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Голосования за места
CREATE TABLE place_votes (
    place_id INT,
    user_id INT,
    vote ENUM('up', 'down') NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (place_id, user_id),
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Расходы
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    paid_by INT,
    split_type ENUM('equal', 'custom') DEFAULT 'equal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Участники расходов (кто должен платить)
CREATE TABLE expense_participants (
    expense_id INT,
    user_id INT,
    share_amount DECIMAL(10, 2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (expense_id, user_id),
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Сообщения чата
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Приглашения в путешествие
CREATE TABLE invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    token CHAR(64) NOT NULL UNIQUE,
    role ENUM('admin', 'member') DEFAULT 'member',
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    invited_by INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для оптимизации
CREATE INDEX idx_trips_created_by ON trips(created_by);
CREATE INDEX idx_trip_members_user ON trip_members(user_id);
CREATE INDEX idx_places_trip ON places(trip_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_messages_trip ON messages(trip_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_trip ON invitations(trip_id);
