import express, { Response } from 'express';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Party from '../models/Party';
import InstanceZone from '../models/InstanceZone';
import User from '../models/User';
import Character from '../models/Character';

const router = express.Router();

// Helper function to send Telegram notification
const sendTelegramNotification = async (
  chatId: number,
  message: string
): Promise<void> => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('⚠️  TELEGRAM_BOT_TOKEN not configured, skipping notification');
      return;
    }

    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });

    console.log('✅ Telegram API response:', response.data.ok ? 'SUCCESS' : 'FAILED');
    if (!response.data.ok) {
      console.error('❌ Telegram API error:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Error sending Telegram notification:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('  No response received:', error.message);
    } else {
      console.error('  Error:', error.message);
    }
    throw error; // Re-throw to allow caller to handle
  }
};

// Helper function to format time in user's timezone
const formatTimeInTimezone = (date: Date, timezone: string = 'UTC'): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

// Create a new party
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { zoneId, readyTime, invitedUserIds } = req.body;

    if (!zoneId || !readyTime || !invitedUserIds || !Array.isArray(invitedUserIds)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const zone = await InstanceZone.findOne({ zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Instance zone not found' });
    }

    const party = new Party({
      creatorId: req.user!._id,
      zoneId: zone._id,
      readyTime: new Date(readyTime),
      invitedUserIds,
      status: 'pending',
    });

    await party.save();
    await party.populate('zoneId', 'zoneId name');
    await party.populate('creatorId', 'telegramId username');
    await party.populate('invitedUserIds', 'telegramId username');

    // Send Telegram notifications to invited users
    const creator = await User.findById(req.user!._id);
    const readyTimeDate = new Date(readyTime);

    // Get chat ID from environment or use a default group chat
    const chatIdStr = process.env.TELEGRAM_CHAT_ID;
    const chatId = chatIdStr ? Number(chatIdStr) : null;

    console.log('📢 Party creation notification check:');
    console.log('  - TELEGRAM_CHAT_ID (raw):', chatIdStr || 'NOT SET');
    console.log('  - TELEGRAM_CHAT_ID (parsed):', chatId);
    console.log('  - Creator:', creator ? `${creator.username || creator.telegramId}` : 'NOT FOUND');
    console.log('  - Zone:', zone ? zone.name : 'NOT FOUND');
    console.log('  - Invited users count:', invitedUserIds.length);

    if (!chatIdStr) {
      console.warn('⚠️  TELEGRAM_CHAT_ID not configured. Skipping notification.');
      console.warn('💡 To get chat ID, send /chatid command to the bot in your group');
    } else if (!chatId || isNaN(chatId)) {
      console.error('❌ Invalid TELEGRAM_CHAT_ID format. Must be a number.');
      console.error('   Current value:', chatIdStr);
    } else if (!creator) {
      console.warn('⚠️  Creator not found. Skipping notification.');
    } else if (!zone) {
      console.warn('⚠️  Zone not found. Skipping notification.');
    } else {
      try {
        const invitedUsers = await User.find({
          _id: { $in: invitedUserIds },
        });

        console.log('  - Found invited users:', invitedUsers.length);

        // Build mentions string
        const mentions = invitedUsers
          .map((user) => (user.username ? `@${user.username}` : `ID:${user.telegramId}`))
          .join(' ');

        // Get nickname info for each invited user
        const selectedNicknames = req.body.selectedNicknames || {};
        console.log('  - Selected nicknames:', selectedNicknames);

        const characterInfo = invitedUsers.map((user) => {
          const nickname = selectedNicknames[user._id.toString()];
          if (nickname) {
            return `${user.username ? `@${user.username}` : `ID:${user.telegramId}`} (${nickname})`;
          }
          return user.username ? `@${user.username}` : `ID:${user.telegramId}`;
        });

        // Format time in creator's timezone
        const creatorTimezone = creator.timezone || 'UTC';
        const formattedTime = formatTimeInTimezone(readyTimeDate, creatorTimezone);

      const message = `🎮 <b>Новый сбор в инстанс!</b>\n\n` +
        `📍 <b>Инстанс:</b> ${zone.name}\n` +
        `👤 <b>Организатор:</b> ${creator.username ? `@${creator.username}` : `ID:${creator.telegramId}`}\n` +
        `⏰ <b>Время готовности:</b> ${formattedTime} (${creatorTimezone})\n\n` +
        `👥 <b>Приглашенные игроки:</b>\n${characterInfo.map((info) => `  • ${info}`).join('\n')}\n\n` +
        `${mentions}`;

        console.log('📤 Sending Telegram notification to chat:', chatId);
        console.log('📝 Message preview:', message.substring(0, 100) + '...');

        await sendTelegramNotification(chatId, message);
        console.log('✅ Telegram notification sent successfully');
      } catch (error) {
        console.error('❌ Error sending Telegram notification:', error);
      }
    }

    res.status(201).json(party);
  } catch (error) {
    console.error('Create party error:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// Get all parties for current user
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parties = await Party.find({
      $or: [
        { creatorId: req.user!._id },
        { invitedUserIds: req.user!._id },
      ],
    })
      .populate('zoneId', 'zoneId name')
      .populate('creatorId', 'telegramId username')
      .populate('invitedUserIds', 'telegramId username')
      .sort({ createdAt: -1 });

    res.json(parties);
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

export default router;
