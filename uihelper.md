# UI Helper

Sites and libraries for making the app look and feel better. Picked for this stack:
Next.js 16 (App Router), React 19, Tailwind v4. There's no animation library installed yet.

## Start here

If you only add a few things, add these:

| Need | Use | Why |
|---|---|---|
| Animations in React (hover, tap, enter/exit, layout) | [Motion](https://motion.dev/) | The standard React animation library. Most component sites below are built on it. |
| Page transitions | React `ViewTransition` (built in) | Works in the App Router with no config. Read `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` |
| Ready-made animated components | [Magic UI](https://magicui.net/), [React Bits](https://reactbits.dev) | Free (MIT), copy-paste, Tailwind |
| Buttons and loaders | [Uiverse](https://uiverse.io/) | 4,000+ free CSS/Tailwind elements |
| Smooth scrolling | [Lenis](https://lenis.dev/) | Under 5 kB. Native scrollbar, doesn't hurt accessibility |

## Animation engines

- [Motion](https://motion.dev/) (formerly Framer Motion). Import from `motion/react`, not `framer-motion`.
  Covers gestures (`whileHover`, `whileTap`), scroll (`useScroll`, `whileInView`), layout and shared-element animations, and `AnimatePresence` for exit animations.
- [GSAP](https://gsap.com/) is free for everyone, including commercial use, with every plugin (ScrollTrigger, SplitText, Flip, MorphSVG). Use it for timeline-heavy work like pinned scroll sections or text splitting. Use `@gsap/react` (`useGSAP`) in React.
- [Lenis](https://lenis.dev/) adds smooth scrolling and works with GSAP ScrollTrigger.
- [Rive](https://rive.app/) builds interactive vector animations with state machines, like animated mascots or toggles. `@rive-app/react-canvas`.
- [Lottie](https://lottiefiles.com/) plays After Effects animations exported as JSON. `lottie-react` or `@lottiefiles/dotlottie-react`.

## Copy-paste component libraries

| Site | What's good there | Cost |
|---|---|---|
| [Magic UI](https://magicui.net/) | Marquees, bento grids, number tickers, animated beams, text effects. Works with shadcn | Free, MIT |
| [React Bits](https://reactbits.dev) | Animated backgrounds, text reveals, cursor effects. JS/TS and CSS/Tailwind versions of each | Free, MIT (Pro tier exists) |
| [Aceternity UI](https://ui.aceternity.com/) | Heroes, spotlight cards, 3D card tilt, parallax scroll, Tailwind buttons | Free tier + paid |
| [shadcn/ui](https://ui.shadcn.com/) | The base components (dialogs, forms, tables) that the other libraries build on. Not animated itself | Free, MIT |
| [SmoothUI](https://smoothui.dev/) | Small, polished interactive components | Free |
| [Uiverse](https://uiverse.io/) | Community buttons, loaders, toggles, checkboxes, cards, 3D elements | Free, MIT |

Most of these install with `npx shadcn@latest add <url>` or are plain copy-paste. They usually need `motion` and sometimes `clsx` and `tailwind-merge`.

## Scroll animations

- Motion's [`whileInView`](https://motion.dev/docs/react-animation) handles fade/slide on scroll. Use `useScroll` + `useTransform` for parallax and progress bars.
- GSAP ScrollTrigger handles pinning, scrubbing, and horizontal scroll sections.
- [Codrops](https://tympanus.net/codrops/tag/scroll/) has free tutorials with source code. From 2026:
  - [SVG mask transitions on scroll](https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/)
  - [Infinite scroll gallery with parallax + Flip](https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/)
  - [Seamless infinite scroll with GSAP + Lenis](https://tympanus.net/codrops/2026/05/28/the-never-ending-story-building-a-seamless-infinite-scroll-experience-with-gsap-lenis/)
  - [3D image rotations on scroll](https://tympanus.net/codrops/2026/06/18/exploring-3d-image-rotations-on-scroll/)
- Native CSS scroll-driven animations (`animation-timeline: view()`) need no JS. Check [caniuse](https://caniuse.com/?search=animation-timeline) because browser support is uneven.

## Page and state transitions

- [Next.js view transitions guide](https://nextjs.org/docs/app/guides/view-transitions) covers shared-element morphs, skeleton-to-content swaps, slide-left/right navigation, and crossfades. `import { ViewTransition } from 'react'`. Put the wrapper in each `page.tsx`, not in the layout.
- Motion's `AnimatePresence` handles modals, toasts, and list items entering or leaving.
- Motion's `layout` prop animates reordering and resizing, like a table row moving when stock changes.

## Buttons and click effects

- [CodeFronts: 36 Tailwind button hover effects](https://codefronts.com/motion/tailwind-css-button-hover-effects/) covers wipes, ripples, 3D press, magnetic buttons, and "Add → Added ✓" swaps. Each guards against reduced motion and explains how it works.
- [Uiverse animated buttons](https://uiverse.io/ui/animated-buttons) and [Tailwind buttons](https://uiverse.io/ui/tailwind-buttons)
- [Aceternity Tailwind buttons](https://www.aceternity.com/tools/tailwindcss-buttons)
- A quick tap effect without a library: `active:scale-95 transition-transform`. With Motion: `whileTap={{ scale: 0.95 }}`.

## Loaders and skeletons

- [CSS Loader Library (Colorion)](https://cssloaders.colorion.co/) has 99 pure-CSS loaders with one colour token, and they respect reduced motion.
- [Uiverse loaders](https://uiverse.io/ui/css-loaders)
- [FreeFrontend CSS loaders](https://freefrontend.com/css-loaders/) and [spinners](https://freefrontend.com/css-spinners/)
- [CodeFronts spinners](https://codefronts.com/motion/css-spinner-designs/) and [loaders](https://codefronts.com/motion/css-loader-designs/)
- [CSS Loader Generator](https://tools.completejavascript.com/css-loader-generator/) lets you tweak a loader before copying it.
- In Next, a `loading.tsx` with a skeleton (`animate-pulse` blocks shaped like the real content) usually feels faster than a spinner.

## Backgrounds and visual effects

- [React Bits backgrounds](https://reactbits.dev): aurora, particles, grids, waves
- [Neat](https://neat.firecms.co/gradient-generator/) makes animated WebGL gradients and exports them as config, PNG, or MP4. No account needed.
- [MagicPattern shader backgrounds](https://www.magicpattern.design/tools/shader-background-generator)
- [shader.gallery](https://shader.gallery/) has glowing shaders you can copy as raw GLSL.
- [Unicorn Studio](https://www.unicorn.studio/docs/example-projects/) is a no-code WebGL effects editor with embeddable examples.
- [FreeFrontend: 60+ JS background effects](https://freefrontend.com/javascript-background-effects/)

## 3D

- [Spline](https://spline.design/examples) is a Figma-style 3D editor. Embed with `@splinetool/react-spline`, or export as React Three Fiber code. Its [3D library](https://docs.spline.design/doc/3d-library/docGDIEbuh0A) models are free for commercial use.
- [React Three Fiber](https://r3f.docs.pmnd.rs/) is Three.js as React components. Add [drei](https://github.com/pmndrs/drei) for ready-made helpers like controls, text, environments, and floating objects.
- Free models (GLB/GLTF):
  - [threejsassets.com](https://threejsassets.com/): ~780 web-optimised models, commercial use OK
  - [3dassets.dev](https://3dassets.dev/): 10,000+ CC0 GLB models
  - [Poly Pizza](https://poly.pizza/), [Kenney](https://kenney.nl/assets), and [Sketchfab](https://sketchfab.com/) (check each model's licence)
- [Best Three.js websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026) breaks down how real sites were built.

## Animated icons

- [AnimateIcons](https://animateicons.in/) has 680+ open-source animated SVG icons built on `motion/react`.
- [Iconimate](https://iconimate.app/)
- [LottieFiles free icon animations](https://lottiefiles.com/free-animations/icon-animations)
- [Flaticon animated icons](https://www.flaticon.com/animated-icons) (limited free tier)
- [12 free Lottie sources cleared for commercial use](https://www.moonb.io/blog/free-lottie-animations)

## Inspiration (with AI prompts)

- [Ripplix](https://www.ripplix.com/platform/website) has 4,000+ recorded micro-interactions from real sites (Stripe, Linear, Vercel). Each one comes with an AI prompt you can paste.
- [Norrly](https://norrly.io/) has 350+ sites, each with a scroll recording, palette, and full vibe-coding prompt.
- [Awwwards](https://www.awwwards.com/websites/) collects award-winning sites.
- [Selected Screens](https://selectedscreens.com/) curates heroes, dashboards, and product UI.
- [Codrops](https://tympanus.net/codrops/) has creative tutorials and demos with source.

## Timing tools

- [easings.net](https://easings.net/) is a cheat sheet of easing curves.
- [cubic-bezier.com](https://cubic-bezier.com/) lets you build and preview custom curves.
- Rules of thumb: hovers and taps take 150–200 ms, enter animations 200–400 ms, and page transitions under 500 ms.

## Things to watch in this project

- Anything using Motion, GSAP, Lenis, or R3F hooks must be a Client Component (`'use client'`). Keep those wrappers small so pages stay server-rendered.
- Pin versions: `npm install motion --save-exact` (project rule).
- Respect reduced motion: Tailwind `motion-safe:` / `motion-reduce:`, Motion's `useReducedMotion()`, and GSAP's `gsap.matchMedia()`.
- Animate `transform` and `opacity` only. Animating `width`, `height`, or `top` causes jank. Prefer `transition-transform` over `transition-all`.
- Every `hover:` style needs a matching `focus-visible:` style so keyboard users see it too.
- 3D and WebGL are heavy. Load them with `next/dynamic` and `ssr: false`, and keep them off pages people use all day (stock entry, tables). StockSense is a working tool, so fast and clear matters more than flashy.
