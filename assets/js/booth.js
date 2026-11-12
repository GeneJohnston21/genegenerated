import { loadData, cart, addToCart, todoBadges } from "./shop.js";
import { mountDesigner } from "./designer.js";
import { mountCart } from "./cartview.js";
import { ornamentSVG } from "./orn2d.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function main() {
  const data = await loadData();
  const { catalog, stock } = data;
  const P = globalThis.GGPricing;
  todoBadges(catalog);
  if (new URLSearchParams(location.search).get("canceled")) document.querySelector("[data-canceled]").hidden = false;

  // Toast
  const toast = document.querySelector(".toast");
  let tt;
  const say = (msg) => { toast.textContent = msg; toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => (toast.hidden = true), 1800); };

  // Tabs (arrow keys move between them)
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  let designerReady = false;
  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (tab.id === "tab-design" && !designerReady) {
      designerReady = true;
      mountDesigner({ stage: document.getElementById("stage"), controls: document.getElementById("controls") }, data,
        { compact: true, onAdded: (it) => say(`Added “${it.text}” to your cart`) });
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      select(next); next.focus();
    });
  });

  // Table stock
  const list = document.querySelector("[data-table-list]");
  const avail = stock.items.filter((s) => s.available);
  const unit = catalog.products.table.unit;
  list.innerHTML = avail.length
    ? avail.map((s) => `<li><button type="button" data-id="${esc(s.id)}"><span aria-hidden="true">${ornamentSVG({ kind: "name", text: s.name, shape: s.shape, scheme: s.scheme }, catalog.schemes)}</span><span><span class="n">${esc(s.name)}</span><span class="s">${esc(catalog.shapes[s.shape])} · ${esc(catalog.schemes[s.scheme].label)}</span></span><span class="p">${P.money(unit)}</span></button></li>`).join("")
    : `<li class="muted">Everything on the table has found a home. Design one instead!</li>`;
  const b = catalog.products.table.bundle;
  if (b) document.querySelector("[data-bundle-note]").textContent = `Any ${b.size} name ornaments for ${P.money(b.price)}, from the table or designed.`;
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]"); if (!btn) return;
    addToCart({ kind: "table", id: btn.dataset.id, qty: 1 });
    say(`Added “${avail.find((s) => s.id === btn.dataset.id).name}” to your cart`);
  });

  // Pay bar + cart sheet
  const sheet = document.getElementById("cart-sheet");
  const openBtn = document.querySelector("[data-open-cart]");
  const what = document.querySelector("[data-pay-what]");
  function updateBar() {
    const items = cart();
    const n = items.reduce((a, x) => a + x.qty, 0);
    const pr = P.priceCart(items, catalog, stock);
    const total = pr.subtotal + (pr.needsShipping ? catalog.shipping.price : 0);
    openBtn.disabled = n === 0;
    what.innerHTML = n ? `${n} ornament${n > 1 ? "s" : ""} · ${P.money(total)}<small>${pr.needsShipping ? "Includes shipping" : "Take it home today"}</small>` : `Cart is empty<small>Pick an ornament to start</small>`;
  }
  mountCart(document.getElementById("cart"), data, "booth");
  openBtn.addEventListener("click", () => (sheet.showModal ? sheet.showModal() : sheet.setAttribute("open", "")));
  sheet.querySelector("[data-close]").addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
  window.addEventListener("cart:change", updateBar);
  updateBar();
}
main().catch((e) => console.error(e));
