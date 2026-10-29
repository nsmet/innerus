# InnerUs website

Astro static website for the planned InnerUs 2.0 release. The landing page, support, privacy and terms use clean URLs: `/`, `/support/`, `/privacy/` and `/terms/`. Existing app links to `/support.html` and `/privacy.html` redirect to the corresponding new pages in Cloudflare Pages; the browser should retain fragments such as `#nl`. The app's URL constants must remain unchanged until a deliberate app release changes them.

## Develop and build

This is a separate project from the Expo app. It uses Node 24 (see `.nvmrc`); the app still uses its own Node 22 configuration.

```sh
cd landing-site
nvm use
npm ci
npm run dev
npm run build
```

The editable content is in `src/content/`, page metadata and routes in `src/pages/`, the shared HTML metadata in `src/layouts/`, and images/fonts and Cloudflare files in `public/`. The site builds to `dist/`; edit the sources, not generated files. Its pages render as static HTML without client-side application JavaScript, analytics, contact forms or externally hosted fonts. Email links open the visitor's email app.

## Cloudflare Pages

For a direct upload, build first and upload the **contents** of `dist/`, including `_redirects` and `_headers`, or run `npx wrangler pages deploy dist --project-name <your-project> --branch main`. For Git integration, set the project root to `landing-site`, the build command to `npm run build`, output directory to `dist`, and Node version to 24. Cloudflare's environment must install dependencies from the lockfile. Direct Upload projects cannot later switch to Git integration; create a separate Git-integrated project if automated deployments are desired. Attach `innerus.app` in the Pages custom domain settings after checking existing DNS and email configuration. Custom domains, deployment and legacy redirects must be tested on Cloudflare; Astro's preview server does not apply Cloudflare's `_redirects`.

Canonical metadata, social sharing tags, robots.txt and sitemap.xml assume `https://innerus.app`. Do not change that production identity without updating `astro.config.mjs`, the sitemap and robots file together. Cloudflare preview URLs are not the canonical site.

## Before a public launch

- The site describes the planned 2.0 app, not the existing v1 release. Replace the contact CTA with the verified App Store listing when 2.0 is approved and released. Confirm pricing and product setup, screenshots, translations and app capabilities against the shipped build.
- Privacy is a working draft. Verify the actual Cloudflare configuration, request logs, security features and retention, email provider and retention, legacy Firebase data and deletion plan, controller contact details and legal bases/rights with the owner and a qualified privacy reviewer. Update both languages and the date together.
- Verify `/privacy.html#nl` and `/support.html#nl` redirect and retain the language fragment on the actual Cloudflare deployment. Review `store/web` and app/store links when publishing so all copies agree.
- Confirm the designer supplied illustrations and interface mockups are licensed and accurately represent the release.
- The terms page explains that Apple's Standard EULA applies unless a custom EULA is set in App Store Connect. Website terms and privacy policy remain drafts pending factual and legal review; see `docs/WEBSITE_RELEASE_REVIEW.md`.

## Search visibility

The homepage has English (`/`) and Dutch (`/nl/`) versions with visible language links and reciprocal `hreflang` tags. Privacy, support and terms remain bilingual on a single page with language anchors; those anchors are for readers, not separate language-specific search URLs. If Dutch search visibility for those pages becomes important, split them into separately translated URLs and preserve the existing anchors.

Each indexed route has its own title, description and canonical URL; the home page also includes WebSite structured data. The sitemap and robots file use `https://innerus.app`. Images have intrinsic dimensions and descriptive alt text, and the site provides a PNG search favicon and iOS touch icon. The 404 page is excluded from indexing.

After publishing and connecting the real domain, verify ownership in Google Search Console, submit `https://innerus.app/sitemap.xml`, and use URL Inspection on the English and Dutch landing pages. Confirm public URLs, canonical metadata, old links, crawlability and both mobile layouts. Search engines choose their own snippets and indexing/ranking is not guaranteed. Have the Dutch marketing copy reviewed with the rest of the launch translations. Do not submit a private preview as the production site.
