// POST /api/checkout  { cart: [...], source: "booth" | "web" }
// Recomputes prices from data/catalog.json, then creates a Stripe Checkout Session
// and returns { url } for the browser to redirect to.
// Needs the STRIPE_SECRET_KEY environment variable (set in Netlify, never in the repo).

const catalog = require("../../data/catalog.json");
const stock = require("../../data/table-stock.json");
const { priceCart } = require("../../assets/js/pricing.js");

const STRIPE_API = "https://api.stripe.com/v1/checkout/sessions";

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

// Stripe's API takes form-encoded nested params: a[b][0][c]=x
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}

function siteOrigin(event) {
  // Netlify sets URL (primary domain) and DEPLOY_PRIME_URL (branch/preview deploys).
  const ctx = process.env.CONTEXT;
  if (ctx && ctx !== "production" && process.env.DEPLOY_PRIME_URL) return process.env.DEPLOY_PRIME_URL;
  if (process.env.URL) return process.env.URL;
  const host = event.headers && (event.headers["x-forwarded-host"] || event.headers.host);
  return host ? `https://${host}` : "https://genegenerated.com";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST." });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "Online checkout isn't switched on yet. Please order at the table or use the contact form." });
  if (key.startsWith("sk_live") && !catalog.pricesConfirmed) {
    return json(503, { error: "Checkout is paused while prices are being finalized. Please order at the table." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad request." }); }
  const source = body.source === "booth" ? "booth" : "web";

  const priced = priceCart(body.cart, catalog, stock);
  if (!priced.ok) return json(400, { error: priced.errors[0] || "Please check your cart.", errors: priced.errors });

  const origin = siteOrigin(event);
  const back = source === "booth" ? "/booth.html" : "/design.html";

  const params = {
    mode: "payment",
    success_url: `${origin}/thanks.html?session_id={CHECKOUT_SESSION_ID}&from=${source}`,
    cancel_url: `${origin}${back}?canceled=1`,
    line_items: priced.lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: catalog.currency,
        unit_amount: l.unit,
        product_data: { name: l.title.slice(0, 250), description: l.description.slice(0, 500) },
      },
    })),
    billing_address_collection: "auto",
    phone_number_collection: { enabled: "true" },
    custom_fields: [{
      key: "gallery",
      label: { type: "custom", custom: "Show it in our gallery? (first name only)" },
      type: "dropdown",
      optional: "true",
      dropdown: { options: [{ label: "Yes, that's fine", value: "yes" }, { label: "No thanks", value: "no" }] },
    }],
    metadata: { source },
    payment_intent_data: { metadata: { source } },
  };

  // One metadata entry per item, so every order shows its exact design in the Stripe dashboard.
  priced.items.slice(0, 40).forEach((it, i) => {
    const text = it.kind === "table" ? `TABLE ${it.id}` : `${it.kind.toUpperCase()} "${it.text}" ${it.year} ${it.shape} ${it.scheme}${it.kind === "photo" ? (it.install ? " INSTALL-PHOTO" : " customer-photo") : ""}`;
    params.metadata[`item_${i + 1}`] = `${it.qty}x ${text}`.slice(0, 500);
  });

  if (priced.needsShipping) {
    params.shipping_address_collection = { allowed_countries: catalog.shipping.countries };
    params.shipping_options = [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: catalog.shipping.label,
        fixed_amount: { amount: catalog.shipping.price, currency: catalog.currency },
      },
    }];
  }

  let res, data;
  try {
    res = await fetch(STRIPE_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(params),
    });
    data = await res.json();
  } catch (err) {
    console.error("Stripe request failed", err);
    return json(502, { error: "Couldn't reach the payment service. Please try again in a moment." });
  }
  if (!res.ok || !data.url) {
    console.error("Stripe error", res.status, data && data.error);
    return json(502, { error: "The payment service turned this order down. Please try again, or order at the table." });
  }
  return json(200, { url: data.url });
};

// Exposed for local tests only.
exports._encode = encode;
