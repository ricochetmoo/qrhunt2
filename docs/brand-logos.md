# Brand logos

Nine PNG lockups and one SVG lockup in `public/brand/`, served at `/brand/...`:
`logo-{linear,stacked,marque}-{black,white,purple}.png`.

`logo-stacked-digital.svg` is the vector stacked Scouts Digital lockup. It uses
Nunito Sans for both wordmark lines and the QR Hunt purple accent.

- `linear` — wordmark beside the mark (~2196×620).
- `stacked` — wordmark under the mark (~1374×1003).
- `marque` — the fleur-de-lis mark on its own (2067×1884).
- `purple` (`#7143dc`, the brand accent), `black` for light grounds, `white` for dark grounds.

```tsx
import Image from "next/image";

// public/ images need explicit width/height (the ratio does the rest)
<Image src="/brand/logo-linear-purple.png" alt="QR Hunt" width={180} height={51} />;
```

`globals.css` exposes the accent as the `--brand` custom property and the `brand`
Tailwind colour (`bg-brand`, `text-brand`, `border-brand`). The poster PDF work
carries the same hex as its `ACCENT`; keep them in sync.
