<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Build gotchas

Two toolchain traps that both present as "the styles are just gone", and neither
produces an error. Read these before debugging missing CSS.

## `backdrop-filter` must be UNPREFIXED only

Hand-writing a `-webkit-backdrop-filter` declaration in `globals.css` suppresses
the unprefixed `backdrop-filter` in this Tailwind v4 / Lightning CSS pipeline, so
every Liquid Glass panel renders with its translucent fill and **no blur** in
modern Chrome and Firefox. Write only `backdrop-filter:` and let the toolchain
auto-prefix for old Safari.

Verify with `getComputedStyle(panel).backdropFilter` — it must report a real
`blur(...)`, not `none` — and check the compiled CSS carries both forms. The full
note lives beside the rules it governs, in the `.studio` and `.share` block
headers in `src/app/globals.css`.

## Never run `npm run build` while `next dev` is live

Both write to the same `.next` directory, and the production build empties the
dev CSS chunk. The dev server keeps serving happily, but `globals.css` arrives
with **zero rules**: glass panels lose their fill, `.share` / `.studio` / `.landing`
scoped styles vanish, and `getComputedStyle` reports values as though the
stylesheet were never loaded (e.g. `background: rgba(0, 0, 0, 0)` on an element
that plainly sets one).

Nothing warns you, and the source is fine — so it reads like a CSS bug and sends
you chasing specificity or cascade problems that don't exist. It also silently
invalidates any browser verification done after the build.

Stop the dev server before building. To recover:

```bash
rm -rf .next
```

then restart `next dev` and re-take any measurements from before the build.
