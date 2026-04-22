interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
}

export async function sendBookingNotification(booking: {
  clientName: string;
  phone: string;
  service: string;
  master: string;
  date: string;
  time: string;
  comment?: string;
}) {
  const text = `
📅 <b>Новая запись!</b>

👤 Клиент: ${booking.clientName}
📞 Телефон: ${booking.phone}
✂️ Услуга: ${booking.service}
👩‍🎨 Мастер: ${booking.master}
📆 Дата: ${booking.date}
🕐 Время: ${booking.time}
${booking.comment ? `💬 Комментарий: ${booking.comment}` : ''}
  `.trim();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_CHAT_ID.");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  const payload = (await response.json()) as TelegramSendMessageResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? "Telegram API request failed.");
  }
}
