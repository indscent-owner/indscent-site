export async function onRequestGet(context) {
  try {
    await context.env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS bundle_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        selected_products TEXT,
        comment TEXT,
        created_at TEXT,
        resolved INTEGER DEFAULT 0
      )`
    ).run();

    const result = await context.env.DB.prepare(`SELECT id, selected_products, comment, created_at, resolved FROM bundle_suggestions ORDER BY created_at DESC`).all();

    return new Response(JSON.stringify({ suggestions: result.results || [] }), {
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
