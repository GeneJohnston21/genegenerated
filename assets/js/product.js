// Product page: photo switching, add to cart, cart count. The page itself is built from the
// catalog by tools/build-pages.mjs; here we re-check the live catalog before selling.
import { loadData, cart, addToCart } from "./shop.js";

function updateCount() {
  const n = cart().reduce((a, x) => a + (x.qty || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = n; el.dataset.n = n; });
}

async function main() {
  updateCount();
  window.addEventListener("cart:change", updateCount);
  const main = document.querySelector("[data-main]");
  document.querySelectorAll("[data-thumb]").forEach((b) => b.addEventListener("click", () => {
    main.src = b.dataset.thumb;
    document.querySelectorAll("[data-thumb]").forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
  }));

  const id = document.querySelector("[data-product]").dataset.product;
  const btn = document.querySelector("[data-add]");
  const status = document.querySelector("[data-add-status]");
  const { catalog } = await loadData();
  const item = catalog.shop.items.find((x) => x.id === id);
  if (btn && (!item || !item.show || !item.available)) {
    btn.disabled = true; btn.textContent = "Sold out for now";
    return;
  }
  btn?.addEventListener("click", () => {
    addToCart({ kind: "shop", id, qty: 1 });
    const label = btn.textContent;
    btn.textContent = "Added ✓";
    setTimeout(() => (btn.textContent = label), 1600);
    status.innerHTML = `In your cart. <a href="/design.html#cart">View cart and check out</a>`;
  });
}
main().catch((e) => console.error(e));
