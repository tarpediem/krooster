# Krooster

**The smart scheduling system for Kosmo Kompany**

Krooster is a modern employee scheduling application designed for managing two cosmopolitan restaurant locations serving European and Thai cuisine:

- **Kosmo** - Bangkok
- **A la mer by Kosmo** - Hua Hin beachfront

It features AI-powered schedule generation, leave management, and a conversational assistant named **Kruce**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![n8n](https://img.shields.io/badge/n8n-Workflows-orange?logo=n8n)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

---

## Features

### Schedule Management
- **Day / Week / Month** calendar views
- Drag-and-drop shift management
- Color-coded positions (kitchen, service, bar, etc.)
- Support for **mobile employees** who can work at both locations

### AI-Powered Scheduling
- **Kruce** - Friendly conversational AI assistant
- Automatic schedule generation with Cerebras AI
- Conflict detection and optimization
- Natural language employee management

### Employee Management
- Employee profiles with positions and availability
- Mobile vs local employee designation
- CSV bulk import with template download
- Active/inactive status tracking

### Leave Management
- Leave request workflow (request → approve/reject)
- Leave balance tracking
- Multiple leave types (paid, unpaid, sick, training)
- Calendar integration for visibility

### Admin Features
- Database backup and restore
- LLM model configuration
- System settings management

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | n8n (workflow automation) |
| Database | PostgreSQL 16 |
| AI | Cerebras API (llama-3.3-70b) |
| Container | Podman / Docker Compose |

---

## Quick Start

### Prerequisites
- Podman or Docker with Compose
- Node.js 20+ (for local development)

### Running with Podman/Docker

```bash
# Clone the repository
git clone https://github.com/tarpediem/krooster.git
cd krooster

# Start all services
podman-compose up -d

# Or with Docker
docker-compose up -d
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **n8n**: http://localhost:5678
- **PostgreSQL**: localhost:5432

### Environment Variables

Create a `.env` file in the root directory:

```env
POSTGRES_PASSWORD=your_secure_password
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_n8n_password
```

---

## Project Structure

```
krooster/
├── frontend/           # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities and API client
├── n8n/
│   └── workflows/     # n8n workflow definitions
├── db/
│   ├── init.sql       # Database schema
│   └── seed.sql       # Sample data
└── docker-compose.yml
```

---

## API Endpoints

All APIs are served via n8n webhooks:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/shifts` | List shifts (with date filters) |
| POST | `/api/shifts` | Create shift |
| GET | `/api/leave` | List leave requests |
| POST | `/api/leave` | Create leave request |
| POST | `/api/ai/ask` | Chat with Kruce |
| POST | `/api/ai/generate-schedule` | AI schedule generation |

---

## Meet Kruce

Kruce is your friendly AI scheduling assistant. Ask questions like:

- *"Who is available to work this weekend?"*
- *"Are there any understaffed days next week?"*
- *"Add a new employee named John Smith to Hua Hin"*
- *"Which employees are approaching overtime?"*

Kruce will ask clarifying questions and confirm before making any changes.

---

## Development

```bash
# Install frontend dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## License

Private project for Kosmo Kompany.

---

Built with :coffee: for Kosmo & A la mer by Kosmo
