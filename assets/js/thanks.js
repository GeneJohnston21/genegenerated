import { loadData, clearCart, itemLabel } from "./shop.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function main() {
  const q = new URLSearchParams(location.search);
  const from = q.get("from");
  const title = document.querySelector("[data-title]");
  const lede = document.querySelector("[data-lede]");

  if (from === "quote") {
    title.textContent = "Request sent!";
    lede.textContent = "Thanks! Gene will look at your photos and reply by email with a preview and a price, usually within a couple of days.";
    return;
  }
  if (from === "contact") {
    title.textContent = "Message sent!";
    lede.textContent = "Thanks for getting in touch. Gene will reply by email.";
    return;
  }
  if (!q.get("session_id")) return;

  // Paid: Stripe sent us back here. Show what they bought, then empty the cart.
  let last = null;
  try { last = JSON.parse(sessionStorage.getItem("gg-last-order") || "null"); } catch {}
  clearCart();
  title.textContent = "You're all set!";
  const { catalog, stock } = await loadData();
  const items = (last && last.items) || [];
  const table = items.filter((i) => i.kind === "table");
  const made = items.filter((i) => i.kind !== "table");

  const parts = [];
  if (table.length) parts.push("Show this screen at the table and take your ornament home.");
  const custom = made.filter((i) => i.kind !== "shop");
  const ready = made.filter((i) => i.kind === "shop");
  if (custom.length) parts.push("Your custom ornament is going into the print queue.");
  if (ready.length) parts.push("Your order is ready-made, so it goes out quickly.");
  if (made.length) parts.push(last && last.fulfillment === "pickup"
    ? "You chose local pickup: Gene will text you to set a time. Stripe has emailed your receipt."
    : "Stripe has emailed your receipt, and you'll get another email when it ships.");
  lede.textContent = parts.join(" ") || "Stripe has emailed your receipt.";
  if (from === "booth") document.querySelector("[data-back]").setAttribute("href", "/booth.html");

  if (items.length) {
    const r = document.querySelector("[data-receipt]");
    const time = new Date(last.at || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    r.innerHTML = `<h2>${table.length ? "Paid ✓ Show Gene" : "Your order"}</h2><p class="muted">Paid at ${esc(time)} · order ${esc(q.get("session_id").slice(-8))}</p>
      <ul class="cart-items">${items.map((it) => { const l = itemLabel(it, catalog, stock); return `<li style="grid-template-columns:auto 1fr"><strong>${it.qty}×</strong><div><div class="t">${esc(l.title)}</div><div class="s">${esc(l.sub)}</div></div></li>`; }).join("")}</ul>`;
    r.hidden = false;
  }
}
main().catch((e) => console.error(e));
