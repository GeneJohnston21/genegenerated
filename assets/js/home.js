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

  // Ready-made pieces, from catalog.shop. Two levels of filter: departments (Holidays, Gaming...)
  // and their subcategories (Christmas, Halloween...). ?cat= holds either id, so both are linkable.
  const grid = document.querySelector("[data-shop]");
  const chips = document.querySelector("[data-shop-cats]");
  const subChips = document.querySelector("[data-shop-subs]");
  if (grid && catalog.shop) {
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const items = catalog.shop.items.filter((x) => x.show);
    const count = (subId) => items.filter((x) => x.category === subId).length;
    // Only show what has stock: a subcategory with items, a department with any such subcategory.
    const depts = (catalog.shop.departments || [])
      .map((d) => ({ ...d, subs: (d.subs || []).filter((s) => count(s.id) > 0) }))
      .filter((d) => d.link || d.subs.length);
    const subOf = {}; depts.forEach((d) => d.subs.forEach((s) => (subOf[s.id] = { sub: s, dept: d })));
    const deptCount = (d) => d.subs.reduce((a, s) => a + count(s.id), 0);

    const card = (x) => {
      const where = subOf[x.category];
      const tag = [where && where.sub.label, x.type].filter(Boolean).join(" · ");
      return `
      <article class="shop-card${x.images.length > 1 ? " has-alt" : ""}">
        <div class="shop-img">
          <img src="${x.images[0]}" alt="${esc(x.name)}" loading="lazy" width="1000" height="1000">
          ${x.images[1] ? `<img class="alt" src="${x.images[1]}" alt="" loading="lazy" width="1000" height="1000">` : ""}
        </div>
        <div class="shop-body">
          <p class="shop-cat">${esc(tag)}</p>
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
    };
    const linkCard = (d) => `
      <a class="shop-card shop-link" href="${esc(d.link)}">
        <div class="shop-img orn-img">${ornamentSVG({ kind: "name", text: "Emma", shape: "bauble", scheme: "classic" }, S)}</div>
        <div class="shop-body">
          <p class="shop-cat">${esc(d.label)}</p>
          <h3>Design your own</h3>
          <p>${esc(d.blurb || "")}</p>
          <div class="shop-buy"><span class="price">from ${money(Math.min(name.unit, photo.unit))}</span><span class="btn btn-small" aria-hidden="true">Start designing</span></div>
        </div>
      </a>`;

    // current = "all" | a department id | a subcategory id
    const valid = (id) => id === "all" || depts.some((d) => d.id === id) || !!subOf[id];
    let current = new URLSearchParams(location.search).get("cat");
    if (!valid(current)) current = "all";
    const deptOf = (id) => depts.find((d) => d.id === id) || (subOf[id] && subOf[id].dept) || null;

    const render = () => {
      const dept = deptOf(current);
      chips.innerHTML = [`<button type="button" class="chip" data-cat="all" aria-pressed="${current === "all"}">All <span>${items.length}</span></button>`]
        .concat(depts.map((d) => `<button type="button" class="chip" data-cat="${esc(d.id)}" aria-pressed="${!!dept && dept.id === d.id}">${esc(d.label)}${d.link ? "" : ` <span>${deptCount(d)}</span>`}</button>`))
        .join("");
      if (dept && dept.subs.length) {
        subChips.hidden = false;
        subChips.setAttribute("aria-label", `${dept.label}: filter further`);
        subChips.innerHTML = [`<button type="button" class="chip chip-sub" data-cat="${esc(dept.id)}" aria-pressed="${current === dept.id}">All ${esc(dept.label.toLowerCase())}</button>`]
          .concat(dept.subs.map((s) => `<button type="button" class="chip chip-sub" data-cat="${esc(s.id)}" aria-pressed="${current === s.id}">${esc(s.label)} <span>${count(s.id)}</span></button>`))
          .join("");
      } else { subChips.hidden = true; subChips.innerHTML = ""; }

      let show, links;
      if (current === "all") { show = items; links = depts.filter((d) => d.link); }
      else if (subOf[current]) { show = items.filter((x) => x.category === current); links = []; }
      else { const ids = dept.subs.map((s) => s.id); show = items.filter((x) => ids.includes(x.category)); links = dept.link ? [dept] : []; }
      grid.innerHTML = show.map(card).join("") + links.map(linkCard).join("");
    };
    render();

    const pick = (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      current = b.dataset.cat;
      const url = new URL(location.href);
      if (current === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", current);
      history.replaceState(null, "", url);
      const inSubs = !!e.target.closest("[data-shop-subs]");
      render();
      (inSubs ? subChips : chips).querySelector(`[data-cat="${current}"]`)?.focus();
    };
    chips.addEventListener("click", pick);
    subChips.addEventListener("click", pick);

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
