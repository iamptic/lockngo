PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS station_health;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS tariffs;
DROP TABLE IF EXISTS cells;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user', -- user, admin, support
    name TEXT,
    email TEXT,
    ltv REAL DEFAULT 0,
    last_booking DATETIME,
    is_blocked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    screen_content TEXT DEFAULT 'Welcome to LocknGo', -- Text or Image URL
    screen_mode TEXT DEFAULT 'image', -- text, image, video
    api_key TEXT
);

CREATE TABLE cells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    cell_number TEXT,
    size TEXT, -- S, M, L
    status TEXT DEFAULT 'free', -- free, booked, maintenance
    door_open INTEGER DEFAULT 0,
    FOREIGN KEY(station_id) REFERENCES stations(id)
);

CREATE TABLE tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    size TEXT,
    description TEXT,
    price_initial REAL,
    duration_minutes INTEGER
);

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

CREATE TABLE promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    discount_percent INTEGER,
    is_active INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE station_health (
    station_id INTEGER PRIMARY KEY,
    battery_level INTEGER,
    wifi_signal INTEGER,
    last_heartbeat DATETIME,
    error_msg TEXT
);

CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Users with Roles
INSERT INTO users (phone, role, name, ltv) VALUES ('+79990000001', 'admin', 'Danila Admin', 0);
INSERT INTO users (phone, role, name, ltv) VALUES ('+79990000002', 'support', 'Tech Support 1', 0);


-- Seed Data
INSERT INTO stations (name, address, lat, lng) VALUES ('ТЦ Галерея', 'Лиговский пр., 30А', 59.9275, 30.3600);
INSERT INTO stations (name, address, lat, lng) VALUES ('Аэропорт Пулково', 'Пулковское ш., 41', 59.8003, 30.2625);

-- STATION 1 CELLS (32 cells total)
-- Row 1 (Small)
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A01', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A02', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A03', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A04', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A05', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A06', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A07', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'A08', 'S');
-- Row 2 (Small)
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B01', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B02', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B03', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B04', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B05', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B06', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B07', 'S');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'B08', 'S');
-- Row 3 (Medium)
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C01', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C02', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C03', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C04', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C05', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C06', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C07', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'C08', 'M');
-- Row 4 (Large)
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D01', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D02', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D03', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D04', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D05', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D06', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D07', 'L');
INSERT INTO cells (station_id, cell_number, size) VALUES (1, 'D08', 'L');

-- STATION 2 CELLS (Minimal)
INSERT INTO cells (station_id, cell_number, size) VALUES (2, 'A01', 'M');
INSERT INTO cells (station_id, cell_number, size) VALUES (2, 'A02', 'L');

INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'S', 'Маленькая (сумка)', 100);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'M', 'Средняя (чемодан)', 200);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (1, 'L', 'Большая (лыжи)', 300);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (2, 'M', 'Standard', 250);
INSERT INTO tariffs (station_id, size, description, price_initial) VALUES (2, 'L', 'Large', 450);

INSERT INTO promo_codes (code, discount_percent) VALUES ('WELCOME', 50);