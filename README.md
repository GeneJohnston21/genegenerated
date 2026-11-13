# genegenerated.com

The shop site for **Gene Generated** personalized ornaments.

- **Home** (`/`): the hero with a 3D ornament you can spin, close-ups, the two ornament styles, the gallery, how it works, craft-fair info, FAQ and contact.
- **Designer** (`/design.html`): type a name or caption, pick bauble or star and colors, spin it in 3D, add it to the cart, and pay with Stripe.
- **Booth** (`/booth.html`): the page the booth QR code opens. There are two tabs, **From the table** (pre-made ornaments: tap, pay, take it home) and **Design one**, with a pay bar fixed at the bottom of the screen.

It's plain HTML, CSS and JavaScript with no build step. The only server code is one small Netlify function that creates the Stripe checkout.

## How the pieces fit

```
index.html, design.html, booth.html, thanks.html, 404.html
styles.css                     all styling ("String of Lights": midnight + tree-light colors)
data/catalog.json              PRICES, shipping, color schemes, limits  ← edit this
data/table-stock.json          pre-made names on the booth table        ← edit this
data/gallery.json              gallery entries                          ← edit this
assets/js/pricing.js           cart checks + pricing (shared by browser AND checkout function)
assets/js/ornament3d.js        3D preview (three.js)
assets/js/orn2d.js             flat drawing (gallery, cart, fallback when 3D isn't available)
assets/js/designer.js          designer controls
assets/js/cartview.js, shop.js cart (kept in the visitor's browser) + checkout call
assets/js/home.js, design-page.js, booth.js, thanks.js   page scripts
assets/vendor/three.module.min.js   three.js r160 (MIT, self-hosted)
assets/fonts/                  Fredoka, Nunito, Pacifico (OFL, self-hosted)
assets/qr/booth-qr-print.png   1800px QR code → genegenerated.com/booth.html (print this)
netlify/functions/create-checkout.js   makes the Stripe Checkout session
netlify.toml                   Netlify settings (+ /api/checkout, /booth, /design shortcuts)
```

### How checkout works
1. The cart lives in the visitor's browser.
2. **Checkout** sends only the cart contents (names, shapes, colors, quantities) to `/api/checkout`, never prices.
3. The function re-checks everything and works out the price from `data/catalog.json`, using the same `pricing.js` the page uses. That covers the 3-for-$45 deal, the photo-install add-on and shipping. It then opens a Stripe Checkout page.
4. The customer pays with a card, Apple Pay or Google Pay. Stripe collects their email and phone, plus a US shipping address if anything needs shipping. Table-only orders skip shipping. Stripe also asks: "Show it in our gallery? (first name only)".
5. They land back on `thanks.html`. At the booth, this screen shows "Paid ✓ Show Gene" and the items to hand over.

**Where you see orders:** Stripe Dashboard → Payments. Each payment lists the line items, and under **Metadata** each item's exact design, for example `2x NAME "Emma" 2026 bauble classic`. `INSTALL-PHOTO` means you email the customer for their photo. The gallery answer is under the checkout session's custom fields. Turn on email alerts in Stripe → Settings → Notifications → "Successful payments".

**Safety switch:** while `"pricesConfirmed": false` in `data/catalog.json`, the site shows TODO badges, and **live (real-money) checkout is refused**. Test-mode checkout still works.

## Before launch: TODO list

Find them all with `grep -rn "TODO" --include=*.html --include=*.json .`

| Where | What |
|---|---|
| `data/catalog.json` | Confirm prices: name $18, 3 for $45, photo $22, photo install +$3, US shipping $6. Then set `"pricesConfirmed": true` |
| `data/catalog.json` | Shipping time text ("about 5 business days") |
| `data/table-stock.json` | Your real list of pre-printed table names (sample names in there now) |
| `data/gallery.json` | Real sample photos (it draws the ornaments until then) |
| Home → Look closer | Three close-up photos: raised name, snowflakes/rim, the flexible back (1200×900) |
| Home → Craft fair | Date & hours, fair name/venue/address, booth number, cash or not |
| Home → FAQ | Confirm materials wording; turnaround days; last order date for Christmas; change/refund policy |
| Home → Contact | Set up `hello@genegenerated.com` (mailbox or forwarding) |
| Color schemes | Check the 6 schemes in `catalog.json` match filaments you actually have |

### Editing common things
- **Table stock:** edit `data/table-stock.json`. Each entry needs a unique `id`, the `name`, a `shape` (`bauble`/`star`) and a `scheme` (see `catalog.json`). Set `"available": false` when one sells out, then commit. Netlify redeploys in about a minute.
- **Gallery photos:** put square JPG/WebP files (~800×800, under 300 KB) in `assets/gallery/` and set `"photo": "/assets/gallery/emma.jpg"`. For a customer's ornament, only add it if they said **Yes** at checkout, use their first name only, and set `"sample": false`.
- **Close-up photos:** in `index.html`, find the three `TODO(Gene)` comments and replace each `<div class="ph">…</div>` with `<img src="/assets/img/closeup-name.jpg" alt="Close-up of the raised name Emma">`.
- **Colors:** each scheme in `catalog.json` has `body` (the ornament), `ink` (name, year, rim, loop) and `accent` (snowflakes).

## Deploy (Netlify)

Checkout needs the Netlify function, so host on **Netlify**. GitHub Pages can't run it. Cloudflare Pages could, but would need the function rewritten.

1. **Stripe:** create an account at stripe.com and finish business verification (needed before live payments). In **Developers → API keys**, copy the **test** secret key (`sk_test_…`).
2. **Netlify:** app.netlify.com → **Add new site → Import an existing project → GitHub** → `GeneJohnston21/genegenerated`.
   - Branch: `main` (merge `initial-site` first), or `initial-site` for a trial.
   - Build command: *empty*. Publish directory: `.`. Netlify reads `netlify.toml` for the rest.
3. **Site configuration → Environment variables → Add:** `STRIPE_SECRET_KEY` = your `sk_test_…` key. Mark it secret. Then **Deploys → Trigger deploy**.
4. **Test it** on the `…netlify.app` address. Buy something with card `4242 4242 4242 4242`, any future date and any CVC. Check it appears in Stripe (test mode) with the design in Metadata. Try `/booth.html` on your phone too.
5. **Go live:** confirm prices and set `"pricesConfirmed": true`. Swap the env var to your **live** key (`sk_live_…`) and redeploy. Do one real $ purchase and refund it in Stripe.
6. **Contact form:** the contact form uses Netlify Forms. Messages appear under **Forms**. Turn on email alerts under **Site configuration → Notifications → Form submission notifications**.
7. **Domain:** **Domain management → Add a domain** → `genegenerated.com` (Netlify adds `www` too). Set DNS as below, and HTTPS turns on automatically.

### Local preview
```sh
python3 -m http.server 8000      # then open http://localhost:8000
```
Everything works except checkout. For checkout locally, use `npx netlify-cli dev` with `STRIPE_SECRET_KEY` set.

## DNS records for genegenerated.com

At your domain registrar, delete any existing parking/forwarding records for `@` and `www`, then add:

| Type | Host/Name | Value |
|---|---|---|
| A | `@` | `75.2.60.5` |
| CNAME | `www` | `YOUR-SITE-NAME.netlify.app` |

`YOUR-SITE-NAME` is shown on the Netlify site overview. If Netlify's domain panel shows different values, use Netlify's. Alternatively, use Netlify DNS by switching your nameservers to the four Netlify lists, and skip the table above.

Check with `dig +short genegenerated.com` and `dig +short www.genegenerated.com`, then open both addresses over https.

## The booth QR code
`assets/qr/booth-qr-print.png` is 1800×1800 px and prints sharp at 6 inches. It points to `https://genegenerated.com/booth.html`, so it only works once the domain is live. Test it with your phone camera before printing.


## Adding a ready-made product

1. Photos: `python tools/clean_photos.py raw/ cleaned/`, check each one, copy the keepers to
   `assets/img/shop/<id>-1.jpg`, `-2.jpg` (the second shows on mouse hover).
2. Add an entry to `shop.items` in `data/catalog.json`: `id` (never reused), `name`, `category`
   (a subcategory id from `shop.departments`, e.g. `christmas`, `halloween`, `controller-holders`,
   `fidgets`), `type` (short label like "Candy bowl"), `blurb`, `price` in cents, `images`,
   `show`, `available`.
3. Departments and subcategories appear on the site on their own once something visible is in
   them. To add a new subcategory, add it under its department in `shop.departments`.
