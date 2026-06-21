export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare(
      `SELECT id, name, volume_female, volume_male, price FROM products WHERE active = 1 ORDER BY id ASC`
    ).all();

    return new Response(JSON.stringify({ products: result.results }), {
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