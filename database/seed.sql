USE trip_planner;

-- Тестовый пользователь (пароль: password123)
INSERT INTO users (email, password_hash, name) VALUES
('test@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye3sY8Z7c6CHz5.6dCJzlv/IbU7gFUpGm', 'Иван Иванов'),
('alex@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye3sY8Z7c6CHz5.6dCJzlv/IbU7gFUpGm', 'Алексей Петров');

-- Тестовое путешествие
INSERT INTO trips (name, description, destination, start_date, end_date, total_budget, created_by) VALUES
('Отпуск в Барселоне', 'Поездка с друзьями на 5 дней', 'Барселона, Испания', '2024-06-15', '2024-06-20', 150000, 1);

-- Участники путешествия
INSERT INTO trip_members (trip_id, user_id, role) VALUES
(1, 1, 'creator'),
(1, 2, 'member');

-- Тестовые места
INSERT INTO places (trip_id, name, description, category, suggested_by, status) VALUES
(1, 'Саграда Фамилия', 'Знаменитый собор Гауди', 'attraction', 1, 'approved'),
(1, 'Парк Гуэль', 'Ещё одно творение Гауди', 'attraction', 2, 'suggested'),
(1, 'Ресторан Tickets', 'Ресторан молекулярной кухни', 'restaurant', 1, 'approved');

-- Тестовые голосования
INSERT INTO place_votes (place_id, user_id, vote) VALUES
(1, 1, 'up'),
(1, 2, 'up'),
(2, 1, 'up'),
(2, 2, 'down'),
(3, 1, 'up');

-- Тестовые расходы
INSERT INTO expenses (trip_id, name, amount, category, paid_by) VALUES
(1, 'Авиабилеты', 40000, 'transport', 1),
(1, 'Отель', 60000, 'accommodation', 2),
(1, 'Ужин в ресторане', 15000, 'food', 1);

INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
(1, 1, 20000),
(1, 2, 20000),
(2, 1, 30000),
(2, 2, 30000),
(3, 1, 7500),
(3, 2, 7500);

-- Тестовые сообщения
INSERT INTO messages (trip_id, user_id, content) VALUES
(1, 1, 'Привет всем! Давайте планировать нашу поездку!'),
(1, 2, 'Отлично! Я уже добавил несколько мест!'),
(1, 1, 'Предлагаю лететь 15 июня');