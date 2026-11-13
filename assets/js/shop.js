// Shared shop helpers: data loading, the cart (kept in this browser), and checkout.
const KEY = "gg-cart-v1";

let dataPromise;
export function loadData() {
  dataPromise ||= Promise.all(
    ["catalog", "table-stock", "gallery"].map((f) => fetch(`/data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f); return r.json(); }))
  ).then(([catalog, stock, gallery]) => ({ catalog, stock, gallery }));
  return dataPromise;
}

export const pricing = () => globalThis.GGPricing;

export function readCart() {
  try { const c = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(c) ? c : []; } catch { return []; }
}
function writeCart(c) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode: cart lives for this page only */ }
  memory = c;
  window.dispatchEvent(new CustomEvent("cart:change", { detail: c }));
}
let memory = null;
export function cart() { return memory ?? (memory = readCart()); }

export function addToCart(item) {
  const c = cart().slice();
  if (item.kind === "table" || item.kind === "shop") {
    const hit = c.find((x) => x.kind === item.kind && x.id === item.id);
    if (hit) { hit.qty = Math.min(hit.qty + 1, 20); writeCart(c); return; }
  }
  c.push({ ...item, key: Math.random().toString(36).slice(2, 9) });
  writeCart(c);
}
export function setQty(key, qty) {
  const c = cart().map((x) => (x.key === key ? { ...x, qty } : x)).filter((x) => x.qty > 0);
  writeCart(c);
}
export function removeItem(key) { writeCart(cart().filter((x) => x.key !== key)); }
export function clearCart() { writeCart([]); }

export async function checkout(source) {
  const items = cart();
  try { sessionStorage.setItem("gg-last-order", JSON.stringify({ items, source, at: Date.now() })); } catch {}
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart: items, source }),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || !data.url) throw new Error(data.error || "Checkout isn't available right now. Please try again, or order at the table.");
  window.location.assign(data.url);
}

export function itemLabel(it, catalog, stock) {
  if (it.kind === "shop") {
    const s = (catalog.shop?.items || []).find((x) => x.id === it.id);
    return { title: s ? s.name : "?", sub: "Ready-made · ships in a few days", img: s?.images?.[0] };
  }
  if (it.kind === "table") {
    const s = stock.items.find((x) => x.id === it.id);
    return { title: `“${s ? s.name : "?"}” from the table`, sub: s ? `${catalog.shapes[s.shape]} · ${catalog.schemes[s.scheme].label} · take it home today` : "" };
  }
  const p = catalog.products[it.kind].label;
  const extra = it.kind === "photo" ? (it.install ? " · Gene installs your photo" : " · you add your photo") : "";
  return { title: `${p}: “${it.text}”`, sub: `${catalog.shapes[it.shape]} · ${catalog.schemes[it.scheme].label} · ${it.year}${extra}` };
}

export function todoBadges(catalog) {
  if (catalog.pricesConfirmed) document.querySelectorAll("[data-price-todo]").forEach((n) => n.remove());
}
