// The ornament designer: live 3D preview + controls + "Add to cart".
// Used full-size on /design.html and compact on /booth.html.
import { addToCart } from "./shop.js";
import { ornamentSVG } from "./orn2d.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function mountDesigner({ stage, controls }, { catalog }, { compact = false, initialKind = "name", onAdded } = {}) {
  const S = catalog.schemes, L = catalog.limits, P = globalThis.GGPricing;
  const state = {
    kind: initialKind === "photo" ? "photo" : "name",
    text: initialKind === "photo" ? "The Parkers" : "Emma",
    year: "2026", shape: "bauble", scheme: "classic", qty: 1, install: false, photoURL: null,
  };

  // ---- Preview ----
  const flat = stage.querySelector(".orn2d");
  let viewer = null;
  const paint = () => {
    stage.style.setProperty("--glow", S[state.scheme].body + "66");
    flat.innerHTML = ornamentSVG(state, S);
    viewer?.update({ kind: state.kind, text: state.text, year: state.year, shape: state.shape, scheme: state.scheme, photoURL: state.photoURL });
    stage.setAttribute("aria-label", `3D preview: ${state.kind === "photo" ? "photo ornament" : "name ornament"} reading “${state.text || "…"}”, ${catalog.shapes[state.shape]}, ${S[state.scheme].label}. Drag or use the arrow keys to spin it.`);
  };
  import("./ornament3d.js")
    .then(({ createOrnamentViewer }) => createOrnamentViewer(stage, { ...state }, S))
    .then((v) => {
      viewer = v;
      if (v) { stage.classList.add("is-3d"); stage.addEventListener("orn:interacted", () => stage.classList.add("touched"), { once: true }); paint(); }
    })
    .catch((err) => console.warn("3D preview unavailable", err));

  // ---- Controls ----
  const id = (x) => `${compact ? "b" : "d"}-${x}`;
  const swatches = Object.entries(S).map(([k, s]) =>
    `<button type="button" data-scheme="${k}" aria-label="${esc(s.label)}" style="background:${s.body};--ink:${s.ink};--body:${s.body}"></button>`).join("");

  controls.innerHTML = `
    ${compact ? "" : `<div class="field"><span class="label" id="${id("kind-l")}">Style</span>
      <div class="seg" role="group" aria-labelledby="${id("kind-l")}"><button type="button" data-kind="name">Name ornament</button><button type="button" data-kind="photo">Photo ornament</button></div></div>`}
    <div class="field">
      <label for="${id("text")}" data-text-label>Name</label>
      <input type="text" id="${id("text")}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <p class="help" data-text-help></p>
    </div>
    <div class="${compact ? "" : "row2"}">
      <div class="field"><span class="label" id="${id("shape-l")}">Shape</span>
        <div class="seg" role="group" aria-labelledby="${id("shape-l")}"><button type="button" data-shape="bauble">Bauble</button><button type="button" data-shape="star">Star</button></div></div>
      ${compact ? "" : `<div class="field"><label for="${id("year")}">Year</label><input type="text" id="${id("year")}" inputmode="numeric" maxlength="4" value="2026"></div>`}
    </div>
    <div class="field"><span class="label" id="${id("col-l")}">Colors: <span class="muted" data-scheme-name></span></span>
      <div class="swatches" role="group" aria-labelledby="${id("col-l")}">${swatches}</div></div>
    <div class="field" data-photo-only hidden>
      <label class="check"><input type="checkbox" id="${id("install")}"> <span>Gene installs my photo <span class="muted" data-install-price></span><br><span class="help">You'll get an email asking for the picture after you order.</span></span></label>
      ${compact ? "" : `<div class="photo-try"><label for="${id("try")}">Preview it with your own photo</label><input type="file" id="${id("try")}" accept="image/*"><p class="help">Just for the preview. The photo stays on your device and isn't uploaded.</p></div>`}
    </div>
    <div class="add-row">
      <span class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">−</button><output id="${id("qty")}" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">+</button></span>
      <span class="total" data-line-price></span>
    </div>
    <p class="error" role="alert" data-err hidden></p>
    <button type="button" class="btn btn-block" data-add>Add to cart</button>
  `;

  const $ = (sel) => controls.querySelector(sel);
  const textIn = $(`#${id("text")}`), yearIn = $(`#${id("year")}`);
  textIn.value = state.text;

  function sync() {
    const max = state.kind === "photo" ? L.captionMax : L.nameMax;
    textIn.maxLength = max;
    $("[data-text-label]").textContent = state.kind === "photo" ? "Caption" : "Name";
    $("[data-text-help]").textContent = `${state.text.length}/${max} characters. Letters, numbers, spaces and simple punctuation.`;
    controls.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === state.kind));
    controls.querySelectorAll("[data-shape]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.shape === state.shape));
    controls.querySelectorAll("[data-scheme]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.scheme === state.scheme));
    $("[data-scheme-name]").textContent = S[state.scheme].label;
    $("[data-photo-only]").hidden = state.kind !== "photo";
    $("[data-install-price]").textContent = `(+${P.money(catalog.photoInstall.price)} each)`;
    $(`#${id("qty")}`).textContent = state.qty;
    const unit = catalog.products[state.kind].unit + (state.kind === "photo" && state.install ? catalog.photoInstall.price : 0);
    $("[data-line-price]").textContent = P.money(unit * state.qty);
    paint();
  }

  controls.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.kind) {
      if (state.kind !== b.dataset.kind) {
        state.kind = b.dataset.kind;
        if (state.text === "Emma" || state.text === "The Parkers") state.text = state.kind === "photo" ? "The Parkers" : "Emma";
        state.text = state.text.slice(0, state.kind === "photo" ? L.captionMax : L.nameMax);
        textIn.value = state.text;
      }
    } else if (b.dataset.shape) state.shape = b.dataset.shape;
    else if (b.dataset.scheme) state.scheme = b.dataset.scheme;
    else if (b.dataset.q) state.qty = Math.max(1, Math.min(L.qtyMax, state.qty + Number(b.dataset.q)));
    else if ("add" in b.dataset) return add(b);
    else return;
    sync();
  });
  textIn.addEventListener("input", () => { state.text = textIn.value; $("[data-err]").hidden = true; sync(); });
  yearIn?.addEventListener("input", () => { if (/^20\d\d$/.test(yearIn.value)) { state.year = yearIn.value; sync(); } });
  $(`#${id("install")}`).addEventListener("change", (e) => { state.install = e.target.checked; sync(); });
  const tryIn = $(`#${id("try")}`);
  tryIn?.addEventListener("change", () => {
    const f = tryIn.files && tryIn.files[0];
    if (!f) return;
    if (state.photoURL) URL.revokeObjectURL(state.photoURL);
    state.photoURL = URL.createObjectURL(f);
    sync();
  });

  function add(btn) {
    const item = { kind: state.kind, text: state.text.trim(), year: state.year, shape: state.shape, scheme: state.scheme, qty: state.qty };
    if (state.kind === "photo") item.install = state.install;
    const check = P.priceCart([item], catalog, { items: [] });
    const err = $("[data-err]");
    if (!check.ok) { err.textContent = check.errors[0].replace(/^Item 1: /, ""); err.hidden = false; textIn.focus(); return; }
    err.hidden = true;
    addToCart(item);
    btn.textContent = "Added ✓";
    setTimeout(() => (btn.textContent = "Add to cart"), 1400);
    state.qty = 1;
    sync();
    onAdded?.(item);
  }

  sync();
  return { state };
}
