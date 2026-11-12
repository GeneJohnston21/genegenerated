// Flat SVG ornament drawing. Used for the gallery, the cart thumbnails,
// and as a fallback when a phone can't run the 3D preview.
let uid = 0;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function flake(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M0-8V8M-7-4 7 4M-7 4 7-4"/></g>`;
}

export function starPoints(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer, a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function ornamentSVG({ kind = "name", text = "", year = "2026", shape = "bauble", scheme }, schemes) {
  const s = schemes[scheme] || Object.values(schemes)[0];
  const id = "gg" + ++uid;
  const label = (text || "").trim() || (kind === "photo" ? "Caption" : "Your Name");
  const len = Math.max(label.length, 3);
  const defs = `<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient></defs>`;
  const hang = `<path d="M100 0v20" stroke="#8a90b8" stroke-width="2"/><circle cx="100" cy="27" r="8" fill="none" stroke="${s.ink}" stroke-width="4"/>`;
  let body = "", art = "";
  const cy = 125;

  if (shape === "star") {
    const p = starPoints(100, 128, 92, 44).map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    body = `<polygon points="${p}" fill="${s.body}" stroke="${s.ink}" stroke-width="3" stroke-linejoin="round"/><polygon points="${p}" fill="url(#${id})"/>`;
  } else {
    body = `<circle cx="100" cy="${cy}" r="88" fill="${s.body}"/><circle cx="100" cy="${cy}" r="88" fill="url(#${id})"/><circle cx="100" cy="${cy}" r="81" fill="none" stroke="${s.ink}" stroke-width="3"/>`;
  }

  if (kind === "photo") {
    const r = shape === "star" ? 40 : 52;
    art = `<circle cx="100" cy="${cy - 6}" r="${r + 4}" fill="${s.ink}"/><circle cx="100" cy="${cy - 6}" r="${r}" fill="#dfe3f2"/><g fill="#b8bfdc"><circle cx="100" cy="${cy - 18}" r="${r * 0.3}"/><path d="M${100 - r * 0.62} ${cy + r * 0.62 - 6}c${r * 0.1}-${r * 0.5} ${r * 0.35}-${r * 0.65} ${r * 0.62}-${r * 0.65}s${r * 0.52} ${r * 0.15} ${r * 0.62} ${r * 0.65}z"/></g>`;
    const fs = Math.min(shape === "star" ? 13 : 17, 150 / len * 1.4);
    art += `<text x="100" y="${shape === "star" ? 190 : 196}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="${fs.toFixed(1)}" fill="${s.ink}">${esc(label)}</text>`;
  } else if (shape === "star") {
    const fs = Math.min(30, (170 / len) * 1.25);
    art = `<text x="100" y="${(128 + fs * 0.3).toFixed(1)}" text-anchor="middle" font-family="Pacifico, cursive" font-size="${fs.toFixed(1)}" fill="${s.ink}">${esc(label)}</text><text x="100" y="164" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" letter-spacing="2" fill="${s.accent}">${esc(year)}</text>`;
  } else {
    const fs = Math.min(44, (220 / len) * 1.2);
    art = `<text x="100" y="${(128 + fs * 0.25).toFixed(1)}" text-anchor="middle" font-family="Pacifico, cursive" font-size="${fs.toFixed(1)}" fill="${s.ink}">${esc(label)}</text><text x="100" y="178" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="17" letter-spacing="4" fill="${s.ink}">${esc(year)}</text>${flake(62, 82, 1, s.accent)}${flake(138, 82, 1, s.accent)}${flake(100, 197, 0.8, s.accent)}`;
  }
  const what = kind === "photo" ? "Photo ornament" : "Ornament";
  return `<svg viewBox="0 -4 200 224" role="img" aria-label="${what}: ${esc(label)}, ${shape === "star" ? "star" : "round bauble"}, ${esc(s.label)}">${defs}${hang}${body}${art}</svg>`;
}
