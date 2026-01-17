import dotenv from "dotenv";
import { createBot, setupBotHandlers } from "./bot";

dotenv.config();

const bot = createBot({ polling: true });
setupBotHandlers(bot);

// Error handling
bot.on("polling_error", (error) => {
	console.error("Polling error:", error);
});

console.log("🤖 Telegram bot is running...");
