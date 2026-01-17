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
👋 Привет! Я Tavern Bot - помощник для отслеживания инстанс-зон Lineage 2.

📋 Основные команды:
/iz - Мой статус инстансов (доступные и пройденные)
/visit <название> - Отметить посещение
/remove <название> - Удалить посещение
/stats - Моя статистика
/profile - Мой профиль
/level <число> - Обновить уровень
/reset - Когда следующий ресет
/global - Глобальная статистика
/top - Топ игроков
/chatid - Получить ID чата (для настройки)
/help - Полный список команд

💡 Пример: /visit Zaken (Daytime)
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// Help command
bot.onText(/\/help/, async msg => {
  const chatId = msg.chat.id;
  const helpMessage = `
📚 Полный список команд:

📊 Статус и посещения:
/iz - Показать мой статус (закрытые и доступные инстансы)
/visit <название> - Отметить посещение зоны
/remove <название> - Удалить посещение зоны
/zone <название> - Подробная информация о зоне

📈 Статистика:
/stats - Моя статистика
/global - Глобальная статистика
/top - Топ 10 игроков

👤 Профиль:
/profile - Просмотреть/обновить профиль
/level <1-100> - Обновить уровень персонажа

⏰ Информация:
/reset - Когда следующий ресет инстансов
/chatid - Получить ID чата (для настройки)
/help - Этот список команд

💡 Примеры:
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
bot.onText(/\/iz/, async msg => {
  const chatId = msg.chat.id;

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Ошибка идентификации пользователя.');
      return;
    }

    // Ensure user exists
    if (msg.from) {
      await ensureUserExists(
        msg.from.id,
        msg.from.username,
        msg.from.first_name,
        msg.from.last_name
      );
    }

    const visits = await apiRequest('GET', `/bot/visits/${telegramId}`);
    const instances = await apiRequest('GET', '/instances');

    const visitedZoneIds = new Set(visits.map((v: any) => v.zoneId?.zoneId).filter(Boolean));

    let message = '📊 <b>Статус инстанс-зон:</b>\n\n';
    message += '✅ <b>Пройденные зоны:</b>\n';

    const visited = instances.filter((inst: any) => visitedZoneIds.has(inst.zoneId));
    if (visited.length === 0) {
      message += '  Нет пройденных зон\n';
    } else {
      visited.forEach((inst: any) => {
        message += `  • ${inst.name}\n`;
      });
    }

    message += '\n🔓 <b>Доступные зоны:</b>\n';
    const available = instances.filter((inst: any) => !visitedZoneIds.has(inst.zoneId));
    if (available.length === 0) {
      message += '  Все зоны пройдены! 🎉\n';
    } else {
      available.forEach((inst: any) => {
        message += `  • ${inst.name}\n`;
      });
    }

    const totalInstances = instances.length;
    const visitedCount = visited.length;
    const progressPercent = totalInstances > 0 ? Math.round((visitedCount / totalInstances) * 100) : 0;
    message += `\n📈 <b>Прогресс:</b> ${visitedCount}/${totalInstances} (${progressPercent}%)`;

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Error in /iz command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения статуса. Попробуйте позже.');
  }
});

// /chatid command - get chat ID (useful for configuration)
bot.onText(/\/chatid/, async msg => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'

  let message = `🆔 <b>Chat ID:</b> <code>${chatId}</code>\n`;
  message += `📋 <b>Тип чата:</b> ${chatType}\n`;

  if (msg.chat.title) {
    message += `📝 <b>Название:</b> ${msg.chat.title}\n`;
  }

  message += `\n💡 Добавьте этот ID в переменную окружения <code>TELEGRAM_CHAT_ID</code> в backend/.env`;

  bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// /visit command - mark visit
bot.onText(/\/visit\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Укажите название зоны. Пример: /visit Zaken (Daytime)');
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
        `❌ Зона "${zoneName}" не найдена. Используйте /iz чтобы увидеть список доступных зон.`
      );
      return;
    }

    // Ensure user exists in database
    try {
      // Try to mark visit via bot endpoint
      await apiRequest('POST', `/bot/visits/${msg.from?.id}/${zone.zoneId}`);
      bot.sendMessage(chatId, `✅ Отмечено посещение: ${zone.name}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        bot.sendMessage(
          chatId,
          `❌ Пользователь не найден. Пожалуйста, сначала войдите через веб-приложение для регистрации.`
        );
      } else {
        const errorMsg = error.response?.data?.error || 'Ошибка отметки посещения';
        bot.sendMessage(chatId, `❌ ${errorMsg}`);
      }
    }
  } catch (error: any) {
    console.error('Error in /visit command:', error);
    bot.sendMessage(chatId, '❌ Ошибка отметки посещения.');
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
    message += `👤 Игрок: ${stats.user?.characterName || stats.user?.username || 'Не указано'}\n\n`;

    message += '📅 Текущий период:\n';
    message += `  • Пройдено: ${stats.currentPeriod.visited} зон\n`;
    message += `  • Доступно: ${stats.currentPeriod.available} зон\n`;
    message += `  • Прогресс: ${stats.currentPeriod.completionRate.toFixed(1)}%\n\n`;

    message += '⏱️ За всё время:\n';
    message += `  • Всего посещений: ${stats.allTime.totalVisits}\n`;

    if (stats.allTime.mostVisited.length > 0) {
      message += '\n🏆 Наиболее посещаемые:\n';
      stats.allTime.mostVisited.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.zoneId.name} - ${zone.totalVisits} раз\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /stats command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения статистики.');
  }
});

// /remove command - remove visit
bot.onText(/\/remove\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Укажите название зоны. Пример: /remove Zaken (Daytime)');
    return;
  }

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Ошибка идентификации пользователя.');
      return;
    }

    const instances = await apiRequest('GET', '/instances');
    const zone = instances.find((inst: any) =>
      inst.name.toLowerCase().includes(zoneName.toLowerCase())
    );

    if (!zone) {
      bot.sendMessage(
        chatId,
        `❌ Зона "${zoneName}" не найдена. Используйте /iz чтобы увидеть список доступных зон.`
      );
      return;
    }

    await apiRequest('DELETE', `/bot/visits/${telegramId}/${zone.zoneId}`);
    bot.sendMessage(chatId, `✅ Удалено посещение: ${zone.name}`);
  } catch (error: any) {
    console.error('Error in /remove command:', error);
    const errorMsg = error.response?.data?.error || 'Ошибка удаления посещения';
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

    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayName = dayNames[nextReset.getDay()];

    let message = '⏰ Следующий ресет инстансов:\n\n';
    message += `📅 ${dayName}, ${nextReset.toLocaleDateString('ru-RU')} в 10:00 (Киев)\n\n`;

    if (diffHours > 0) {
      message += `⏳ Осталось: ${diffHours} ч. ${diffMinutes} мин.`;
    } else if (diffMinutes > 0) {
      message += `⏳ Осталось: ${diffMinutes} мин.`;
    } else {
      message += '🔄 Ресет происходит сейчас!';
    }

    message += '\n\n💡 Ресет происходит каждый понедельник и среду в 10:00 утра по Киеву.';

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /reset command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения информации о ресете.');
  }
});

// /profile command - show and update profile
bot.onText(/\/profile/, async msg => {
  const chatId = msg.chat.id;

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Ошибка идентификации пользователя.');
      return;
    }

    await ensureUserExists(
      telegramId,
      msg.from?.username,
      msg.from?.first_name,
      msg.from?.last_name
    );

    const user = await apiRequest('GET', `/bot/user/${telegramId}`);

    let message = '👤 Ваш профиль:\n\n';
    message += `🆔 Telegram ID: ${user.telegramId}\n`;
    if (user.username) message += `👤 Username: @${user.username}\n`;
    if (user.firstName || user.lastName) {
      message += `📝 Имя: ${user.firstName || ''} ${user.lastName || ''}\n`;
    }
    if (user.characterName) {
      message += `🎮 Персонаж: ${user.characterName}\n`;
    } else {
      message += `🎮 Персонаж: Не указано\n`;
    }
    if (user.characterLevel) {
      message += `📊 Уровень: ${user.characterLevel}\n`;
    } else {
      message += `📊 Уровень: Не указано\n`;
    }

    message += '\n💡 Для обновления профиля используйте веб-приложение или команды:\n';
    message += '/level <число> - обновить уровень';

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /profile command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения профиля.');
  }
});

// /level command - update character level
bot.onText(/\/level\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const level = parseInt(match?.[1] || '0');

  if (level < 1 || level > 100) {
    bot.sendMessage(chatId, '❌ Уровень должен быть от 1 до 100.');
    return;
  }

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Ошибка идентификации пользователя.');
      return;
    }

    await apiRequest('PUT', `/bot/user/${telegramId}/level`, { level });
    bot.sendMessage(chatId, `✅ Уровень обновлен: ${level}`);
  } catch (error: any) {
    console.error('Error in /level command:', error);
    bot.sendMessage(chatId, '❌ Ошибка обновления уровня.');
  }
});

// /global command - global statistics
bot.onText(/\/global/, async msg => {
  const chatId = msg.chat.id;

  try {
    const stats = await apiRequest('GET', '/statistics/global');

    let message = '🌍 Глобальная статистика:\n\n';

    message += '📅 Текущий период:\n';
    message += `  • Всего посещений: ${stats.currentPeriod.totalVisits}\n`;
    message += `  • Активных игроков: ${stats.currentPeriod.activeUsers}\n`;
    message += `  • Всего пользователей: ${stats.currentPeriod.totalUsers}\n`;
    message += `  • Среднее посещений: ${stats.currentPeriod.averageVisitsPerUser.toFixed(1)}\n\n`;

    if (stats.currentPeriod.zonePopularity.length > 0) {
      message += '🔥 Наиболее популярные зоны:\n';
      stats.currentPeriod.zonePopularity.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.name} - ${zone.visits} посещений\n`;
      });
      message += '\n';
    }

    message += '⏱️ За всё время:\n';
    message += `  • Всего посещений: ${stats.allTime.totalVisits}\n`;

    if (stats.allTime.mostPopularZones.length > 0) {
      message += '\n🏆 Наиболее популярные зоны (за всё время):\n';
      stats.allTime.mostPopularZones.slice(0, 5).forEach((zone: any, index: number) => {
        message += `  ${index + 1}. ${zone.name} - ${zone.visits} посещений\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /global command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения глобальной статистики.');
  }
});

// /top command - top players
bot.onText(/\/top/, async msg => {
  const chatId = msg.chat.id;

  try {
    const topPlayers = await apiRequest('GET', '/bot/top-players');

    if (!topPlayers || topPlayers.length === 0) {
      bot.sendMessage(chatId, '📊 Пока нет данных для топа игроков.');
      return;
    }

    let message = '🏆 Топ 10 игроков:\n\n';

    topPlayers.forEach((player: any, index: number) => {
      const name = player.characterName || player.username || `ID: ${player.telegramId}`;
      const level = player.characterLevel ? ` (Lv.${player.characterLevel})` : '';
      message += `${index + 1}. ${name}${level} - ${player.totalVisits} посещений\n`;
    });

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /top command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения топа игроков.');
  }
});

// /zone command - zone details
bot.onText(/\/zone\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const zoneName = match?.[1]?.trim();

  if (!zoneName) {
    bot.sendMessage(chatId, '❌ Укажите название зоны. Пример: /zone Zaken (Daytime)');
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
        `❌ Зона "${zoneName}" не найдена. Используйте /iz чтобы увидеть список доступных зон.`
      );
      return;
    }

    const zoneStats = await apiRequest('GET', `/statistics/zone/${zone.zoneId}`);

    let message = `📍 ${zone.name}\n\n`;
    if (zone.bossName) message += `👹 Босс: ${zone.bossName}\n`;
    if (zone.level) message += `📊 Уровень: ${zone.level}+\n`;
    if (zone.description) message += `📝 ${zone.description}\n`;

    message += '\n📈 Статистика:\n';
    message += `  • Текущий период: ${zoneStats.currentPeriod?.visits || 0} посещений\n`;
    message += `  • За всё время: ${zoneStats.allTime?.totalVisits || 0} посещений\n`;

    if (zoneStats.allTime?.topVisitors && zoneStats.allTime.topVisitors.length > 0) {
      message += '\n👥 Наиболее активные игроки:\n';
      zoneStats.allTime.topVisitors.slice(0, 5).forEach((user: any, index: number) => {
        const name = user.characterName || user.username || `ID: ${user.telegramId}`;
        message += `  ${index + 1}. ${name} - ${user.totalVisits} раз\n`;
      });
    }

    bot.sendMessage(chatId, message);
  } catch (error: any) {
    console.error('Error in /zone command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения информации о зоне.');
  }
});

// Error handling
bot.on('polling_error', error => {
  console.error('Polling error:', error);
});

console.log('🤖 Telegram bot is running...');
