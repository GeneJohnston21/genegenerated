// Custom work page: cart count, ornament "from" price, and the quote form.
// Phone photos are often 3-8 MB and Netlify Forms takes at most 8 MB per submission, so the
// form shrinks each photo to 1600 px JPEG in the browser before sending. If shrinking isn't
// possible (old browser, unreadable file), the original goes up as long as the total fits.
import { loadData, cart } from "./shop.js";

const money = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
const LIMIT = 7.5 * 1024 * 1024;

function updateCount() {
  const n = cart().reduce((a, x) => a + (x.qty || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = n; el.dataset.n = n; });
}

async function shrink(file) {
  if (!file || !file.size) return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (blob) return new File([blob], (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { /* fall through to the original */ }
  return file;
}

function wireQuote() {
  const form = document.querySelector("[data-quote-form]");
  if (!form) return;
  const err = form.querySelector("[data-quote-error]");
  const btn = form.querySelector("[data-quote-submit]");
  const bustOnly = form.querySelector("[data-bust-only]");
  const hint = form.querySelector("[data-photo-hint]");
  const sync = () => {
    const bust = form.querySelector('input[name="what"]:checked').value === "Bust";
    bustOnly.hidden = !bust;
    hint.textContent = bust ? "(required for a bust)" : "(optional)";
  };
  form.addEventListener("change", (e) => { if (e.target.name === "what") sync(); });
  sync();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fd = new FormData(form);
    const bust = fd.get("what") === "Bust";
    const p1 = form.querySelector("#q-photo1").files[0];
    if (bust && !p1) { err.textContent = "Please add a photo so Gene can quote the bust."; err.hidden = false; form.querySelector("#q-photo1").focus(); return; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Sending…";
    try {
      let total = 0;
      for (const key of ["photo1", "photo2"]) {
        const f = form.querySelector(`[name="${key}"]`).files[0];
        fd.delete(key);
        if (!f) continue;
        const small = await shrink(f);
        total += small.size;
        fd.append(key, small, small.name);
      }
      if (!bust) { fd.delete("size"); fd.delete("finish"); }
      if (total > LIMIT) throw new Error("Those photos are too large to send. Try one photo, or a smaller one.");
      const res = await fetch("/", { method: "POST", body: fd });
      if (!res.ok) throw new Error("The form couldn't be sent just now. Please try again, or email Gene.");
      location.assign("/thanks.html?from=quote");
    } catch (x) {
      err.textContent = x.message; err.hidden = false; btn.disabled = false; btn.textContent = label;
    }
  });
}

async function main() {
  updateCount();
  window.addEventListener("cart:change", updateCount);
  wireQuote();
  const { catalog } = await loadData();
  const n = catalog.products.name, p = catalog.products.photo;
  document.querySelectorAll("[data-from-price]").forEach((el) => (el.textContent = money(Math.min(n.unit, p.unit))));
}
main().catch((e) => console.error(e));
