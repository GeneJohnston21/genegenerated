# genegenerated.com

Static site for **Gene Generated** — original, designed-in-house multicolor 3D-printed ornaments.

Plain HTML/CSS with a few lines of optional JS. No build step, no dependencies. Open `index.html` in a browser to preview, or run `python3 -m http.server` in this folder and visit http://localhost:8000.

```
index.html          the whole one-page site (hero, ornaments, how it works, craft fair, order form, FAQ, contact)
styles.css          all styles; light + dark mode via prefers-color-scheme
script.js           shows the photo / shipping-address fields only when relevant (form works without it)
thanks.html         where the order form lands after submitting
404.html            not-found page
assets/img/         favicon + placeholder SVGs (swap for real photos/renders)
CNAME               custom domain for GitHub Pages (harmless on other hosts)
.nojekyll           stops GitHub Pages running Jekyll
robots.txt, sitemap.xml
```

## Before launch: TODOs

Every unconfirmed fact is marked on the page with a yellow **TODO** badge (`<mark class="todo">`) or an HTML comment `TODO(Gene)`. Find them all with:

```sh
grep -n "TODO" index.html
```

Delete each badge once the real value is in. Current list:

| Where | What to fill in |
|---|---|
| Name ornament card | Confirm price ($12–20 each, 3 for $45) |
| Photo ornament card | Confirm price ($18–25) |
| Craft fair | Date & hours (around Nov 21–22, 2026) |
| Craft fair | Fair name, venue & address |
| Craft fair | Booth / table number |
| Craft fair | Payment methods accepted |
| FAQ: materials | Confirm PLA + TPU wording |
| FAQ: lead time | Typical turnaround (X–Y days) |
| FAQ: lead time | Last order date for Christmas delivery |
| FAQ: shipping | Pickup location/arrangement |
| FAQ: shipping | Shipping cost & carrier |
| Contact | Set up `hello@genegenerated.com` (mailbox or forwarding) |
| Images (comments) | Replace the three placeholder SVGs with real renders/photos |

### Swapping in product images

Replace these files (or point the `<img src>` at new ones) and update the `alt` text:

| File | Used for | Suggested size |
|---|---|---|
| `assets/img/placeholder-hero.svg` | Hero | 1200×1200, square |
| `assets/img/placeholder-name.svg` | Name ornament card | 800×800 (square; it's cropped square) |
| `assets/img/placeholder-photo.svg` | Photo ornament card | 800×800 square |

JPG/WebP photos are fine — keep each under ~300 KB. If you change the file extension, also update `src` in `index.html` and the `width`/`height` attributes to the image's real size.

## The order form

There's no backend. The form uses **Netlify Forms** markup (`data-netlify="true"`, a honeypot field, and a hidden `form-name`). On Netlify, submissions show up under **Site → Forms**, and you can turn on email notifications under **Site configuration → Notifications → Form submission notifications**. Netlify's free tier includes 100 submissions/month.

**Netlify Forms only work when the site is hosted on Netlify.** On GitHub Pages or Cloudflare Pages, switch to one of these:

### Option A — Formspree (keeps the same form)
1. Sign up at formspree.io, create a form, copy its endpoint (`https://formspree.io/f/xxxxxxx`).
2. In `index.html`, change the `<form …>` tag to:
   ```html
   <form name="custom-order" method="POST" action="https://formspree.io/f/xxxxxxx" class="order-form">
   ```
   (remove `data-netlify` and `netlify-honeypot`; you can delete the hidden `form-name` input).
3. Rename the honeypot input from `bot-field` to `_gotcha`.
4. Add `<input type="hidden" name="_next" value="https://genegenerated.com/thanks.html">` inside the form to keep the thank-you page (paid plans), or let Formspree show its own confirmation page.

### Option B — Google Form
Build an equivalent Google Form, then replace the whole `<form>…</form>` block with a link button (`<a class="btn" href="https://forms.gle/…">Open the order form</a>`) or the form's embed `<iframe>`. Responses land in a Google Sheet.

## Deploying

Recommended: **Netlify**, because the order form works there with zero changes.

### Netlify (recommended)
1. Log in at app.netlify.com → **Add new site → Import an existing project** → GitHub → pick `GeneJohnston21/genegenerated`.
2. Branch to deploy: `main` (merge `initial-site` first) — or pick `initial-site` to try it out.
3. Build command: *leave empty*. Publish directory: `.` (the repo root).
4. Deploy. You'll get a `something.netlify.app` URL — check the site and submit a test order.
5. **Domain management → Add a domain** → `genegenerated.com`. Netlify will also add `www`.
6. Set the DNS records below. Netlify issues the HTTPS certificate automatically once DNS resolves.

### GitHub Pages
1. Repo **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/ (root)`.
2. Custom domain: `genegenerated.com` (the `CNAME` file already says this). Tick **Enforce HTTPS** once the certificate is issued.
3. Swap the form to Formspree or Google Forms (see above) — Netlify Forms won't work here.
4. Set the DNS records below.

### Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
2. Framework preset: *None*. Build command: *empty*. Output directory: `/`.
3. **Custom domains → Set up a custom domain** → `genegenerated.com`, then again for `www.genegenerated.com`.
4. Swap the form to Formspree or Google Forms — Netlify Forms won't work here.
5. DNS: see below (apex requires Cloudflare nameservers).

## DNS records for genegenerated.com

Set these at the domain registrar (where genegenerated.com was bought). Delete any existing parking/"forwarding" A, AAAA or CNAME records for `@` and `www` first. Changes usually apply within an hour, sometimes up to 24–48 h.

Use **only the block for the host you chose.**

### If hosting on Netlify
| Type | Host/Name | Value |
|---|---|---|
| A | `@` | `75.2.60.5` |
| CNAME | `www` | `YOUR-SITE-NAME.netlify.app` |

(`YOUR-SITE-NAME` is shown in Netlify's site overview. Netlify's domain panel shows the exact records too — if they differ from the above, trust Netlify's panel. Alternative: use Netlify DNS by switching the registrar's nameservers to the four Netlify gives you, and skip the records above.)

### If hosting on GitHub Pages
| Type | Host/Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `genejohnston21.github.io` |

Recommended: verify the domain under GitHub **Settings (your profile) → Pages → Add a domain**, which gives you one extra TXT record to add — it prevents domain takeover.

### If hosting on Cloudflare Pages
Cloudflare Pages can only serve the apex (`genegenerated.com`) if Cloudflare runs the domain's DNS:
1. Add `genegenerated.com` as a site in Cloudflare (free plan).
2. At the registrar, change the **nameservers** to the two Cloudflare gives you.
3. Adding the custom domains in the Pages project (step 3 above) then creates the records automatically: `CNAME @ → YOUR-PROJECT.pages.dev` (flattened) and `CNAME www → YOUR-PROJECT.pages.dev`.

### Check it worked
```sh
dig +short genegenerated.com
dig +short www.genegenerated.com
```
Then load https://genegenerated.com and https://www.genegenerated.com — both should show the site with a padlock.
