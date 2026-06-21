export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { device_id, firstName, surname, phone, email, items, bundles } = body;

    if (!device_id || !firstName || !surname || !phone || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const hasItems = items && items.length > 0;
    const hasBundles = bundles && bundles.length > 0;

    if (!hasItems && !hasBundles) {
      return new Response(JSON.stringify({ error: 'No items or bundles provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderDate = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

    let telegramMsg = `🛍️ New Order From: ${firstName} ${surname}\n`;
    telegramMsg += `📞 ${phone} | ✉️ ${email}\n\n`;

    let grandTotal = 0;

    if (hasItems) {
      telegramMsg += `── INDIVIDUAL ITEMS ──\n`;
      let itemsTotal = 0;

      for (const item of items) {
        await context.env.DB.prepare(
          `INSERT INTO orders (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status, bundle_id, bundle_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inbox', '', '')`
        ).bind(
          device_id, firstName, surname, phone, email,
          item.fragrance, item.productName, item.volume,
          item.price, item.qty, item.gender, orderDate
        ).run();

        const lineTotal = item.qty * item.price;
        itemsTotal += lineTotal;
        telegramMsg += `[${item.gender === 'female' ? 'F' : 'M'}] ${item.qty}x ${item.fragrance} - ${item.volume} ${item.productName}\n`;
      }

      grandTotal += itemsTotal;
      telegramMsg += `Items Total: R${itemsTotal}\n\n`;
    }

    if (hasBundles) {
      telegramMsg += `── BUNDLES ──\n`;

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