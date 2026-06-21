export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { device_token, device_id, firstName, surname, phone, email, items } = body;
    const effectiveDeviceId = device_id || device_token;

    if (!effectiveDeviceId || !firstName || !surname || !phone || !email || !items) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderDate = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
    let telegramMsg = `New Order From: ${firstName} ${surname} (${phone})\n\n`;

    for (const item of items) {
      await context.env.DB.prepare(
        `INSERT INTO orders (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inbox')`
      ).bind(
        effectiveDeviceId, firstName, surname, phone, email,
        item.fragrance, item.productName, item.volume,
        item.price, item.qty, item.gender, orderDate
      ).run();

      telegramMsg += `[${item.gender === 'female' ? 'F' : 'M'}] ${item.qty}x ${item.fragrance} - ${item.volume} ${item.productName}\n`;
    }

    telegramMsg += `\nTotal: R${items.reduce((sum, i) => sum + (i.qty * i.price), 0)}`;

    const telegramToken = context.env.TELEGRAM_TOKEN;
    const telegramChat = context.env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChat) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: telegramMsg })
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}