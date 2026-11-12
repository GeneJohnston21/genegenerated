import { loadData, cart, todoBadges } from "./shop.js";
import { mountDesigner } from "./designer.js";
import { mountCart } from "./cartview.js";

function updateCount() {
  const n = cart().reduce((a, x) => a + (x.qty || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = n; el.dataset.n = n; });
}

async function main() {
  const data = await loadData();
  todoBadges(data.catalog);
  const params = new URLSearchParams(location.search);
  if (params.get("canceled")) document.querySelector("[data-canceled]").hidden = false;
  mountDesigner(
    { stage: document.getElementById("stage"), controls: document.getElementById("controls") },
    data,
    { initialKind: params.get("kind") || "name" }
  );
  mountCart(document.getElementById("cart"), data, "web");
  updateCount();
  window.addEventListener("cart:change", updateCount);
}
main().catch((e) => console.error(e));
