"""Product photo cleanup: cut the piece out of its background and recompose it on the shop's
off-white, centred on a common floor line with a soft contact shadow. 1000 x 1000 JPGs, ready
for assets/img/shop/.

    pip install "rembg[cpu]" pillow pillow-heif scipy
    python tools/clean_photos.py IN_DIR OUT_DIR            # takes .jpg .jpeg .png .heic

The first run downloads the BiRefNet-lite model (~200 MB). It handles silver-on-white and thin
script far better than rembg's default. Check every result: a strip of backdrop fused to the
piece survives (drop that photo and use another angle).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps
from rembg import new_session, remove
from scipy import ndimage

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

BG = (247, 245, 242)
OUT = 1000


def clean(im, sess):
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    cut = remove(im, session=sess, post_process_mask=True)
    a = np.array(cut.split()[-1])
    a = np.where(a < 12, 0, a).astype(np.uint8)
    # keep the piece; drop specks and bits of backdrop touching the frame edge
    lab, n = ndimage.label(a > 40)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        big = int(np.argmax(sizes)) + 1
        edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0, big}
        ok = [i + 1 for i in range(n) if sizes[i] >= 0.03 * sizes.max() and (i + 1) not in edge]
        a = np.where(ndimage.binary_dilation(np.isin(lab, ok), iterations=6), a, 0).astype(np.uint8)
    cut.putalpha(Image.fromarray(a))
    ys, xs = np.where(a > 40)
    obj = cut.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = 0.80 * OUT / max(obj.size)
    obj = obj.resize((max(1, int(obj.width * s)), max(1, int(obj.height * s))), Image.LANCZOS)
    canvas = Image.new("RGB", (OUT, OUT), BG)
    ox, oy = (OUT - obj.width) // 2, int(OUT * 0.90) - obj.height
    sh = obj.split()[-1].resize((obj.width, max(1, obj.height // 10)))
    shadow = Image.new("L", (OUT, OUT), 0)
    shadow.paste(sh, (ox, oy + obj.height - sh.height // 2))
    shadow = shadow.filter(ImageFilter.GaussianBlur(11)).point(lambda v: int(v * 0.35))
    canvas = Image.composite(Image.new("RGB", (OUT, OUT), (180, 176, 170)), canvas, shadow)
    canvas.paste(obj, (ox, oy), obj)
    return canvas


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    sess = new_session("birefnet-general-lite")
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png", ".heic")):
            continue
        out = os.path.join(dst, os.path.splitext(f)[0] + ".jpg")
        clean(Image.open(os.path.join(src, f)), sess).save(out, quality=80, optimize=True, progressive=True)
        print(out)


if __name__ == "__main__":
    main()
