# Trueno Pro Club Services (TPCS)

[Español <img src="https://flagcdn.com/16x12/es.png" width="16" height="12" alt="ES">](#es) | [English <img src="https://flagcdn.com/16x12/gb.png" width="16" height="12" alt="GB">](#en)

---

## <a id="es"></a> <img src="https://flagcdn.com/16x12/es.png" width="24" height="18" alt="ES"> Español

Un sistema integral de gestión para clubes de Pro Clubs.

### 📋 Descripción General

Trueno Pro Club Services es una plataforma completa que permite gestionar todos los aspectos de un club de Pro Clubs, incluyendo miembros, logros, partidos, estadísticas de jugadores y más.

### 🌐 Vista Previa (Live Demo)

Puedes ver el sistema en funcionamiento en el despliegue oficial de **Casemuro City**:
👉 **[https://www.casemurocity.org](https://www.casemurocity.org)**

### 🏗️ Arquitectura del Proyecto

Este es un **monorepo** estructurado con [pnpm workspaces](https://pnpm.io/workspaces) que incluye:

#### `/apps`

##### **api** - REST API
- **Stack**: Express.js + MongoDB
- **Funcionalidades principales**:
  - Gestión de clubes (`/club`)
  - Gestión de miembros (`/members`)
  - Logros y estadísticas (`/achievements`)
  - Registro de partidos (`/matches`)
  - Team of the Week (`/totw`)
- **Modelos**: Club, Club Members, Matches, Player Stats, Achievements, TOTW

##### **web** - Frontend
- **Stack**: Astro + Vue + Tailwind
- **Características**:
  - Interfaz responsiva
  - Diseño moderno con DaisyUI

##### **worker** - Background Jobs
- **Propósito**: Procesamiento asincrónico de webhooks y tareas programadas
- **Características**: Sistema de eventos y manejo de trabajos en segundo plano

#### `/packages`

##### **eafcapi** - API de EA directa
- Paquete compartido reutilizable
- Contiene modelos y utilidades comunes

### 🚀 Primeros Pasos

#### Requisitos Previos
- Node.js 18+ 
- pnpm 8+

#### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd TruenoProClubServices

# Instalar dependencias de todo el monorepo
pnpm install

# Construir todos los proyectos
pnpm build
```

### 📦 Scripts Disponibles

#### Monorepo
```bash
# Construir todas las aplicaciones
pnpm build
```

#### API
```bash
cd apps/api

# Iniciar en modo desarrollo
pnpm start

# Construir para producción
pnpm build

# Ejecutar binario compilado
pnpm serve
```

#### Web
```bash
cd apps/web

# Iniciar servidor de desarrollo
pnpm dev

# Construir para producción
pnpm build

# Previsualizar build de producción
pnpm preview
```

### 🔧 Configuración

#### Variables de Entorno

Las variables de entorno se deben configurar en archivos `.env` (u otro tipo variables de entorno si es en docker por ejemplo) en cada aplicación.

##### API (`apps/api/.env`)

| Variable | Tipo | Descripción | Valor por defecto |
|----------|------|-------------|-------------------|
| `PORT` | `number` | Puerto en el que escucha la API | `80` |
| `DEVMODE` | `boolean` | Habilita CORS abierto para desarrollo | `false` |
| `MONGO_URL` | `string` | URL de conexión a MongoDB | **Requerido** |
| `CLUBID` | `number` | ID del club en EA Sports | `2766636` |
| `PLATFORM` | `string` | Plataforma del club (Xbox/PS/PC) | `common-gen5` |
| `CLUB_CACHE_MS` | `number` | Tiempo de caché para datos del club (ms) | `3600000` (1 hora) |

**Ejemplo `.env`:**
```env
PORT=3000
DEVMODE=true
MONGO_URL=mongodb://localhost:27017/tpcs
CLUBID=2766636
PLATFORM=common-gen5
CLUB_CACHE_MS=3600000
```

##### Worker (`apps/worker/.env`)

| Variable | Tipo | Descripción | Valor por defecto |
|----------|------|-------------|-------------------|
| `MONGO_URL` | `string` | URL de conexión a MongoDB | **Requerido** |
| `CLUBID` | `number` | ID del club para sincronizar | `290776` |
| `PLATFORM` | `string` | Plataforma del club (Xbox/PS/PC) | `common-gen5` |
| `WORKER_INTERVAL` | `number` | Intervalo de sincronización en segundos | `300` (5 minutos) |
| `FORCE_RECALCULATE` | `boolean` | Fuerza recálculo de estadísticas en startup | `false` |
| `RABBITMQ_URL` | `string` | URL de conexión a RabbitMQ | `amqp://localhost` |

**Ejemplo `.env`:**
```env
MONGO_URL=mongodb://localhost:27017/tpcs
CLUBID=290776
PLATFORM=common-gen5
WORKER_INTERVAL=300
FORCE_RECALCULATE=false
RABBITMQ_URL=amqp://localhost
```

#### Servicios Externos

**MongoDB:**
```bash
# Usando Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**RabbitMQ:**
```bash
# Usando Docker
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
```

### 📂 Estructura de Carpetas

```
apps/
├── api/                          # REST API
│   └── src/
│       ├── controllers/          # Controladores
│       ├── models/               # Esquemas MongoDB
│       ├── interfaces/           # TypeScript interfaces
│       ├── routes/               # Definición de rutas
│       ├── services/             # Lógica de negocio
│       ├── middleware/           # Middlewares
│       ├── database/             # Configuración DB
│       └── app.ts                # Punto de entrada

├── web/                          # Frontend Astro
│   └── src/
│       ├── components/           # Componentes Vue y Astro
│       ├── pages/                # Rutas Astro
│       ├── layouts/              # Layouts
│       ├── services/             # Servicios HTTP
│       ├── interfaces/           # TypeScript types
│       ├── i18n/                 # Traducciones
│       └── scripts/              # Scripts compartidos

└── worker/                       # Background Jobs
    └── src/
        ├── controllers/
        ├── services/
        ├── jobs/
        ├── events/
        └── webhooks.json
```

### 🔌 Endpoints API

#### Base URL
- **Desarrollo**: `http://localhost:80`

#### Rutas Disponibles
- `GET /` - Información general de rutas

### 🗓️ Base de Datos

**Motor**: MongoDB

**Colecciones principales**:
- `clubs` - Información de clubes
- `clubmembers` - Integrantes de los clubes
- `matches` - Registro de partidos
- `playerstats` - Estadísticas de jugadores
- `achievements` - Logros desbloqueados
- `totw` - Equipo de la semana

### 🛓 Docker

Ambas aplicaciones principales incluyen `Dockerfile` para contenerización:

```bash
# Construir imagen API
cd apps/api
docker build -t tpcs-api .

# Construir imagen Worker
cd apps/worker
docker build -t tpcs-worker .
```

### 🖱️ Seguridad

- **CORS**: Configurado para producción (`https://www.casemurocity.org`)
- **Error Handling**: Middleware centralizado para manejo de errores
- **Validación**: Schemas y tipos TypeScript fuertes

### 📝 Tecnologías Principales

| Componente | Tecnologías |
|-----------|------------|
| **API Backend** | Express.js, TypeScript, MongoDB, Mongoose |
| **Frontend Web** | Astro, Vue.js, Tailwind CSS, DaisyUI |
| **Build Tools** | TypeScript, pnpm, Webpack |

### 👨‍💻 Autor

**el_trueno**

### 📄 Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).

### 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## <a id="en"></a> <img src="https://flagcdn.com/16x12/gb.png" width="24" height="18" alt="GB"> English

A comprehensive management system for Pro Clubs.

### 📋 Overview

Trueno Pro Club Services is a complete platform that allows you to manage all aspects of a Pro Club, including members, achievements, matches, player statistics, and more.

### 🌐 Live Demo

You can see the system in action at the official **Casemuro City** deployment:
👉 **[https://www.casemurocity.org](https://www.casemurocity.org)**

### 🏗️ Project Architecture

This is a **monorepo** structured with [pnpm workspaces](https://pnpm.io/workspaces) that includes:

#### `/apps`

##### **api** - REST API
- **Stack**: Express.js + MongoDB
- **Main functionalities**:
  - Club management (`/club`)
  - Member management (`/members`)
  - Achievements and statistics (`/achievements`)
  - Match registration (`/matches`)
  - Team of the Week (`/totw`)
- **Models**: Club, Club Members, Matches, Player Stats, Achievements, TOTW

##### **web** - Frontend
- **Stack**: Astro + Vue + Tailwind
- **Features**:
  - Responsive interface
  - Modern design with DaisyUI

##### **worker** - Background Jobs
- **Purpose**: Asynchronous processing of webhooks and scheduled tasks
- **Features**: Event system and background job handling

#### `/packages`

##### **eafcapi** - Direct EA API
- Reusable shared package
- Contains common models and utilities

### 🚀 Getting Started

#### Prerequisites
- Node.js 18+ 
- pnpm 8+

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd TruenoProClubServices

# Install dependencies for the entire monorepo
pnpm install

# Build all projects
pnpm build
```

### 📦 Available Scripts

#### Monorepo
```bash
# Build all applications
pnpm build
```

#### API
```bash
cd apps/api

# Start in development mode
pnpm start

# Build for production
pnpm build

# Run compiled binary
pnpm serve
```

#### Web
```bash
cd apps/web

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### 🔧 Configuration

#### Environment Variables

Environment variables should be configured in `.env` files (or other environment variable types if using Docker, for example) in each application.

##### API (`apps/api/.env`)

| Variable | Type | Description | Default Value |
|----------|------|-------------|----------------|
| `PORT` | `number` | Port on which the API listens | `80` |
| `DEVMODE` | `boolean` | Enables open CORS for development | `false` |
| `MONGO_URL` | `string` | MongoDB connection URL | **Required** |
| `CLUBID` | `number` | Club ID on EA Sports | `2766636` |
| `PLATFORM` | `string` | Club platform (Xbox/PS/PC) | `common-gen5` |
| `CLUB_CACHE_MS` | `number` | Cache time for club data (ms) | `3600000` (1 hour) |

**Example `.env`:**
```env
PORT=3000
DEVMODE=true
MONGO_URL=mongodb://localhost:27017/tpcs
CLUBID=2766636
PLATFORM=common-gen5
CLUB_CACHE_MS=3600000
```

##### Worker (`apps/worker/.env`)

| Variable | Type | Description | Default Value |
|----------|------|-------------|----------------|
| `MONGO_URL` | `string` | MongoDB connection URL | **Required** |
| `CLUBID` | `number` | Club ID to synchronize | `290776` |
| `PLATFORM` | `string` | Club platform (Xbox/PS/PC) | `common-gen5` |
| `WORKER_INTERVAL` | `number` | Synchronization interval in seconds | `300` (5 minutes) |
| `FORCE_RECALCULATE` | `boolean` | Force statistics recalculation on startup | `false` |
| `RABBITMQ_URL` | `string` | RabbitMQ connection URL | `amqp://localhost` |

**Example `.env`:**
```env
MONGO_URL=mongodb://localhost:27017/tpcs
CLUBID=290776
PLATFORM=common-gen5
WORKER_INTERVAL=300
FORCE_RECALCULATE=false
RABBITMQ_URL=amqp://localhost
```

#### External Services

**MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**RabbitMQ:**
```bash
# Using Docker
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
```

### 📂 Folder Structure

```
apps/
├── api/                          # REST API
│   └── src/
│       ├── controllers/          # Controllers
│       ├── models/               # MongoDB Schemas
│       ├── interfaces/           # TypeScript interfaces
│       ├── routes/               # Route definitions
│       ├── services/             # Business logic
│       ├── middleware/           # Middlewares
│       ├── database/             # Database configuration
│       └── app.ts                # Entry point

├── web/                          # Astro Frontend
│   └── src/
│       ├── components/           # Vue and Astro components
│       ├── pages/                # Astro routes
│       ├── layouts/              # Layouts
│       ├── services/             # HTTP services
│       ├── interfaces/           # TypeScript types
│       ├── i18n/                 # Translations
│       └── scripts/              # Shared scripts

└── worker/                       # Background Jobs
    └── src/
        ├── controllers/
        ├── services/
        ├── jobs/
        ├── events/
        └── webhooks.json
```

### 🔌 API Endpoints

#### Base URL
- **Development**: `http://localhost:80`

#### Available Routes
- `GET /` - General information about routes

### 🗄️ Database

**Engine**: MongoDB

**Main Collections**:
- `clubs` - Club information
- `clubmembers` - Club members
- `matches` - Match records
- `playerstats` - Player statistics
- `achievements` - Unlocked achievements
- `totw` - Team of the Week

### 🐳 Docker

Both main applications include `Dockerfile` for containerization:

```bash
# Build API image
cd apps/api
docker build -t tpcs-api .

# Build Worker image
cd apps/worker
docker build -t tpcs-worker .
```

### 🛡️ Security

- **CORS**: Configured for production (`https://www.casemurocity.org`)
- **Error Handling**: Centralized error handling middleware
- **Validation**: Strong TypeScript schemas and types

### 📝 Main Technologies

| Component | Technologies |
|-----------|------------|
| **API Backend** | Express.js, TypeScript, MongoDB, Mongoose |
| **Frontend Web** | Astro, Vue.js, Tailwind CSS, DaisyUI |
| **Build Tools** | TypeScript, pnpm, Webpack |

### 👨‍💻 Author

**el_trueno**

### 📄 License

This project is licensed under the [MIT License](LICENSE).

### 🤝 Contributions

Contributions are welcome. Please:
1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
