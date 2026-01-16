import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.API_URL || 'http://localhost:5001/api';

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Helper function to make API requests
const apiRequest = async (method: string, endpoint: string, data?: any) => {
  try {
    const config: any = {
      method,
      url: `${apiUrl}${endpoint}`,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
};

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
👋 Вітаю! Я Tavern Bot - помічник для відстеження інстанс-зон Lineage 2.

📋 Доступні команди:
/iz - Показати мій статус (закриті та доступні інстанси)
/iz @username - Показати статус іншого гравця
/visit <назва_зони> - Відмітити відвідування зони
/stats - Моя статистика
/stats @username - Статистика іншого гравця

💡 Приклад: /visit Zaken (Daytime)
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// Helper function to ensure user exists
const ensureUserExists = async (telegramId: number, username?: string, firstName?: string, lastName?: string) => {
  try {
    await apiRequest('POST', '/bot/ensure-user', {
      telegramId,
      username,
      firstName,
      lastName,
    });
  } catch (error) {
    // User might already exist, that's fine
    console.log('User check:', error);
  }
};

// /iz command - show instance status
bot.onText(/\/iz(?:\s+@(\w+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const targetUsername = match?.[1];

  try {
    let telegramId = msg.from?.id;

    // Ensure user exists
    if (msg.from) {
      await ensureUserExists(
        msg.from.id,
        msg.from.username,
        msg.from.first_name,
        msg.from.last_name
      );
    }

    // If username provided, need to find user by username
    // For now, we'll use the current user's ID
    // In production, you'd need to implement username lookup

    const visits = await apiRequest('GET', `/bot/visits/${telegramId}`);
    const instances = await apiRequest('GET', '/instances');

    const visitedZoneIds = new Set(visits.map((v: any) => v.zoneId.zoneId));

    let message = '📊 Статус інстанс-зон:\n\n';
    message += '✅ Пройдені зони:\n';

    const visited = instances.filter((inst: any) => visitedZoneIds.has(inst.zoneId));
    if (visited.length === 0) {
      message += '  Немає пройдених зон\n';
    } else {
      visited.forEach((inst: any) => {
        message += `  • ${inst.name}\n`;
      });
    }

    message += '\n🔓 Доступні зони:\n';
    const available = instances.filter((inst: any) => !visitedZoneIds.has(inst.zoneId));
    if (available.length === 0) {
      message += '  Всі зони пройдені! 🎉\n';
    } else {
      available.forEach((inst: any) => {
        message += `  • ${inst.name}\n`;
      });
    }

    message += `\n📈 Прогрес: ${visited.length}/${instances.length} (${Math.round((visited.length / instances.length) * 100)}%)`;

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /iz command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання статусу. Спробуйте пізніше.');
  }
});

// /visit command - mark visit
bot.onText(/\/visit\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Вкажіть назву зони. Приклад: /visit Zaken (Daytime)');
    return;
  }

  try {
    // Ensure user exists
    if (msg.from) {
      await ensureUserExists(
        msg.from.id,
        msg.from.username,
        msg.from.first_name,
        msg.from.last_name
      );
    }
    // Get all instances to find matching zone
    const instances = await apiRequest('GET', '/instances');
    const zone = instances.find((inst: any) =>
      inst.name.toLowerCase().includes(zoneName.toLowerCase())
    );

    if (!zone) {
      bot.sendMessage(
        chatId,
        `❌ Зона "${zoneName}" не знайдена. Використайте /iz щоб побачити список доступних зон.`
      );
      return;
    }

    // Ensure user exists in database
    try {
      // Try to mark visit via bot endpoint
      await apiRequest('POST', `/bot/visits/${msg.from?.id}/${zone.zoneId}`);
      bot.sendMessage(chatId, `✅ Відмічено відвідування: ${zone.name}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        bot.sendMessage(
          chatId,
          `❌ Користувач не знайдений. Будь ласка, спочатку увійдіть через веб-додаток для реєстрації.`
        );
      } else {
        const errorMsg = error.response?.data?.error || 'Помилка відмітки відвідування';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
      }
    }
  } catch (error: any) {
    console.error('Error in /visit command:', error);
    bot.sendMessage(chatId, '❌ Помилка відмітки відвідування.');
  }
});

// /stats command - show statistics
bot.onText(/\/stats(?:\s+@(\w+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const targetUsername = match?.[1];

  try {
    // Ensure user exists
    if (msg.from) {
      await ensureUserExists(
        msg.from.id,
        msg.from.username,
        msg.from.first_name,
        msg.from.last_name
      );
    }

    const telegramId = msg.from?.id;
    const stats = await apiRequest('GET', `/statistics/user/${telegramId}`);

    let message = '📊 Статистика:\n\n';
    message += `👤 Гравець: ${stats.user?.characterName || stats.user?.username || 'Не вказано'}\n\n`;

    message += '📅 Поточний період:\n';
    message += `  • Пройдено: ${stats.currentPeriod.visited} зон\n`;
    message += `  • Доступно: ${stats.currentPeriod.available} зон\n`;
    message += `  • Прогрес: ${stats.currentPeriod.completionRate.toFixed(1)}%\n\n`;

    message += '⏱️ За весь час:\n';
    message += `  • Всього відвідувань: ${stats.allTime.totalVisits}\n`;

    if (stats.allTime.mostVisited.length > 0) {
      message += '\n🏆 Найчастіше відвідувані:\n';
      stats.allTime.mostVisited.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.zoneId.name} - ${zone.totalVisits} разів\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /stats command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання статистики.');
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🤖 Telegram bot is running...');

