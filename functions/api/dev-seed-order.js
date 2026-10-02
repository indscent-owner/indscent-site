export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      return new Response(JSON.stringify({ error: 'Local testing only.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const deviceId = url.searchParams.get('device_id') || 'local-demo-device';
    const createdAt = url.searchParams.get('date') || new Date().toISOString();
    const productName = url.searchParams.get('product') || 'Standard Perfume';
    const fragranceName = url.searchParams.get('fragrance') || 'Sample Fragrance';
    const volume = url.searchParams.get('volume') || '50ml';
    const price = Number(url.searchParams.get('price') || '150');
    const quantity = Number(url.searchParams.get('qty') || '1');
    const gender = url.searchParams.get('gender') || 'female';

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        name TEXT,
        surname TEXT,
        contact TEXT,
        email TEXT,
        fragrance_name TEXT,
        product_name TEXT,
        volume TEXT,
        price INTEGER,
        quantity INTEGER,
        gender TEXT,
        order_date TEXT,
        status TEXT,
        bundle_id TEXT,
        bundle_name TEXT,
        delivered INTEGER DEFAULT 0
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS deleted_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_id INTEGER,
        device_id TEXT,
        name TEXT,
        surname TEXT,
        contact TEXT,
        email TEXT,
        fragrance_name TEXT,
        product_name TEXT,
        volume TEXT,
        price INTEGER,
        quantity INTEGER,
        gender TEXT,
        order_date TEXT
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS archived_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        device_id TEXT,
        name TEXT,
        surname TEXT,
        contact TEXT,
        email TEXT,
        fragrance_name TEXT,
        product_name TEXT,
        volume TEXT,
        price INTEGER,
        quantity INTEGER,
        gender TEXT,
        order_date TEXT,
        archived_date TEXT,
        supplier_invoice TEXT,
        delivered INTEGER DEFAULT 0
      )
    `).run();

    const result = await env.DB.prepare(`
      INSERT INTO orders
      (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status)
      VALUES (?, 'Demo', 'User', '0000000000', 'demo@local.test', ?, ?, ?, ?, ?, ?, ?, 'Inbox')
    `).bind(deviceId, fragranceName, productName, volume, price, quantity, gender, createdAt).run();

    return new Response(JSON.stringify({
      success: true,
      inserted: result,
      device_id: deviceId,
      order: {
        fragrance_name: fragranceName,
        product_name: productName,
        volume,
        price,
        quantity,
        gender,
        status: 'Inbox'
      }
    }), {
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
