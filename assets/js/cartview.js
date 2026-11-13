// Renders the cart (items, quantities, totals, deal hint) into a container.
import { cart, setQty, removeItem, itemLabel, checkout } from "./shop.js";
import { ornamentSVG } from "./orn2d.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function mountCart(root, { catalog, stock }, source) {
  const P = globalThis.GGPricing;
  const money = P.money;

  function render() {
    const items = cart();
    const priced = P.priceCart(items, catalog, stock);
    const count = items.reduce((a, x) => a + x.qty, 0);
    let h = `<h2 id="cart-title" tabindex="-1">Your cart${count ? ` <span class="muted">(${count})</span>` : ""}</h2>`;
    if (!items.length) {
      h += `<p class="empty">Nothing here yet. Design an ornament above${source === "booth" ? " or pick one from the table" : ""}.</p>`;
      root.innerHTML = h;
      return;
    }
    h += `<ul class="cart-items">` + items.map((it) => {
      const lab = itemLabel(it, catalog, stock);
      const look = it.kind === "table" ? stock.items.find((s) => s.id === it.id) || {} : it;
      const thumb = it.kind === "shop" ? `<img src="${esc(lab.img || "")}" alt="" width="64" height="64">` : ornamentSVG({ kind: it.kind === "photo" ? "photo" : "name", text: it.kind === "table" ? look.name : it.text, shape: look.shape, scheme: look.scheme, year: it.year || "2026" }, catalog.schemes);
      return `<li><span class="thumb" aria-hidden="true">${thumb}</span><div><div class="t">${esc(lab.title)}</div><div class="s">${esc(lab.sub)}</div></div>
        <div class="ctrl"><span class="qty" role="group" aria-label="Quantity"><button type="button" data-dec="${it.key}" aria-label="One fewer">−</button><output aria-live="polite">${it.qty}</output><button type="button" data-inc="${it.key}" aria-label="One more">+</button></span><button type="button" class="link-btn" data-rm="${it.key}">Remove</button></div></li>`;
    }).join("") + `</ul>`;

    if (priced.errors.length) h += `<p class="error" role="alert">${esc(priced.errors[0])}</p>`;
    const bundle = catalog.products.name.bundle;
    if (bundle && priced.eligibleTotal > 0 && priced.toNextBundle > 0) {
      h += `<p class="hint">Add ${priced.toNextBundle} more name ornament${priced.toNextBundle > 1 ? "s" : ""} to get ${bundle.size} for ${money(bundle.price)}.</p>`;
    }
    const ship = priced.needsShipping ? catalog.shipping.price : 0;
    h += `<div class="sum"><div><span>Items</span><span>${money(priced.subtotal)}</span></div>`;
    h += priced.needsShipping
      ? `<div><span>${esc(catalog.shipping.label)}</span><span>${money(ship)}</span></div>`
      : `<div><span>Shipping</span><span>None, it's in your hands</span></div>`;
    h += `<div class="grand"><span>Total</span><span>${money(priced.subtotal + ship)}</span></div></div>`;
    if (priced.needsShipping) h += `<p class="help">${esc(catalog.shipping.estimate)}. US addresses only. <span class="todo" data-price-todo-js>TODO: confirm</span></p>`;
    h += `<p class="error" role="alert" data-co-error hidden></p>`;
    h += `<button type="button" class="btn btn-go btn-block" data-checkout ${priced.ok ? "" : "disabled"}>Checkout · ${money(priced.subtotal + ship)}</button>`;
    h += `<p class="help">Secure checkout by Stripe. Card, Apple Pay or Google Pay.</p>`;
    root.innerHTML = h;
    if (catalog.pricesConfirmed) root.querySelectorAll("[data-price-todo-js]").forEach((n) => n.remove());
  }

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const find = (k) => cart().find((x) => x.key === k);
    const refocus = (attr, key) => requestAnimationFrame(() => (root.querySelector(`[${attr}="${key}"]`) || root.querySelector("h2"))?.focus());
    if (b.dataset.inc) { const it = find(b.dataset.inc); if (it) { setQty(it.key, Math.min(it.qty + 1, catalog.limits.qtyMax)); refocus("data-inc", it.key); } }
    else if (b.dataset.dec) { const it = find(b.dataset.dec); if (it) { setQty(it.key, it.qty - 1); refocus("data-dec", it.key); } }
    else if (b.dataset.rm) { removeItem(b.dataset.rm); refocus("data-none", ""); }
    else if ("checkout" in b.dataset) {
      const err = root.querySelector("[data-co-error]");
      b.disabled = true; const label = b.textContent; b.textContent = "Opening secure checkout…";
      try { await checkout(source); }
      catch (x) { err.textContent = x.message; err.hidden = false; b.disabled = false; b.textContent = label; }
    }
  });
  window.addEventListener("cart:change", render);
  render();
  return { render };
}
