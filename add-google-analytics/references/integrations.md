# Integration adapters

Use the adapter selected by `inspect-project.mjs`. These are patterns, not blind codemods: preserve the project's language, formatting, component structure, and deployment model.

## Next.js App Router

Install the official package with the detected package manager, preserving its lockfile:

```bash
npm install @next/third-parties
# or the equivalent pnpm, yarn, or bun command
```

In the highest active root `app/layout.{js,jsx,ts,tsx}`, import:

```tsx
import { GoogleAnalytics } from "@next/third-parties/google";
```

For a Vercel-linked project, the root layout is a server component by default, so gate rendering with both production environment and the configured ID:

```tsx
const gaId =
  process.env.VERCEL_ENV === "production"
    ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    : undefined;
```

Render exactly one component near the end of `<body>`:

```tsx
{gaId ? <GoogleAnalytics gaId={gaId} /> : null}
```

Do not turn the root layout into a client component. Enhanced Measurement's page-change setting handles browser-history navigation.

For non-Vercel deployments, use the host's production-only environment configuration. `NODE_ENV=production` alone is insufficient when preview builds also use production mode.

## Next.js Pages Router

Install `@next/third-parties` with the existing package manager. Prefer `pages/_app.{js,jsx,ts,tsx}` and render one `<GoogleAnalytics>` sibling after the active page component:

```tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function App({ Component, pageProps }: AppProps) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      <Component {...pageProps} />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </>
  );
}
```

For Vercel, production-only variable scope is the environment guard: do not define this public variable in preview or development. Do not place a duplicate tag in `_document`.

If both router systems are genuinely active, stop and ask which root owns the relevant routes. Do not add one tag to each automatically.

## Vercel production configuration

Confirm the repository is linked and inspect existing variables before mutation:

```bash
vercel env ls
```

Set the public, non-sensitive Measurement ID for production only, without deploying:

```bash
printf '%s' '<measurement-id>' | \
  vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID production \
    --force --no-sensitive --yes
```

Never add it to preview or development. A Measurement ID is public metadata, but it should still come from `.ga4.json` to avoid drift.

## Static HTML and Vite vanilla JavaScript

Place one loader in each confirmed first-party HTML entry, preferably immediately before `</head>`. Replace both placeholders from `.ga4.json`. The exact hostname allowlist enforces production-only loading:

```html
<script>
  if (["example.com"].includes(window.location.hostname)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", "G-XXXXXXXXXX");

    const googleAnalyticsScript = document.createElement("script");
    googleAnalyticsScript.async = true;
    googleAnalyticsScript.src =
      "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX";
    document.head.appendChild(googleAnalyticsScript);
  }
</script>
```

Do not infer `www`, preview, or platform hostnames. Add only explicitly confirmed production hostnames. Do not edit generated `dist`, `build`, vendored, archived, or test fixture HTML.

If the site already has a shared first-party JavaScript entry guaranteed to execute before route rendering, the loader may live there instead, but it must remain singular and cover every entry.

## Flask with Jinja

Analyze `{% extends %}` declarations. Add the static loader above once to the highest shared base template, normally `templates/base.html`, inside `<head>` and before `</head>`.

Do not also modify child templates that extend the instrumented base. List and separately handle only standalone rendered templates not covered by that inheritance chain. Preserve Jinja whitespace and blocks; if the base exposes a dedicated head-scripts block, place the loader where it is rendered exactly once rather than redefining it in children.

The exact browser hostname allowlist supplies the production guard, so the public Measurement ID need not become a Flask secret or server-side environment variable. If the application already centralizes public runtime configuration, follow that convention instead without exposing private settings.

## Existing analytics and naming collisions

Application modules, pages, or reports named `analytics` are not evidence of GA by themselves. Treat these signatures as actual Google Analytics evidence:

- `googletagmanager.com/gtag/js`
- calls to `gtag(...)`
- a `G-...` Measurement ID
- `@next/third-parties/google`
- `<GoogleAnalytics>`

When found, stop and determine whether the project should adopt the referenced GA property. Never rename unrelated product-analytics code to make room for GA.

## Content Security Policy

A strict CSP requires deliberate `script-src` and `connect-src` handling, and inline loaders require a nonce or hash. Do not weaken policy with `unsafe-inline`, wildcards, or broad Google origins. Stop automatic application and propose a project-specific nonce/hash-aware integration for review.

## Browser verification

Run a production build and local production server using the repository's commands. Use browser automation capable of inspecting requests:

1. Register interception for `googletagmanager.com` and Google Analytics collection endpoints before navigation.
2. Navigate with the production condition enabled.
3. Confirm one tag load and a page-view collection request with the `.ga4.json` Measurement ID.
4. Abort collection requests so test events are not ingested.
5. Navigate client-side in Next.js and confirm one additional page-view request, not duplicates.
6. Run with the production condition disabled or a non-allowlisted hostname and confirm no GA requests.

Do not use the presence of a global `gtag` function alone as proof; verify the network behavior.
