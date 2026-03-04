# WhatsApp SaaS - Bandeja Unificada

Plataforma SaaS multi-tenant para centralizar múltiples sesiones de WhatsApp en una sola interfaz web colaborativa.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| WhatsApp | @whiskeysockets/baileys |
| Base de Datos | PostgreSQL + Prisma ORM |
| Tiempo Real | Socket.io |
| Frontend | React + Vite + Tailwind CSS |
| Estado | Zustand |
| Infraestructura | Docker + Nginx |

## Estructura del Proyecto

```
sistema whassap/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── lib/prisma.ts         # DB client
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts    # Register/Login/JWT
│   │   │   ├── instance.routes.ts # WhatsApp sessions
│   │   │   ├── chat.routes.ts    # Unified inbox
│   │   │   └── message.routes.ts # Messages + Send
│   │   ├── services/
│   │   │   ├── whatsapp.service.ts # Baileys engine
│   │   │   └── message.service.ts  # History sync
│   │   └── socket/
│   │       └── socket.handler.ts   # Socket.io
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ChatPage.tsx      # Bandeja unificada
│   │   │   └── InstancesPage.tsx # QR + gestión
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── store/auth.store.ts   # Zustand
│   │   └── lib/
│   │       ├── api.ts            # Axios
│   │       └── socket.ts         # Socket.io client
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- Node.js 20+
- PostgreSQL 15+
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL
npx prisma migrate dev --name init
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Con Docker (recomendado)

```bash
docker-compose up --build
```

Accede a: http://localhost

## Variables de Entorno (Backend)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Clave secreta para JWT | - |
| `PORT` | Puerto del servidor | 3001 |
| `FRONTEND_URL` | URL del frontend (CORS) | http://localhost:5173 |

## API Endpoints

### Auth
- `POST /api/auth/register` - Crear empresa + admin
- `POST /api/auth/login` - Login con JWT
- `GET /api/auth/me` - Usuario actual

### Instancias WhatsApp
- `GET /api/instances` - Listar sesiones
- `POST /api/instances` - Crear sesión (genera QR)
- `DELETE /api/instances/:id` - Eliminar sesión
- `POST /api/instances/:id/reconnect` - Reconectar

### Chats
- `GET /api/chats` - Bandeja unificada
- `GET /api/chats/:id` - Chat específico

### Mensajes
- `GET /api/messages/:chatId` - Historial paginado
- `POST /api/messages/send` - Enviar mensaje

## Socket.io Events

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `qr_code` | Server → Client | QR generado |
| `session_status` | Server → Client | Estado de sesión |
| `new_message` | Server → Client | Mensaje entrante |
| `history_synced` | Server → Client | Historial sincronizado |

## Despliegue en VPS (Ubuntu 22.04)

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Clonar proyecto
git clone <repo> /opt/whatsapp-saas
cd /opt/whatsapp-saas

# Configurar variables
cp backend/.env.example backend/.env
# Editar backend/.env con valores de producción

# Levantar
docker-compose up -d --build
```

## Sprints Completados

- ✅ Sprint 1: Cimientos y Autenticación
- ✅ Sprint 2: Motor de Conexión WhatsApp (Baileys)
- ✅ Sprint 3: Gestión de Datos y Tiempo Real (Socket.io)
- ✅ Sprint 4: Interfaz de Usuario (React)
- ✅ Sprint 5: Docker y Despliegue
