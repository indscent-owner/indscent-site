export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { device_id, firstName, surname, phone, email, bundles } = body;

    if (!device_id || !firstName || !surname || !phone || !email || !bundles || !bundles.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderDate = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
    let telegramMsg = `🛍️ Bundle Order From: ${firstName} ${surname}\n📞 ${phone} | ✉️ ${email}\n\n`;
    let grandTotal = 0;

    for (const bundle of bundles) {
      telegramMsg += `📦 ${bundle.bundle_name} [${bundle.bundle_id}] - R${bundle.price}\n`;

      for (const item of bundle.items) {
        await context.env.DB.prepare(
          `INSERT INTO orders (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status, bundle_id, bundle_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inbox', ?, ?)`
        ).bind(
          device_id, firstName, surname, phone, email,
          item.fragrance, item.product_type, '',
          0, 1, (item.gender === 'F' ? 'female' : 'male'), orderDate,
          bundle.bundle_id, bundle.bundle_name
        ).run();

        telegramMsg += `  [${item.gender}] ${item.product_type} - ${item.fragrance}\n`;
      }

      await context.env.DB.prepare(
        `INSERT INTO orders (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status, bundle_id, bundle_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inbox', ?, ?)`
      ).bind(
        device_id, firstName, surname, phone, email,
        'BUNDLE_TOTAL', bundle.bundle_name, '',
        bundle.price, 1, '', orderDate,
        bundle.bundle_id, bundle.bundle_name
      ).run();

      grandTotal += bundle.price;
      telegramMsg += '\n';
    }

    telegramMsg += `💰 Grand Total: R${grandTotal}`;

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