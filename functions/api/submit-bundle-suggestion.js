export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const action = body.action || 'submit';

    await context.env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS bundle_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        selected_products TEXT,
        comment TEXT,
        created_at TEXT,
        resolved INTEGER DEFAULT 0
      )`
    ).run();

    if (action === 'resolve') {
      const id = parseInt(body.id, 10);
      if (!id) {
        return new Response(JSON.stringify({ error: 'Invalid suggestion id.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await context.env.DB.prepare(`UPDATE bundle_suggestions SET resolved = 1 WHERE id = ?`).bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'clear') {
      await context.env.DB.prepare(`DELETE FROM bundle_suggestions`).run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const products = Array.isArray(body.products) ? body.products : [];
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (products.length < 2) {
      return new Response(JSON.stringify({ error: 'Please choose at least 2 products.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await context.env.DB.prepare(
      `INSERT INTO bundle_suggestions (selected_products, comment, created_at, resolved) VALUES (?, ?, ?, 0)`
    ).bind(JSON.stringify(products), comment, new Date().toISOString()).run();

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
