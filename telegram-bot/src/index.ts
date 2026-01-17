import axios from 'axios';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

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

// Helper function to get next reset date
const getNextResetDate = (): Date => {
  const now = new Date();
  const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
  const currentDay = kyivTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = kyivTime.getHours();

  // Reset happens on Monday and Wednesday at 10:00 AM Kyiv time
  let daysUntilReset = 0;

  if (currentDay === 0) {
    // Sunday -> Monday (1 day)
    daysUntilReset = 1;
  } else if (currentDay === 1) {
    // Monday
    if (currentHour < 10) {
      // Before 10 AM -> today
      daysUntilReset = 0;
    } else {
      // After 10 AM -> Wednesday (2 days)
      daysUntilReset = 2;
    }
  } else if (currentDay === 2) {
    // Tuesday -> Wednesday (1 day)
    daysUntilReset = 1;
  } else if (currentDay === 3) {
    // Wednesday
    if (currentHour < 10) {
      // Before 10 AM -> today
      daysUntilReset = 0;
    } else {
      // After 10 AM -> Monday (5 days)
      daysUntilReset = 5;
    }
  } else {
    // Thursday-Saturday -> Monday
    daysUntilReset = (8 - currentDay) % 7;
  }

  const resetDate = new Date(kyivTime);
  resetDate.setDate(kyivTime.getDate() + daysUntilReset);
  resetDate.setHours(10, 0, 0, 0);

  return resetDate;
};

// Start command
bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
👋 Вітаю! Я Tavern Bot - помічник для відстеження інстанс-зон Lineage 2.

📋 Основні команди:
/iz - Мій статус інстансів
/visit <назва> - Відмітити відвідування
/remove <назва> - Видалити відвідування
/stats - Моя статистика
/profile - Мій профіль
/level <число> - Оновити рівень
/reset - Коли наступний ресет
/global - Глобальна статистика
/top - Топ гравців
/help - Повний список команд

💡 Приклад: /visit Zaken (Daytime)
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// Help command
bot.onText(/\/help/, async msg => {
  const chatId = msg.chat.id;
  const helpMessage = `
📚 Повний список команд:

📊 Статус та відвідування:
/iz - Показати мій статус (закриті та доступні інстанси)
/visit <назва> - Відмітити відвідування зони
/remove <назва> - Видалити відвідування зони
/zone <назва> - Детальна інформація про зону

📈 Статистика:
/stats - Моя статистика
/global - Глобальна статистика
/top - Топ 10 гравців

👤 Профіль:
/profile - Переглянути/оновити профіль
/level <1-100> - Оновити рівень персонажа

⏰ Інформація:
/reset - Коли наступний ресет інстансів
/help - Цей список команд

💡 Приклади:
/visit Zaken (Daytime)
/remove Zaken (Daytime)
/level 85
/zone Zaken (Daytime)
  `;

  bot.sendMessage(chatId, helpMessage);
});

// Helper function to ensure user exists
const ensureUserExists = async (
  telegramId: number,
  username?: string,
  firstName?: string,
  lastName?: string
) => {
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
bot.onText(/\/iz(?:\s+@(\w+))?/, async msg => {
  const chatId = msg.chat.id;

  try {
    const telegramId = msg.from?.id;

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
bot.onText(/\/stats(?:\s+@(\w+))?/, async msg => {
  const chatId = msg.chat.id;

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

// /remove command - remove visit
bot.onText(/\/remove\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Вкажіть назву зони. Приклад: /remove Zaken (Daytime)');
    return;
  }

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Помилка ідентифікації користувача.');
      return;
    }

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

    await apiRequest('DELETE', `/bot/visits/${telegramId}/${zone.zoneId}`);
    bot.sendMessage(chatId, `✅ Видалено відвідування: ${zone.name}`);
  } catch (error: any) {
    console.error('Error in /remove command:', error);
    const errorMsg = error.response?.data?.error || 'Помилка видалення відвідування';
    bot.sendMessage(chatId, `❌ ${errorMsg}`);
  }
});

// /reset command - show next reset date
bot.onText(/\/reset/, async msg => {
  const chatId = msg.chat.id;

  try {
    const nextReset = getNextResetDate();
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const diffMs = nextReset.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    const dayName = dayNames[nextReset.getDay()];

    let message = '⏰ Наступний ресет інстансів:\n\n';
    message += `📅 ${dayName}, ${nextReset.toLocaleDateString('uk-UA')} о 10:00 (Київ)\n\n`;

    if (diffHours > 0) {
      message += `⏳ Залишилось: ${diffHours} год. ${diffMinutes} хв.`;
    } else if (diffMinutes > 0) {
      message += `⏳ Залишилось: ${diffMinutes} хв.`;
    } else {
      message += '🔄 Ресет відбувається зараз!';
    }

    message += '\n\n💡 Ресет відбувається щопонеділка та щосереди о 10:00 ранку за Києвом.';

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /reset command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання інформації про ресет.');
  }
});

// /profile command - show and update profile
bot.onText(/\/profile/, async msg => {
  const chatId = msg.chat.id;

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Помилка ідентифікації користувача.');
      return;
    }

    await ensureUserExists(
      telegramId,
      msg.from?.username,
      msg.from?.first_name,
      msg.from?.last_name
    );

    const user = await apiRequest('GET', `/bot/user/${telegramId}`);

    let message = '👤 Ваш профіль:\n\n';
    message += `🆔 Telegram ID: ${user.telegramId}\n`;
    if (user.username) message += `👤 Username: @${user.username}\n`;
    if (user.firstName || user.lastName) {
      message += `📝 Ім'я: ${user.firstName || ''} ${user.lastName || ''}\n`;
    }
    if (user.characterName) {
      message += `🎮 Персонаж: ${user.characterName}\n`;
    } else {
      message += `🎮 Персонаж: Не вказано\n`;
    }
    if (user.characterLevel) {
      message += `📊 Рівень: ${user.characterLevel}\n`;
    } else {
      message += `📊 Рівень: Не вказано\n`;
    }

    message += '\n💡 Для оновлення профілю використайте веб-додаток або команди:\n';
    message += '/level <число> - оновити рівень';

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /profile command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання профілю.');
  }
});

// /level command - update character level
bot.onText(/\/level\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const level = parseInt(match?.[1] || '0');

  if (level < 1 || level > 100) {
    bot.sendMessage(chatId, '❌ Рівень повинен бути від 1 до 100.');
    return;
  }

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Помилка ідентифікації користувача.');
      return;
    }

    await apiRequest('PUT', `/bot/user/${telegramId}/level`, { level });
    bot.sendMessage(chatId, `✅ Рівень оновлено: ${level}`);
  } catch (error: any) {
    console.error('Error in /level command:', error);
    bot.sendMessage(chatId, '❌ Помилка оновлення рівня.');
  }
});

// /global command - global statistics
bot.onText(/\/global/, async msg => {
  const chatId = msg.chat.id;

  try {
    const stats = await apiRequest('GET', '/statistics/global');

    let message = '🌍 Глобальна статистика:\n\n';

    message += '📅 Поточний період:\n';
    message += `  • Всього відвідувань: ${stats.currentPeriod.totalVisits}\n`;
    message += `  • Активних гравців: ${stats.currentPeriod.activeUsers}\n`;
    message += `  • Всього користувачів: ${stats.currentPeriod.totalUsers}\n`;
    message += `  • Середнє відвідувань: ${stats.currentPeriod.averageVisitsPerUser.toFixed(1)}\n\n`;

    if (stats.currentPeriod.zonePopularity.length > 0) {
      message += '🔥 Найпопулярніші зони:\n';
      stats.currentPeriod.zonePopularity.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.name} - ${zone.visits} відвідувань\n`;
      });
      message += '\n';
    }

    message += '⏱️ За весь час:\n';
    message += `  • Всього відвідувань: ${stats.allTime.totalVisits}\n`;

    if (stats.allTime.mostPopularZones.length > 0) {
      message += '\n🏆 Найпопулярніші зони (за весь час):\n';
      stats.allTime.mostPopularZones.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.name} - ${zone.visits} відвідувань\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /global command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання глобальної статистики.');
  }
});

// /top command - top players
bot.onText(/\/top/, async msg => {
  const chatId = msg.chat.id;

  try {
    const topPlayers = await apiRequest('GET', '/bot/top-players');

    if (!topPlayers || topPlayers.length === 0) {
      bot.sendMessage(chatId, '📊 Поки що немає даних для топу гравців.');
      return;
    }

    let message = '🏆 Топ 10 гравців:\n\n';

    topPlayers.forEach((player: any, index: number) => {
      const name = player.characterName || player.username || `ID: ${player.telegramId}`;
      const level = player.characterLevel ? ` (Lv.${player.characterLevel})` : '';
      message += `${index + 1}. ${name}${level} - ${player.totalVisits} відвідувань\n`;
    });

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /top command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання топу гравців.');
  }
});

// /zone command - zone details
bot.onText(/\/zone\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Вкажіть назву зони. Приклад: /zone Zaken (Daytime)');
    return;
  }

  try {
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

    const zoneStats = await apiRequest('GET', `/statistics/zone/${zone.zoneId}`);

    let message = `📍 ${zone.name}\n\n`;
    if (zone.bossName) message += `👹 Бос: ${zone.bossName}\n`;
    if (zone.level) message += `📊 Рівень: ${zone.level}+\n`;
    if (zone.description) message += `📝 ${zone.description}\n`;

    message += '\n📈 Статистика:\n';
    message += `  • Поточний період: ${zoneStats.currentPeriod?.visits || 0} відвідувань\n`;
    message += `  • За весь час: ${zoneStats.allTime?.totalVisits || 0} відвідувань\n`;

    if (zoneStats.allTime?.topVisitors && zoneStats.allTime.topVisitors.length > 0) {
      message += '\n👥 Найактивніші гравці:\n';
      zoneStats.allTime.topVisitors.slice(0, 5).forEach((user: any, index: number) => {
        const name = user.characterName || user.username || `ID: ${user.telegramId}`;
        message += `  ${index + 1}. ${name} - ${user.totalVisits} разів\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /zone command:', error);
    bot.sendMessage(chatId, '❌ Помилка отримання інформації про зону.');
  }
});

// Error handling
bot.on('polling_error', error => {
  console.error('Polling error:', error);
});

console.log('🤖 Telegram bot is running...');
