const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;

if (!botToken || !chatId) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_CHAT_ID.");
  process.exit(1);
}

const text = `
📅 <b>Тест Telegram-уведомления</b>

👤 Клиент: Тестовый клиент
📞 Телефон: +79990000000
✂️ Услуга: Проверка уведомлений
👩‍🎨 Мастер: Тестовый мастер
📆 Дата: 22.04.2026
🕐 Время: 12:00
💬 Комментарий: Сообщение отправлено из отдельного тестового скрипта
`.trim();

const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  })
});

const payload = await response.json();

if (!response.ok || !payload.ok) {
  console.error("Telegram send failed.");
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log("Telegram send succeeded.");
console.log(JSON.stringify(payload.result, null, 2));
