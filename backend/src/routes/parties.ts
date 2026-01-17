import express from 'express';
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
      console.warn('TELEGRAM_BOT_TOKEN not configured, skipping notification');
      return;
    }

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
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
router.post('/', requireAuth, async (req: AuthRequest, res) => {
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
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (chatId && creator && zone) {
      const invitedUsers = await User.find({
        _id: { $in: invitedUserIds },
      });

      // Build mentions string
      const mentions = invitedUsers
        .map((user) => (user.username ? `@${user.username}` : `ID:${user.telegramId}`))
        .join(' ');

      // Get character info for each invited user
      const selectedCharacterIds = req.body.selectedCharacterIds || {};
      const characterInfoPromises = invitedUsers.map(async (user) => {
        const characterId = selectedCharacterIds[user._id.toString()];
        if (characterId) {
          const character = await Character.findById(characterId);
          if (character) {
            return `${user.username ? `@${user.username}` : `ID:${user.telegramId}`} (${character.nickname}, ${character.profession}, Lvl ${character.level})`;
          }
        }
        return user.username ? `@${user.username}` : `ID:${user.telegramId}`;
      });

      const characterInfo = await Promise.all(characterInfoPromises);

      // Format time in creator's timezone
      const creatorTimezone = creator.timezone || 'UTC';
      const formattedTime = formatTimeInTimezone(readyTimeDate, creatorTimezone);

      const message = `🎮 <b>Новий збір в інстанс!</b>\n\n` +
        `📍 <b>Інстанс:</b> ${zone.name}\n` +
        `👤 <b>Організатор:</b> ${creator.username ? `@${creator.username}` : `ID:${creator.telegramId}`}\n` +
        `⏰ <b>Час готовності:</b> ${formattedTime} (${creatorTimezone})\n\n` +
        `👥 <b>Запрошені гравці:</b>\n${characterInfo.map((info) => `  • ${info}`).join('\n')}\n\n` +
        `${mentions}`;

      await sendTelegramNotification(Number(chatId), message);
    }

    res.status(201).json(party);
  } catch (error) {
    console.error('Create party error:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// Get all parties for current user
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
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
