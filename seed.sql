DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user', -- user, admin, ics
    name TEXT,
    email TEXT,
    ltv REAL DEFAULT 0,
    last_booking DATETIME,
    is_blocked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS stations;
CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    api_key TEXT
);

DROP TABLE IF EXISTS cells;
CREATE TABLE cells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    cell_number TEXT,
    size TEXT, -- S, M, L
    status TEXT DEFAULT 'free', -- free, booked, maintenance
    door_open INTEGER DEFAULT 0,
    FOREIGN KEY(station_id) REFERENCES stations(id)
);

DROP TABLE IF EXISTS tariffs;
CREATE TABLE tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    size TEXT,
    description TEXT,
    price_initial REAL,
    duration_minutes INTEGER
);

DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    cell_id INTEGER,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    status TEXT, -- active, completed, cancelled
    total_amount REAL,
    access_code TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(cell_id) REFERENCES cells(id)
);

DROP TABLE IF EXISTS promo_codes;
CREATE TABLE promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    discount_percent INTEGER,
    is_active INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS station_health;
CREATE TABLE station_health (
    station_id INTEGER PRIMARY KEY,
    battery_level INTEGER,
    wifi_signal INTEGER,
    last_heartbeat DATETIME,
    error_msg TEXT
);

DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data
INSERT INTO stations (name, address, lat, lng) VALUES ('ТЦ Галерея', 'Лиговский пр., 30А', 59.9275, 30.3600);
INSERT INTO stations (name, address, lat, lng) VALUES ('Аэропорт Пулково', 'Пулковское ш., 41', 59.8003, 30.2625);

INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A01', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A02', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B01', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C01', 'L');

INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'S', 'Маленькая (сумка)', 100);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'M', 'Средняя (чемодан)', 200);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'L', 'Большая (лыжи)', 300);

INSERT INTO promo_codes (code, discount_percent) VALUES ('WELCOME', 50);
