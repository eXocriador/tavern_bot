import { createBot, setupBotHandlers } from "../src/bot";

let botInstance: any = null;

const getBot = () => {
	if (!botInstance) {
		botInstance = createBot();
		setupBotHandlers(botInstance);
	}
	return botInstance;
};

export default async function handler(req: any, res: any) {
	if (req.method !== "POST") {
		res.status(405).send("Method Not Allowed");
		return;
	}

	const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
	if (
		secretToken &&
		req.headers["x-telegram-bot-api-secret-token"] !== secretToken
	) {
		res.status(401).json({ ok: false });
		return;
	}

	try {
		const bot = getBot();
		await bot.processUpdate(req.body);
		res.status(200).json({ ok: true });
	} catch (error) {
		console.error("Webhook error:", error);
		// Always return 200 to avoid Telegram retry storms
		res.status(200).json({ ok: false });
	}
}

export const config = {
	api: {
		bodyParser: true,
	},
};
