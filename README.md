# Hamthel Smart Living

Faithful storefront reproduction of the user-provided Hamthel Base44 site, imported November 5, 2026. Includes 167 published products, seven categories, four hero slides, nine testimonials and six FAQs. All 57 catalogue image assets are copied locally. Existing private customer records, credentials and historical orders were not requested or imported.

The React storefront is preserved in `public/assets/storefront.js` and its stylesheet. The Base44 client initialization is replaced with `window.hslClient` from `store-client.js`; storefront requests use this Site's API and D1 database. Original Base44 SDK and authentication implementation present in the compiled vendor bundle are unused. All account entry pages use ChatGPT sign-in. No Base44 credentials or remote write access are used.

`lib/store-api.ts` implements independent catalogue CRUD, orders, contact inbox and subscribers. Administration is restricted to the verified Site owner identity; public visitors cannot enroll as administrators. Other visitors cannot read inboxes or edit catalogue records. Product prices, stock eligibility, quantities, shipping and totals are recalculated server-side at checkout. Orders await confirmation; no payment is charged online, matching the source checkout.

The product helper performs catalogue keyword search; an external generative AI and photo-understanding provider is not connected. The original source had no active video showcase records, so that page retains its empty state. Support uses the original public phone, email and WhatsApp contact links. Owner media uploads are stored in R2 (up to 30 MB per file). Customers can download an order acknowledgement after checkout. Pay on delivery is restricted to Lagos and Abuja. No email notification provider is connected; enquiries, subscribers and orders are stored in the admin dashboard.

## Local workflow

Run the Sites installation and build helpers. Generate new schema migrations with `npm run db:generate`; never rewrite applied migrations. The initial schema is in `drizzle/0000_yummy_sugar_man.sql`. Catalogue seeding uses an idempotent runtime import from `data/catalogue.json`, not migration SQL. The seed never overwrites admin changes on subsequent deployments.

Use the managed Sites preview for browser QA. Publish through the repository source helper and the native Sites deployment flow. The hosting manifest declares the DB binding. Auth-dependent APIs and HTML use no-store caching.

## Marketplace update

The public home, shop, product, comparison, saved-products, video library and checkout pages now use `public/marketplace/marketplace.js` and `marketplace.css`. Existing admin and informational pages retain the original storefront. Cart storage remains compatible with the prior checkout; favourites and comparisons are saved only in the visitor's browser.

Discounted products retain their list (`compare_price`) price and sell at 80% of that list price. The idempotent `discount20-v1` runtime correction updates existing D1 product records without rewriting historical orders or unrelated catalogue fields. Future discounted product edits also enforce 20% off.

Every imported smart lock has an individual six-second MP4 overview under `public/videos/`. These are animated catalogue-image showcases, labelled as such, not operating or installation footage. Generate them with `python scripts/create-product-videos.py` (Pillow and FFmpeg required). Admin-uploaded `video_url` footage takes priority over the generated overview. The video library includes search and pagination. Price, availability, stock and the final order total remain validated server-side.

## Interactive experience

`experience.js` / `experience.css` restore the four-slide hero using current HeroSlide records, scroll reveals, hover motion, quick-view dialogs, a lock-finder dialog, a once-per-session factual product spotlight, support/contact options, reading progress and back-to-top navigation. Slideshow playback can be paused and reduced-motion preferences are respected. No invented live purchases or customer alerts are shown.

The Ask Hamthel guide is a local catalogue-based recommender, not a generative AI service. It understands product keywords, supported categories, brands and numeric budgets, preserves budget context within the conversation, filters unavailable items and links to current product pages. Chat is kept only in page memory. No AI provider or photo analysis is configured. Test its commercial constraints with `node tests/experience.cjs`.

## Consistent customer pages

The About, Contact, FAQ, Customer Stories and four-step Lock Finder pages now share the marketplace header, navigation, navy/gold theme, footer and interactive experience. About content and contact details use SiteConfig; FAQs and testimonials read their current published database records. The contact form saves enquiries into the existing administrator inbox and displays a confirmation after a successful write. FAQ search and testimonial rating filters operate locally. The full lock finder filters in-stock catalogue records by door type, desired access, budget and use, with explicit compatibility guidance.

Customer navigation includes these pages across the site. Unknown public routes render a matching 404, while administrator and authentication routes retain their working store-management views. Run `node tests/page-flows.cjs` for lock-finder constraints, and `npm test` for enquiry persistence and access controls.
