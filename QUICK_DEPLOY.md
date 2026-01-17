# Швидкий деплой на Render

## Крок 1: MongoDB Atlas (5 хвилин)

1. Зареєструйтесь на https://www.mongodb.com/cloud/atlas
2. Створіть кластер (Free M0)
3. Database Access → Add New Database User
4. Network Access → Add IP Address → `0.0.0.0/0` (дозволити всім)
5. Database → Connect → Copy connection string
   - Замініть `<password>` на ваш пароль
   - Замініть `<dbname>` на `tavern_bot`

## Крок 2: Telegram Bot (2 хвилини)

1. Відкрийте [@BotFather](https://t.me/BotFather)
2. `/newbot` → введіть ім'я та username
3. Скопіюйте токен

## Крок 3: Деплой на Render (10 хвилин)

### Автоматичний спосіб (через Blueprint):

1. Зареєструйтесь на https://render.com (через GitHub)
2. New → Blueprint
3. Підключіть репозиторій → виберіть гілку `main`
4. Render автоматично знайде `render.yaml`

5. **Налаштуйте змінні середовища:**

   **Backend сервіс:**
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tavern_bot?retryWrites=true&w=majority
   TELEGRAM_BOT_TOKEN=123456789:ABCdef...
   TELEGRAM_BOT_USERNAME=your_bot_username
   PORT=10000
   NODE_ENV=production
   ```

   **Telegram Bot сервіс:**
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdef... (той самий)
   NODE_ENV=production
   ```
   (API_URL встановиться автоматично)

6. Натисніть "Apply" → чекайте деплой (~5-10 хвилин)

### Ручний спосіб:

**Backend:**
- New → Web Service
- Build: `cd backend && yarn install && yarn build`
- Start: `cd backend && yarn start`
- Root Directory: `backend`
- Додайте змінні середовища (як вище)

**Telegram Bot:**
- New → Background Worker
- Build: `cd telegram-bot && yarn install && yarn build`
- Start: `cd telegram-bot && yarn start`
- Root Directory: `telegram-bot`
- API_URL: `https://your-backend-url.onrender.com/api`

## Крок 4: Заповнити базу даних

Після деплою backend:

**Варіант А - через Render Shell:**
1. Backend сервіс → Shell
2. `yarn seed`

**Варіант Б - локально:**
```bash
cd backend
MONGODB_URI="mongodb+srv://..." yarn seed
```

## Крок 5: Оновити Frontend

У Vercel (або де деплоїться frontend) додайте:

```
VITE_API_URL=https://tavern-bot-backend.onrender.com/api
VITE_TELEGRAM_BOT_NAME=your_bot_username
```

## Перевірка

1. Backend: https://your-backend.onrender.com/health
2. Telegram: надішліть боту `/start`

## ⚠️ Важливо про Free Plan

**Render Free Plan має sleep mode:**
- Сервіси засинають після 15 хв неактивності
- Перший запит після сну може займати 30-60 сек
- Telegram бот може не відповідати під час сну

**Рішення:**
1. **UptimeRobot** (безкоштовно) - ping кожні 5 хвилин
   - https://uptimerobot.com
   - Додайте моніторинг backend URL

2. **Оновити до Starter Plan** ($7/міс) - немає sleep mode

3. **Railway** (альтернатива) - $5 кредитів/міс, немає sleep mode

## Troubleshooting

**Backend не запускається:**
- Перевірте логи в Render Dashboard
- Перевірте MONGODB_URI (має бути повний connection string)
- Перевірте PORT=10000

**Telegram Bot не відповідає:**
- Перевірте логи worker сервісу
- Перевірте TELEGRAM_BOT_TOKEN
- Перевірте API_URL (має закінчуватись на `/api`)
- Якщо backend спить - бот не працює

**Build fails:**
- Перевірте rootDir в налаштуваннях
- Перевірте команди build/start
- Перевірте логи build
