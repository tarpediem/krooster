# Employee Scheduler - Hua Hin & Sathorn Restaurants

## Project Overview

Scheduling management system for two restaurants located 200km apart:
- **Hua Hin**: Beachfront restaurant
- **Sathorn**: Restaurant in Bangkok

Two separate teams with 3-4 "mobile" employees who can perform inter-site missions (accommodation provided).

## Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| Database | PostgreSQL | Data storage |
| Backend/Logic | n8n | Workflows and automation |
| Local AI | Ollama (Mistral 7B) | Intelligent scheduling assistant |
| Interface | NocoDB or Baserow | Self-hosted UI |
| Notifications | Telegram Bot | Alerts via n8n |

## Architecture

```
+-------------------------------------------------------------+
|                         SCHEDULER                            |
+-----------------------------+-------------------------------+
|     HUA HIN RESTAURANT      |      SATHORN RESTAURANT       |
|     Local team              |      Local team               |
+-----------------------------+-------------------------------+
|              MOBILE EMPLOYEES (3-4)                          |
|         Can be assigned to both sites                        |
+-------------------------------------------------------------+
|  SHIFTS    |  MISSIONS    |  LEAVE/ABSENCES                 |
+-------------------------------------------------------------+
|                   AI ASSISTANT (Ollama)                      |
|    Suggestions, problem detection, optimization              |
+-------------------------------------------------------------+
```

## Data Model

### Main Tables

#### restaurants
```sql
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    address TEXT,
    opening_hours TIME DEFAULT '10:00',
    closing_hours TIME DEFAULT '23:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial data
INSERT INTO restaurants (name, location) VALUES
    ('Hua Hin', 'Beachfront - Hua Hin'),
    ('Sathorn', 'Bangkok - Sathorn');
```

#### employees
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    restaurant_id INTEGER REFERENCES restaurants(id),
    is_mobile BOOLEAN DEFAULT FALSE,
    positions TEXT[], -- ARRAY: kitchen, service, bar, dishwashing, cashier
    active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### availabilities
```sql
CREATE TABLE availabilities (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(employee_id, day_of_week)
);
```

#### shifts
```sql
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_duration INTEGER DEFAULT 30, -- in minutes
    position VARCHAR(50),
    is_mission BOOLEAN DEFAULT FALSE, -- true if inter-site assignment
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shift_max_9h CHECK (end_time - start_time <= INTERVAL '9 hours')
);

-- Indexes for frequent queries
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_restaurant ON shifts(restaurant_id);
```

#### missions
```sql
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    origin_restaurant_id INTEGER REFERENCES restaurants(id),
    destination_restaurant_id INTEGER REFERENCES restaurants(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'proposed', -- proposed, accepted, refused, completed
    accommodation_planned BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### absences
```sql
CREATE TABLE absences (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    type VARCHAR(30) NOT NULL, -- paid_leave, unpaid_leave, sick, training
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'requested', -- requested, approved, refused
    comment TEXT,
    approved_by VARCHAR(100),
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### leave_balance
```sql
CREATE TABLE leave_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    year INTEGER NOT NULL,
    days_accrued DECIMAL(4,1) DEFAULT 0,
    days_taken DECIMAL(4,1) DEFAULT 0,
    UNIQUE(employee_id, year)
);
```

### Useful Views

```sql
-- Weekly schedule view
CREATE VIEW v_weekly_schedule AS
SELECT
    s.date,
    r.name AS restaurant,
    e.last_name AS employee,
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
HAVING COUNT(DISTINCT s.employee_id) < 3; -- configurable threshold
```

## Ollama Configuration

### Installation
```bash
# On a Proxmox VM/LXC (16GB RAM recommended, 8GB minimum)
curl -fsSL https://ollama.com/install.sh | sh

# Download the model
ollama pull mistral

# Or alternatives
ollama pull llama3:8b
ollama pull gemma2:9b
```

### System Prompt for Scheduling Agent
```
You are the scheduling assistant for two restaurants owned by the same proprietor:

RESTAURANTS:
- Hua Hin: beachfront, dedicated local team
- Sathorn: Bangkok, dedicated local team
- Distance: 200km (3h drive)

MOBILE EMPLOYEES:
3-4 employees can perform missions at the other site.
They are accommodated on-site during their missions.

YOUR CAPABILITIES:
1. Analyze availabilities and leave
2. Detect conflicts:
   - Same person scheduled at 2 locations
   - Shift during approved leave
   - Understaffing (< 3 people)
3. Suggest balanced schedules
4. Propose reinforcements via mobile employees

BUSINESS RULES:
- Maximum shift: 8h/day
- Mandatory break: 30min minimum for shifts > 5h
- Rest between shifts: 11h minimum
- Weekends: fair distribution over the month
- Missions: max 2 per month per mobile employee (except emergencies)
- Minimum mission: 2 consecutive days

RESPONSE FORMAT:
- Be concise and direct
- Use lists for schedules
- Flag alerts as priority
- Propose solutions, not just problems

LANGUAGE: English
```

### Ollama API Call
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "mistral",
  "messages": [
    {"role": "system", "content": "<system prompt above>"},
    {"role": "user", "content": "Here is the current data: <JSON>. Question: ..."}
  ],
  "stream": false
}'
```

## n8n Workflows

### 1. Employee CRUD
- Trigger: Webhook
- Actions: INSERT/UPDATE/DELETE on employees table
- Validation: verify restaurant_id exists

### 2. Shift Management
- Trigger: Webhook or Schedule
- Before creation: check no conflict (leave, other shift)
- After creation: notify employee via Telegram

### 3. Leave Request
- Trigger: Webhook (employee form)
- Actions:
  1. Check available balance
  2. Create absences entry (status: requested)
  3. Notify manager via Telegram
  4. Wait for validation
  5. Update status + notify employee

### 4. AI Schedule Generation
- Trigger: Manual or Schedule (every Sunday)
- Actions:
  1. Retrieve available employees for the week
  2. Retrieve approved leave
  3. Retrieve needs per day/restaurant
  4. Call Ollama with context
  5. Parse response and create shifts
  6. Notify for validation

### 5. Automatic Alerts
- Trigger: Schedule (daily, 8am)
- Checks:
  - Understaffing D+1, D+2, D+3
  - Shifts without breaks
  - Employees > 40h/week
- Action: Notify via Telegram

## Directory Structure

```
planificateur-restaurants/
├── CLAUDE.md                 # This file
├── docker-compose.yml        # PostgreSQL + NocoDB + Ollama
├── db/
│   ├── init.sql             # Complete schema
│   └── seed.sql             # Test data
├── n8n/
│   ├── workflows/
│   │   ├── crud-employees.json
│   │   ├── crud-shifts.json
│   │   ├── leave-management.json
│   │   ├── schedule-generation.json
│   │   └── alerts.json
│   └── credentials.json
├── ollama/
│   └── modelfile            # Custom config if needed
└── docs/
    ├── api.md               # API documentation
    └── usage.md             # User guide
```

## Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: planning
      POSTGRES_USER: planning
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  nocodb:
    image: nocodb/nocodb:latest
    environment:
      NC_DB: "pg://postgres:5432?u=planning&p=${POSTGRES_PASSWORD}&d=planning"
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          memory: 8G

volumes:
  postgres_data:
  ollama_data:
```

## Useful Commands

```bash
# Start the stack
docker-compose up -d

# Initialize Ollama with Mistral
docker exec -it ollama ollama pull mistral

# Access PostgreSQL
docker exec -it postgres psql -U planning -d planning

# View logs
docker-compose logs -f

# Database backup
docker exec postgres pg_dump -U planning planning > backup.sql
```

## API Endpoints (via n8n webhooks)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/employees | List employees |
| POST | /api/employees | Create an employee |
| GET | /api/shifts?date=YYYY-MM-DD | Shifts for a date |
| POST | /api/shifts | Create a shift |
| GET | /api/planning?week=YYYY-WXX | Weekly schedule |
| POST | /api/leave | Leave request |
| PUT | /api/leave/:id/approve | Approve leave |
| POST | /api/ai/generate-schedule | Generate AI schedule |
| POST | /api/ai/question | Question to the assistant |

## Next Steps

1. [ ] Deploy the Docker stack
2. [ ] Import the SQL schema
3. [ ] Configure n8n and create workflows
4. [ ] Connect NocoDB to PostgreSQL
5. [ ] Configure the Telegram bot
6. [ ] Test with dummy data
7. [ ] Train mobile employees on the interface
8. [ ] Go live

## Notes

- **Backup**: Configure daily PostgreSQL backup to your Proxmox
- **Security**: Put n8n and NocoDB behind Tailscale or VPN
- **Monitoring**: Add healthchecks to containers
- **Possible Enhancements**:
  - Mobile app for employees (to view their shifts)
  - Time clock integration
  - Accounting export for hours
