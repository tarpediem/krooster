-- Restaurant Scheduler - SQL Schema
-- Hua Hin & Sathorn

-- Database for n8n
CREATE DATABASE n8n;

-- ============================================
-- MAIN TABLES
-- ============================================

-- Restaurants
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    address TEXT,
    opening_hours TIME DEFAULT '10:00',
    closing_hours TIME DEFAULT '23:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    restaurant_id INTEGER REFERENCES restaurants(id),
    is_mobile BOOLEAN DEFAULT FALSE,
    positions TEXT[],
    active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly availabilities
CREATE TABLE availabilities (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(employee_id, day_of_week)
);

-- Shifts (daily schedules)
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_duration INTEGER DEFAULT 30,
    position VARCHAR(50),
    is_mission BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shift_max_9h CHECK (end_time - start_time <= INTERVAL '9 hours')
);

-- Indexes for frequent queries
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_restaurant ON shifts(restaurant_id);

-- Inter-site missions
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    origin_restaurant_id INTEGER REFERENCES restaurants(id),
    destination_restaurant_id INTEGER REFERENCES restaurants(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'proposed',
    accommodation_planned BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Absences and leave
CREATE TABLE absences (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    type VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'requested',
    comment TEXT,
    approved_by VARCHAR(100),
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave balance
CREATE TABLE leave_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    year INTEGER NOT NULL,
    days_accrued DECIMAL(4,1) DEFAULT 0,
    days_taken DECIMAL(4,1) DEFAULT 0,
    UNIQUE(employee_id, year)
);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Weekly schedule view
CREATE VIEW v_weekly_schedule AS
SELECT
    s.date,
    r.name AS restaurant,
    e.last_name AS employee,
    e.first_name AS employee_first_name,
    e.is_mobile,
    s.start_time,
    s.end_time,
    s.position,
    s.is_mission,
    s.status
FROM shifts s
JOIN employees e ON s.employee_id = e.id
JOIN restaurants r ON s.restaurant_id = r.id
WHERE s.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY s.date, r.name, s.start_time;

-- Available employees view (not on leave)
CREATE VIEW v_available_employees AS
SELECT
    e.*,
    r.name AS restaurant_name
FROM employees e
JOIN restaurants r ON e.restaurant_id = r.id
WHERE e.active = TRUE
AND e.id NOT IN (
    SELECT employee_id FROM absences
    WHERE status = 'approved'
    AND CURRENT_DATE BETWEEN start_date AND end_date
);

-- Understaffing alert view
CREATE VIEW v_understaffing_alert AS
SELECT
    s.date,
    r.name AS restaurant,
    COUNT(DISTINCT s.employee_id) AS employee_count
FROM shifts s
JOIN restaurants r ON s.restaurant_id = r.id
WHERE s.status != 'cancelled'
GROUP BY s.date, r.id, r.name
HAVING COUNT(DISTINCT s.employee_id) < 3;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Restaurants
INSERT INTO restaurants (name, location, address) VALUES
    ('Hua Hin', 'Beachfront - Hua Hin', 'Hua Hin Beach Road'),
    ('Sathorn', 'Bangkok - Sathorn', 'Sathorn Road, Bangkok');

-- Test employees
INSERT INTO employees (last_name, first_name, phone, restaurant_id, is_mobile, positions, hire_date) VALUES
    -- Hua Hin team
    ('Somchai', 'Prasert', '081-234-5678', 1, FALSE, ARRAY['kitchen', 'dishwashing'], '2023-01-15'),
    ('Narin', 'Kaewkla', '082-345-6789', 1, FALSE, ARRAY['service', 'cashier'], '2023-03-01'),
    ('Pranee', 'Srisuk', '083-456-7890', 1, FALSE, ARRAY['kitchen', 'bar'], '2022-06-01'),

    -- Sathorn team
    ('Wichai', 'Thongdee', '084-567-8901', 2, FALSE, ARRAY['kitchen'], '2022-09-01'),
    ('Suda', 'Boonmee', '085-678-9012', 2, FALSE, ARRAY['service', 'cashier'], '2023-02-15'),
    ('Apinya', 'Rattana', '086-789-0123', 2, FALSE, ARRAY['service', 'bar'], '2023-04-01'),

    -- Mobile employees
    ('Thanawat', 'Chaiporn', '087-890-1234', 1, TRUE, ARRAY['kitchen', 'service'], '2022-01-10'),
    ('Kannika', 'Worawit', '088-901-2345', 2, TRUE, ARRAY['service', 'bar', 'cashier'], '2022-05-20'),
    ('Pongpat', 'Siriwat', '089-012-3456', 1, TRUE, ARRAY['kitchen', 'dishwashing'], '2023-01-01'),
    ('Malai', 'Tongjai', '080-123-4567', 2, TRUE, ARRAY['service', 'kitchen'], '2023-06-01');

-- Leave balance 2025
INSERT INTO leave_balance (employee_id, year, days_accrued, days_taken)
SELECT id, 2025, 12, 0 FROM employees;

-- ============================================
-- USEFUL FUNCTIONS
-- ============================================

-- Function to check shift conflicts
CREATE OR REPLACE FUNCTION check_shift_conflict(
    p_employee_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_shift_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shifts
        WHERE employee_id = p_employee_id
        AND date = p_date
        AND (p_shift_id IS NULL OR id != p_shift_id)
        AND status != 'cancelled'
        AND (
            (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if employee is on leave
CREATE OR REPLACE FUNCTION is_employee_on_leave(
    p_employee_id INTEGER,
    p_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM absences
        WHERE employee_id = p_employee_id
        AND status = 'approved'
        AND p_date BETWEEN start_date AND end_date
    );
END;
$$ LANGUAGE plpgsql;
