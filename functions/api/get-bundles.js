export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const showAll = url.searchParams.get('all') === 'true';

  try {
    const bundles = await env.DB.prepare(
      showAll
        ? "SELECT * FROM bundles ORDER BY bundle_id"
        : "SELECT * FROM bundles WHERE active = 1 ORDER BY bundle_id"
    ).all();

    const items = await env.DB.prepare(
      "SELECT * FROM bundle_items ORDER BY bundle_id, sort_order"
    ).all();

    const result = bundles.results.map(bundle => ({
      ...bundle,
      items: items.results.filter(item => item.bundle_id === bundle.bundle_id)
    }));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}