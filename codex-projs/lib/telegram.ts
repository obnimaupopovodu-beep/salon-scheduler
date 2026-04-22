// lib/telegram.ts
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

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

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_GROUP_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}