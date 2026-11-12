import { loadData, cart, todoBadges } from "./shop.js";
import { ornamentSVG } from "./orn2d.js";

const money = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);

function updateCount() {
  const n = cart().reduce((a, x) => a + (x.qty || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = n; el.dataset.n = n; });
}

async function main() {
  updateCount();
  window.addEventListener("cart:change", updateCount);
  const { catalog, gallery } = await loadData();
  const S = catalog.schemes;
  todoBadges(catalog);

  // Prices from the catalog, so the page always matches checkout.
  const name = catalog.products.name, photo = catalog.products.photo;
  document.querySelectorAll("[data-from-price]").forEach((el) => (el.textContent = money(Math.min(name.unit, photo.unit))));
  document.querySelectorAll('[data-price="name"]').forEach((el) => (el.textContent = money(name.unit)));
  document.querySelectorAll('[data-price="photo"]').forEach((el) => (el.textContent = money(photo.unit)));
  document.querySelectorAll("[data-bundle]").forEach((el) => (el.textContent = `${name.bundle.size} for ${money(name.bundle.price)}`));
  document.querySelectorAll("[data-ship-price]").forEach((el) => (el.textContent = money(catalog.shipping.price)));

  document.querySelectorAll("[data-draw]").forEach((el) => { el.innerHTML = ornamentSVG(JSON.parse(el.dataset.draw), S); });

  const shelf = document.querySelector("[data-gallery]");
  if (shelf) {
    shelf.innerHTML = gallery.items.map((g) => {
      const art = g.photo
        ? `<img src="${g.photo}" alt="${g.name} ornament" loading="lazy" width="400" height="400">`
        : ornamentSVG({ kind: "name", text: g.name, shape: g.shape, scheme: g.scheme }, S);
      return `<figure>${art}<figcaption>${g.name}</figcaption>${g.sample ? '<span class="tag">Sample</span>' : ""}</figure>`;
    }).join("");
  }

  // Hero: flat drawing first (instant), then the 3D model once it's ready.
  const stage = document.getElementById("hero-stage");
  const flat = stage.querySelector(".orn2d");
  let current = { kind: "name", text: "Emma", year: "2026", shape: "bauble", scheme: "classic" };
  const drawFlat = () => (flat.innerHTML = ornamentSVG(current, S));
  drawFlat();
  stage.style.setProperty("--glow", S[current.scheme].body + "66");

  let viewer = null;
  const demos = [
    { text: "Emma", shape: "bauble", scheme: "classic" },
    { text: "Grandpa", shape: "star", scheme: "cobalt" },
    { text: "Baby's First", shape: "bauble", scheme: "emerald" },
    { text: "Rosie", shape: "bauble", scheme: "snow" },
  ];
  const holder = document.querySelector("[data-demo-names]");
  if (holder) {
    holder.innerHTML = demos.map((d, i) => `<button type="button" class="link-btn" data-demo="${i}">${d.text}</button>`).join(" · ");
    holder.addEventListener("click", (e) => {
      const b = e.target.closest("[data-demo]"); if (!b) return;
      current = { ...current, ...demos[+b.dataset.demo] };
      stage.style.setProperty("--glow", S[current.scheme].body + "66");
      drawFlat();
      viewer?.update(current);
    });
  }

  const load3D = async () => {
    try {
      const { createOrnamentViewer } = await import("./ornament3d.js");
      viewer = await createOrnamentViewer(stage, current, S);
      if (viewer) {
        stage.classList.add("is-3d");
        stage.addEventListener("orn:interacted", () => stage.classList.add("touched"), { once: true });
      }
    } catch (err) { console.warn("3D preview unavailable", err); }
  };
  if ("requestIdleCallback" in window) requestIdleCallback(load3D, { timeout: 1500 }); else setTimeout(load3D, 300);
}

main().catch((err) => console.error(err));
