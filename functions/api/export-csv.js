// functions/api/export-csv.js
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('target'); // 'fragrances' or 'products'

    if (!target || (target !== 'fragrances' && target !== 'products')) {
      return new Response(JSON.stringify({ error: "Invalid target table requested." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let data = [];
    if (target === 'fragrances') {
      const { results } = await context.env.DB.prepare(`SELECT name, gender, active FROM fragrances ORDER BY name ASC`).all();
      data = results;
    } else {
      const { results } = await context.env.DB.prepare(`SELECT name, volume_female, volume_male, price, active FROM products ORDER BY name ASC`).all();
      data = results;
    }

    return new Response(JSON.stringify({ data }), {
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
