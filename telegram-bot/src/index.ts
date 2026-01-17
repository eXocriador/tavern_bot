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

// Set menu button to open web app
const webAppUrl = process.env.WEB_APP_URL || 'https://bzaken.exocriador.dev';
bot
  .setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Открыть',
      web_app: {
        url: webAppUrl,
      },
    },
  })
  .catch(error => {
    console.error('Error setting menu button:', error);
  });

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

// Helper function to get next reset date (kept for future use)
// const getNextResetDate = (): Date => { ... }

// Start command
bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  const webAppUrl = process.env.WEB_APP_URL || 'https://bzaken.exocriador.dev';
  const welcomeMessage = `
👋 Привет! Я Tavern Bot - помощник для отслеживания инстанс-зон Lineage 2.

📋 Основные команды:
/iz - Мой статус инстансов (доступные и пройденные)
/profile - Мой профиль
/lvl <число> - Обновить уровень персонажа
/help - Полный список команд
  `;

  bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🌐 Открыть веб-приложение',
            web_app: { url: webAppUrl },
          },
        ],
      ],
    },
  });
});

// Help command
bot.onText(/\/help/, async msg => {
  const chatId = msg.chat.id;
  const helpMessage = `
📚 Полный список команд:

📊 Статус:
/iz - Показать мой статус (закрытые и доступные инстансы)

👤 Профиль:
/profile - Просмотреть профиль
/lvl <1-100> - Обновить уровень персонажа

💡 Примеры:
/lvl 85
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
    const progressPercent =
      totalInstances > 0 ? Math.round((visitedCount / totalInstances) * 100) : 0;
    message += `\n📈 <b>Прогресс:</b> ${visitedCount}/${totalInstances} (${progressPercent}%)`;

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Error in /iz command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения статуса. Попробуйте позже.');
  }
});

// Removed commands (can be added later if needed):
// /chatid, /visit, /remove, /stats, /reset, /global, /top, /zone

// /id command - get Telegram ID with copy button
bot.onText(/\/id/, async msg => {
  const chatId = msg.chat.id;

  try {
    const telegramId = msg.from?.id;
    if (!telegramId) {
      bot.sendMessage(chatId, '❌ Ошибка идентификации пользователя.');
      return;
    }

    const message = `🆔 Ваш Telegram ID:\n\n\`${telegramId}\`\n\n💡 Нажмите на ID выше, чтобы скопировать его.`;

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 Копировать ID',
              callback_data: `copy_id_${telegramId}`,
            },
          ],
        ],
      },
    });
  } catch (error: any) {
    console.error('Error in /id command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения ID.');
  }
});

// Handle copy ID callback
bot.on('callback_query', async query => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (data?.startsWith('copy_id_')) {
    const telegramId = data.replace('copy_id_', '');
    await bot.answerCallbackQuery(query.id, {
      text: `ID ${telegramId} скопирован!`,
      show_alert: false,
    });
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
    message += `🆔 Telegram ID: \`${user.telegramId}\`\n`;
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

    message += '\n💡 Для обновления профиля используйте веб-приложение или команду:\n';
    message += '/lvl <число> - обновить уровень\n';
    message += '/id - получить ваш Telegram ID';

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 Копировать ID',
              callback_data: `copy_id_${telegramId}`,
            },
          ],
        ],
      },
    });
  } catch (error: any) {
    console.error('Error in /profile command:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения профиля.');
  }
});

// /lvl command - update character level
bot.onText(/\/lvl\s+(\d+)/, async (msg, match) => {
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
    console.error('Error in /lvl command:', error);
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
