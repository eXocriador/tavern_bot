# Tavern Bot - Lineage 2 Instance Zone Tracker

Веб-додаток для відстеження проходження інстанс-зон Lineage 2 High Five гравцями Telegram чату.

## Структура проекту

- `backend/` - Express API сервер
- `frontend/` - React веб-додаток
- `telegram-bot/` - Telegram бот

## Технології

- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Frontend**: React + TypeScript + Vite
- **Telegram**: Telegram Login Widget + Telegram Bot API

## Передумови

- Node.js 18+
- MongoDB (локально або MongoDB Atlas)
- Telegram Bot Token (отримати у [@BotFather](https://t.me/BotFather))

## Налаштування

### 1. Встановлення залежностей

```bash
npm run install:all
```

### 2. Backend

1. Створити `.env` файл в `backend/` (скопіювати з `backend/.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tavern_bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
NODE_ENV=development
```

2. Запустити MongoDB (якщо локально):
```bash
mongod
```

3. Заповнити базу даних інстанс-зонами:
```bash
npm run seed --workspace=backend
```

4. Запустити backend:
```bash
npm run dev --workspace=backend
```

Backend буде доступний на `http://localhost:5000`

### 3. Frontend

1. Створити `.env` файл в `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_TELEGRAM_BOT_NAME=your_bot_username
```

2. Запустити frontend:
```bash
npm run dev --workspace=frontend
```

Frontend буде доступний на `http://localhost:3000`

### 4. Telegram Bot

1. Створити `.env` файл в `telegram-bot/`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_URL=http://localhost:5000/api
```

2. Запустити бота:
```bash
npm run dev --workspace=telegram-bot
```

## Функціонал

### Веб-додаток

- **Авторизація** через Telegram Login Widget
- **Dashboard** - список інстанс-зон з можливістю відмітки відвідувань
- **Профіль** - налаштування імені персонажа
- **Статистика** - персональна та загальна статистика

### Telegram Bot

- `/start` - привітання та список команд
- `/iz` - показати статус (закриті та доступні інстанси)
- `/iz @username` - показати статус іншого гравця
- `/visit <назва_зони>` - відмітити відвідування зони
- `/stats` - моя статистика
- `/stats @username` - статистика іншого гравця

## Cron Job

Автоматичне скидання інстансів відбувається кожен понеділок і середу о 10:00 за київським часом (EET/EEST). При скиданні створюється новий період, а старі відмітки залишаються в історії.

## API Endpoints

### Auth
- `POST /api/auth/telegram` - авторизація через Telegram

### Instances
- `GET /api/instances` - список всіх інстанс-зон
- `GET /api/instances/:zoneId` - інформація про конкретну зону

### Visits
- `GET /api/visits/me` - мої відвідування (потрібна авторизація)
- `GET /api/visits/user/:telegramId` - відвідування іншого гравця
- `POST /api/visits/:zoneId` - відмітити відвідування (потрібна авторизація)
- `DELETE /api/visits/:zoneId` - зняти відмітку (потрібна авторизація)

### Profile
- `GET /api/profile` - мій профіль (потрібна авторизація)
- `PUT /api/profile` - оновити профіль (потрібна авторизація)

### Statistics
- `GET /api/statistics/me` - моя статистика (потрібна авторизація)
- `GET /api/statistics/user/:telegramId` - статистика іншого гравця
- `GET /api/statistics/global` - загальна статистика
- `GET /api/statistics/zone/:zoneId` - статистика по зоні
- `GET /api/statistics/periods` - історія періодів

### Bot
- `POST /api/bot/ensure-user` - створити/оновить користувача
- `GET /api/bot/visits/:telegramId` - відвідування користувача
- `POST /api/bot/visits/:telegramId/:zoneId` - відмітити відвідування

## Інстанс-зони

Проект включає стандартний список групових інстанс-зон для Lineage 2 High Five:
- Kamaloka - Hall of the Abyss
- Zaken (Daytime/Nighttime/Hard)
- Seed of Destruction (Tiat)
- Seed of Infinity (Twins)
- Freya (Normal/Hard)
- Frintezza
- Antharas
- Valakas
- Baium

## Розгортання

### Render (Backend)

1. Створити новий Web Service на Render
2. Підключити MongoDB (Render MongoDB або MongoDB Atlas)
3. Встановити змінні оточення з `.env`
4. Build Command: `npm run build --workspace=backend`
5. Start Command: `npm start --workspace=backend`

### Vercel (Frontend)

1. Імпортувати проект на Vercel
2. Root Directory: `frontend`
3. Build Command: `npm run build --workspace=frontend`
4. Output Directory: `dist`
5. Встановити змінні оточення з `.env`

### Telegram Bot

Може бути розгорнутий на Render як Background Worker або на будь-якому VPS.

## Ліцензія

MIT

