/*
 * Shared cart validation + pricing.
 * Used by the browser (shows totals) AND by the checkout function (decides the charge),
 * so the price a customer sees is the price Stripe charges. The server never trusts
 * prices from the browser; it only receives the cart and recomputes everything here.
 */
(function (root) {
  var NAME_RE = /^[\p{L}\p{N} .,'’&!\-]+$/u;
  var YEAR_RE = /^20\d\d$/;

  function cleanText(v, max) {
    if (typeof v !== "string") return null;
    var s = v.replace(/\s+/g, " ").trim();
    if (!s || s.length > max || !NAME_RE.test(s)) return null;
    return s;
  }

  function cleanQty(v, max) {
    var n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > max) return null;
    return n;
  }

  function describe(item, catalog) {
    var shape = catalog.shapes[item.shape];
    var scheme = catalog.schemes[item.scheme].label;
    return shape + " · " + scheme + " · " + item.year;
  }

  // Returns { ok, errors[], items[] (cleaned), lines[], subtotal, needsShipping, canShip, unitsForBundle }
  // opts.fulfillment: "ship" (default) or "pickup" (free local pickup, no shipping charged).
  function priceCart(rawCart, catalog, stock, opts) {
    var pickup = !!(opts && opts.fulfillment === "pickup");
    var errors = [];
    var items = [];
    var L = catalog.limits;
    var stockById = {};
    (stock && stock.items || []).forEach(function (s) { stockById[s.id] = s; });

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return { ok: false, errors: ["Your cart is empty."], items: [], lines: [], subtotal: 0, needsShipping: false };
    }
    if (rawCart.length > 25) errors.push("That's a lot of ornaments! For orders over 25 lines, use the contact form.");

    rawCart.slice(0, 25).forEach(function (raw, i) {
      var n = i + 1;
      if (!raw || typeof raw !== "object") { errors.push("Item " + n + " is not valid."); return; }
      var qty = cleanQty(raw.qty, L.qtyMax);
      if (qty === null) { errors.push("Item " + n + ": quantity must be 1–" + L.qtyMax + "."); return; }

      if (raw.kind === "shop") {
        var sp = (catalog.shop && catalog.shop.items || []).find(function (x) { return x.id === raw.id; });
        if (!sp || !sp.show || !sp.available) { errors.push("Item " + n + ": that piece is no longer available."); return; }
        items.push({ kind: "shop", id: sp.id, name: sp.name, qty: qty });
        return;
      }

      if (raw.kind === "table") {
        var s = stockById[raw.id];
        if (!s || !s.available) { errors.push("Item " + n + ": that table ornament is no longer available."); return; }
        items.push({ kind: "table", id: s.id, name: s.name, shape: s.shape, scheme: s.scheme, year: "2026", qty: qty });
        return;
      }

      if (raw.kind !== "name" && raw.kind !== "photo") { errors.push("Item " + n + ": unknown ornament type."); return; }
      if (!catalog.shapes[raw.shape]) { errors.push("Item " + n + ": pick a bauble or star."); return; }
      if (!catalog.schemes[raw.scheme]) { errors.push("Item " + n + ": pick a color scheme."); return; }
      var year = String(raw.year || "");
      if (!YEAR_RE.test(year)) { errors.push("Item " + n + ": the year must look like 2026."); return; }
      var max = raw.kind === "name" ? L.nameMax : L.captionMax;
      var text = cleanText(raw.text, max);
      if (text === null) { errors.push("Item " + n + ": the name can be up to " + max + " letters, numbers, spaces and simple punctuation."); return; }

      var item = { kind: raw.kind, text: text, year: year, shape: raw.shape, scheme: raw.scheme, qty: qty };
      if (raw.kind === "photo") item.install = raw.install === true;
      items.push(item);
    });

    // Build price lines. Bundle-eligible units (name + table) are pooled in cart order:
    // every full group of `size` units is charged at the bundle price.
    var lines = [];
    var bundle = catalog.products.name.bundle;
    var eligibleTotal = 0;
    items.forEach(function (it) { if (it.kind === "name" || it.kind === "table") eligibleTotal += it.qty; });
    var bundledLeft = bundle ? Math.floor(eligibleTotal / bundle.size) * bundle.size : 0;
    var bundleUnit = bundle ? Math.round(bundle.price / bundle.size) : 0;

    items.forEach(function (it) {
      if (it.kind === "shop") {
        var sp = catalog.shop.items.find(function (x) { return x.id === it.id; });
        lines.push({ title: sp.name, description: "Ready-made · printed by Gene", unit: sp.price, qty: it.qty });
        return;
      }
      var p = catalog.products[it.kind];
      var title = it.kind === "table"
        ? p.label + ": “" + it.name + "”"
        : p.label + ": “" + it.text + "”";
      var desc = describe(it, catalog);
      if (it.kind === "photo") {
        desc += it.install ? " · Gene installs photo" : " · You add your photo";
        lines.push({ title: title, description: desc, unit: p.unit, qty: it.qty });
        if (it.install) lines.push({ title: catalog.photoInstall.label + " (" + it.text + ")", description: "Gene will email you to get the photo.", unit: catalog.photoInstall.price, qty: it.qty });
        return;
      }
      var inBundle = Math.min(bundledLeft, it.qty);
      bundledLeft -= inBundle;
      if (inBundle > 0) lines.push({ title: title, description: desc + " · " + bundle.size + "-for-$" + (bundle.price / 100) + " deal", unit: bundleUnit, qty: inBundle });
      if (it.qty - inBundle > 0) lines.push({ title: title, description: desc, unit: p.unit, qty: it.qty - inBundle });
    });

    var subtotal = lines.reduce(function (a, l) { return a + l.unit * l.qty; }, 0);
    // Table ornaments go home with the customer; everything else ships unless they pick up.
    var canShip = items.some(function (it) { return it.kind !== "table"; });
    var needsShipping = canShip && !pickup;
    // How many more name ornaments until the next bundle kicks in (for a friendly hint).
    var toNextBundle = bundle ? (bundle.size - (eligibleTotal % bundle.size)) % bundle.size : 0;

    return { ok: errors.length === 0 && items.length > 0, errors: errors, items: items, lines: lines, subtotal: subtotal, needsShipping: needsShipping, canShip: canShip, pickup: pickup && canShip, eligibleTotal: eligibleTotal, toNextBundle: toNextBundle };
  }

  function money(cents) {
    return "$" + (cents / 100).toFixed(cents % 100 ? 2 : 0);
  }

  var api = { priceCart: priceCart, money: money };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GGPricing = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
