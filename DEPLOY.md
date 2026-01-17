# Інструкція з деплою на Render

## Підготовка

### 1. MongoDB Atlas (Безкоштовна база даних)

1. Зареєструйтесь на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Створіть новий кластер (безкоштовний план M0)
3. Створіть користувача бази даних
4. Додайте IP адресу `0.0.0.0/0` до whitelist (для доступу з Render)
5. Скопіюйте connection string (виглядає як `mongodb+srv://username:password@cluster.mongodb.net/tavern_bot?retryWrites=true&w=majority`)

### 2. Telegram Bot Token

1. Відкрийте [@BotFather](https://t.me/BotFather) в Telegram
2. Створіть нового бота командою `/newbot`
3. Скопіюйте токен (виглядає як `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Деплой на Render

### Варіант 1: Автоматичний деплой через render.yaml (Рекомендовано)

1. Зареєструйтесь на [Render](https://render.com) (можна через GitHub)
2. Підключіть ваш GitHub репозиторій
3. У Render Dashboard натисніть "New" → "Blueprint"
4. Виберіть ваш репозиторій та гілку `main`
5. Render автоматично визначить `render.yaml` і створить обидва сервіси

6. **Налаштуйте Environment Variables** для обох сервісів:

   **Для Backend (`tavern-bot-backend`):**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tavern_bot?retryWrites=true&w=majority
   TELEGRAM_BOT_TOKEN=ваш_токен_бота
   TELEGRAM_BOT_USERNAME=ваш_username_бота
   PORT=10000
   NODE_ENV=production
   ```

   **Для Telegram Bot (`tavern-bot-telegram`):**
   ```
   TELEGRAM_BOT_TOKEN=ваш_токен_бота
   NODE_ENV=production
   ```
   (API_URL буде автоматично встановлено з backend URL)

7. Після деплою скопіюйте URL backend сервісу (наприклад: `https://tavern-bot-backend.onrender.com`)

### Варіант 2: Ручний деплой

#### Backend Service

1. У Render Dashboard натисніть "New" → "Web Service"
2. Підключіть ваш GitHub репозиторій
3. Налаштування:
   - **Name**: `tavern-bot-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && yarn install && yarn build`
   - **Start Command**: `cd backend && yarn start`
   - **Plan**: `Free`

4. Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tavern_bot?retryWrites=true&w=majority
   TELEGRAM_BOT_TOKEN=ваш_токен_бота
   TELEGRAM_BOT_USERNAME=ваш_username_бота
   PORT=10000
   NODE_ENV=production
   ```

5. Натисніть "Create Web Service"

#### Telegram Bot Service

1. У Render Dashboard натисніть "New" → "Background Worker"
2. Підключіть той самий GitHub репозиторій
3. Налаштування:
   - **Name**: `tavern-bot-telegram`
   - **Environment**: `Node`
   - **Build Command**: `cd telegram-bot && yarn install && yarn build`
   - **Start Command**: `cd telegram-bot && yarn start`
   - **Plan**: `Free`

4. Environment Variables:
   ```
   TELEGRAM_BOT_TOKEN=ваш_токен_бота
   API_URL=https://tavern-bot-backend.onrender.com/api
   NODE_ENV=production
   ```
   (Замініть URL на ваш backend URL)

5. Натисніть "Create Background Worker"

## Після деплою

### 1. Заповнити базу даних інстансами

Після того, як backend запуститься, потрібно заповнити базу даних:

1. Підключіться до Render через SSH (Render Dashboard → ваш сервіс → "Shell")
2. Або виконайте команду локально з підключенням до MongoDB Atlas:

```bash
# Локально (якщо маєте доступ до MongoDB Atlas)
cd backend
MONGODB_URI="mongodb+srv://..." yarn seed
```

Або через Render Shell:
```bash
cd backend
yarn seed
```

### 2. Оновити Frontend

Оновіть `.env` файл у frontend або змінні середовища у Vercel:

```
VITE_API_URL=https://tavern-bot-backend.onrender.com/api
VITE_TELEGRAM_BOT_NAME=ваш_username_бота
```

### 3. Перевірка роботи

1. Backend health check: `https://tavern-bot-backend.onrender.com/health`
2. Перевірте логи Telegram бота в Render Dashboard
3. Надішліть боту команду `/start` в Telegram

## Важливі примітки

### Render Free Plan Limitations

- **Sleep Mode**: Безкоштовні сервіси засинають після 15 хвилин неактивності
- **Cold Start**: Перший запит після сну може займати 30-60 секунд
- **Telegram Bot**: Може не відповідати під час сну. Розгляньте:
  - Використання webhook замість polling (складніше налаштувати)
  - Оновлення до платного плану ($7/місяць)
  - Використання [UptimeRobot](https://uptimerobot.com) для підтримки активності (безкоштовно)

### Cron Jobs

Cron jobs у backend працюватимуть автоматично, але тільки коли сервіс активний. Якщо backend спить, cron може пропустити виконання.

### Альтернатива: Railway

Якщо потрібні постійно працюючі сервіси без сну, розгляньте [Railway](https://railway.app):
- $5 кредитів на місяць (достатньо для маленьких проєктів)
- Немає sleep mode
- Простіший деплой

## Troubleshooting

### Backend не підключається до MongoDB

- Перевірте, що IP `0.0.0.0/0` додано до MongoDB Atlas whitelist
- Перевірте правильність connection string
- Перевірте логи в Render Dashboard

### Telegram Bot не відповідає

- Перевірте, що бот запущений (логи в Render Dashboard)
- Перевірте правильність `TELEGRAM_BOT_TOKEN`
- Перевірте, що `API_URL` вказує на правильний backend URL
- Якщо backend спить, бот не зможе робити запити

### Build fails

- Перевірте, що всі залежності вказані в `package.json`
- Перевірте логи build в Render Dashboard
- Переконайтесь, що використовуєте правильні команди build/start
