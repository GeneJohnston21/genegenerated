import { loadData, cart, todoBadges, addToCart } from "./shop.js";
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

  // Ready-made pieces, from catalog.shop, filtered by category chips (?cat=... keeps the choice shareable)
  const grid = document.querySelector("[data-shop]");
  const chips = document.querySelector("[data-shop-cats]");
  if (grid && catalog.shop) {
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const items = catalog.shop.items.filter((x) => x.show);
    const cats = (catalog.shop.categories || []).filter((c) => c.link || items.some((x) => x.category === c.id));
    const card = (x) => `
      <article class="shop-card${x.images.length > 1 ? " has-alt" : ""}">
        <div class="shop-img">
          <img src="${x.images[0]}" alt="${esc(x.name)}" loading="lazy" width="1000" height="1000">
          ${x.images[1] ? `<img class="alt" src="${x.images[1]}" alt="" loading="lazy" width="1000" height="1000">` : ""}
        </div>
        <div class="shop-body">
          <p class="shop-cat">${esc((cats.find((c) => c.id === x.category) || {}).label || "")}</p>
          <h3>${esc(x.name)}</h3>
          <p>${esc(x.blurb)}</p>
          <div class="shop-buy">
            <span class="price">${money(x.price)}</span>
            ${x.available
              ? `<button type="button" class="btn btn-small" data-add="${esc(x.id)}">Add to cart</button>`
              : `<span class="muted">Sold out</span>`}
          </div>
        </div>
      </article>`;
    const linkCard = (c) => `
      <a class="shop-card shop-link" href="${esc(c.link)}">
        <div class="shop-img orn-img">${ornamentSVG({ kind: "name", text: "Emma", shape: "bauble", scheme: "classic" }, S)}</div>
        <div class="shop-body">
          <p class="shop-cat">${esc(c.label)}</p>
          <h3>Design your own</h3>
          <p>${esc(c.blurb || "")}</p>
          <div class="shop-buy"><span class="price">from ${money(Math.min(name.unit, photo.unit))}</span><span class="btn btn-small" aria-hidden="true">Start designing</span></div>
        </div>
      </a>`;

    const valid = (id) => id === "all" || cats.some((c) => c.id === id);
    let current = new URLSearchParams(location.search).get("cat");
    if (!valid(current)) current = "all";

    const render = () => {
      if (chips) {
        const n = (id) => items.filter((x) => x.category === id).length;
        chips.innerHTML = [`<button type="button" class="chip" data-cat="all" aria-pressed="${current === "all"}">All <span>${items.length}</span></button>`]
          .concat(cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c.id)}" aria-pressed="${current === c.id}">${esc(c.label)}${c.link ? "" : ` <span>${n(c.id)}</span>`}</button>`))
          .join("");
      }
      const show = current === "all" ? items : items.filter((x) => x.category === current);
      const links = cats.filter((c) => c.link && (current === "all" || current === c.id));
      grid.innerHTML = show.map(card).join("") + links.map(linkCard).join("");
    };
    render();

    chips?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      current = b.dataset.cat;
      const url = new URL(location.href);
      if (current === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", current);
      history.replaceState(null, "", url);
      render();
      chips.querySelector(`[data-cat="${current}"]`)?.focus();
    });

    const status = document.querySelector("[data-shop-status]");
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]"); if (!b) return;
      addToCart({ kind: "shop", id: b.dataset.add, qty: 1 });
      const item = items.find((x) => x.id === b.dataset.add);
      b.textContent = "Added ✓";
      setTimeout(() => (b.textContent = "Add to cart"), 1600);
      if (status) status.innerHTML = `${esc(item.name)} is in your cart. <a href="/design.html#cart">View cart</a>`;
    });
  }

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
