# Docker Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- VPS with at least 2GB RAM
- Domain name (optional)

## Setup

1. **Clone and prepare:**

```bash
git clone <repository-url>
cd tavern_bot
cp .env.docker .env
```

2. **Configure environment:**
   Edit `.env` with your values:

- `MONGO_ROOT_PASSWORD` - secure MongoDB password
- `TELEGRAM_BOT_TOKEN` - from @BotFather
- `TELEGRAM_BOT_USERNAME` - your bot username
- `TELEGRAM_CHAT_ID` - your chat ID (optional)

3. **Deploy:**

```bash
docker-compose up -d
```

## Services

- **Frontend**: http://your-domain.com (port 80)
- **Backend API**: http://your-domain.com/api
- **MongoDB**: localhost:27017
- **Telegram Bot**: Runs automatically

## Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Update and rebuild
docker-compose pull
docker-compose up -d --build
```

## Database Seeding

```bash
docker-compose exec backend yarn workspace tavern-bot-backend seed
```

## SSL/HTTPS

Use nginx-proxy or certbot for SSL termination.

## Monitoring

Check service health:

```bash
curl http://localhost:5001/health
```
