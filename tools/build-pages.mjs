// Builds one page per visible ready-made product (shop/<id>/index.html) and the sitemap, from
// data/catalog.json. Netlify runs this on every deploy (netlify.toml [build] command), so
// adding a product to the catalog adds its page. Run it locally too: node tools/build-pages.mjs
// No dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://genegenerated.com";
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/catalog.json"), "utf8"));
const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const bulbs = index.slice(index.indexOf('<svg class="bulbs"'), index.indexOf("</svg>", index.indexOf('<svg class="bulbs"')) + 6);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);

const items = catalog.shop.items.filter((x) => x.show && x.images && x.images.length);
const where = {};
for (const d of catalog.shop.departments) for (const s of d.subs || []) where[s.id] = { dept: d, sub: s };

const DEFAULT_DETAILS = [
  "3D printed by Gene, in-house",
  "Every color is printed in, so there's no paint to chip",
  "Ships in about 5 business days, or free local pickup",
];

function page(x) {
  const w = where[x.category] || {};
  const url = `${SITE}/shop/${x.id}/`;
  const imgs = x.images;
  const related = items.filter((y) => y.id !== x.id && y.category === x.category).slice(0, 3);
  const more = related.length < 3 ? items.filter((y) => y.id !== x.id && !related.includes(y)).slice(0, 3 - related.length) : [];
  const ld = {
    "@context": "https://schema.org", "@type": "Product",
    name: x.name, description: x.blurb, sku: x.id,
    image: imgs.map((i) => SITE + i),
    brand: { "@type": "Brand", name: "Gene Generated" },
    category: [w.dept && w.dept.label, w.sub && w.sub.label, x.type].filter(Boolean).join(" > "),
    offers: {
      "@type": "Offer", url, priceCurrency: (catalog.currency || "usd").toUpperCase(),
      price: (x.price / 100).toFixed(2),
      availability: x.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const tag = [w.sub && w.sub.label, x.type].filter(Boolean).join(" · ");
  const card = (y) => `<a class="shop-card shop-link" href="/shop/${esc(y.id)}/"><div class="shop-img"><img src="${esc(y.images[0])}" alt="" loading="lazy" width="1000" height="1000"></div><div class="shop-body"><h3>${esc(y.name)}</h3><div class="shop-buy"><span class="price">${money(y.price)}</span></div></div></a>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(x.name)} · Gene Generated</title>
  <meta name="description" content="${esc(x.blurb)}">
  <meta name="theme-color" content="#0a0f24">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="${esc(x.name)} · ${money(x.price)}">
  <meta property="og:description" content="${esc(x.blurb)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}${esc(imgs[0])}">
  <meta property="product:price:amount" content="${(x.price / 100).toFixed(2)}">
  <meta property="product:price:currency" content="USD">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
  <script src="/assets/js/pricing.js" defer></script>
  <script type="module" src="/assets/js/product.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    ${bulbs}
    <div class="wrap nav">
      <a class="brand" href="/"><span class="brand-bulb" aria-hidden="true"></span>Gene Generated</a>
      <nav aria-label="Main">
        <ul>
          <li><a href="/#shop">Shop</a></li>
          <li><a href="/custom.html">Custom</a></li>
          <li><a class="cart-link" href="/design.html#cart">Cart<span class="cart-count" data-cart-count data-n="0">0</span></a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main" class="wrap product-page" data-product="${esc(x.id)}">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/#shop">Shop</a>${w.dept ? ` › <a href="/?cat=${esc(w.dept.id)}#shop">${esc(w.dept.label)}</a>` : ""}${w.sub ? ` › <a href="/?cat=${esc(w.sub.id)}#shop">${esc(w.sub.label)}</a>` : ""}</nav>
    <div class="pp-grid">
      <div class="pp-gallery">
        <img class="pp-main" src="${esc(imgs[0])}" alt="${esc(x.name)}" width="1000" height="1000" data-main>
        ${imgs.length > 1 ? `<div class="pp-thumbs">${imgs.map((src, i) => `<button type="button" data-thumb="${esc(src)}" aria-label="Photo ${i + 1} of ${imgs.length}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt="" width="160" height="160" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="pp-info">
        <p class="shop-cat">${esc(tag)}</p>
        <h1>${esc(x.name)}</h1>
        <p class="pp-price">${money(x.price)}</p>
        <p class="lede">${esc(x.blurb)}</p>
        <ul class="facts">${(x.details && x.details.length ? x.details : DEFAULT_DETAILS).map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
        <div class="pp-buy">
          ${x.available ? `<button type="button" class="btn" data-add="${esc(x.id)}">Add to cart · ${money(x.price)}</button>` : `<p class="muted">Sold out for now. <a href="/#contact">Ask Gene</a> about the next batch.</p>`}
          <p class="help" data-add-status role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
    ${related.length + more.length ? `<section class="pp-related" aria-labelledby="rel-title"><h2 id="rel-title">${related.length ? "More like this" : "More from the shop"}</h2><div class="shop-grid">${related.concat(more).map(card).join("")}</div></section>` : ""}
  </main>

  <footer class="site-footer">
    <div class="wrap"><span>© 2026 Gene Generated · Designed and printed in-house</span><a href="/booth.html">Booth checkout</a></div>
  </footer>
</body>
</html>
`;
}

// Rebuild shop/ from scratch so retired products don't linger.
const out = path.join(ROOT, "shop");
fs.rmSync(out, { recursive: true, force: true });
for (const x of items) {
  fs.mkdirSync(path.join(out, x.id), { recursive: true });
  fs.writeFileSync(path.join(out, x.id, "index.html"), page(x));
}

const urls = ["/", "/custom.html", "/design.html"].concat(items.map((x) => `/shop/${x.id}/`));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${items.length} product pages + sitemap (${urls.length} urls)`);
