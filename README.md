# Hamthel Smart Living

Faithful storefront reproduction of the user-provided Hamthel Base44 site, imported November 5, 2026. Includes 167 published products, seven categories, four hero slides, nine testimonials and six FAQs. All 57 catalogue image assets are copied locally. Existing private customer records, credentials and historical orders were not requested or imported.

The React storefront is preserved in `public/assets/storefront.js` and its stylesheet. The Base44 client initialization is replaced with `window.hslClient` from `store-client.js`; storefront requests use this Site's API and D1 database. Original Base44 SDK and authentication implementation present in the compiled vendor bundle are unused. All account entry pages use ChatGPT sign-in. No Base44 credentials or remote write access are used.

`lib/store-api.ts` implements independent catalogue CRUD, orders, contact inbox and subscribers. First authenticated owner enrollment occurs while the Site is owner-private. The stored owner ID remains required for administration even if the Site is subsequently shared. Other visitors cannot read inboxes or edit catalogue records. Product prices, stock eligibility, quantities, shipping and totals are recalculated server-side at checkout. Orders await confirmation; no payment is charged online, matching the source checkout.

The product helper performs catalogue keyword search; an external generative AI and photo-understanding provider is not connected. The original source had no active video showcase records, so that page retains its empty state. Support uses the original public phone, email and WhatsApp contact links. No email notification provider is connected; enquiries, subscribers and orders are stored in the admin dashboard.

## Local workflow

Run the Sites installation and build helpers. Generate new schema migrations with `npm run db:generate`; never rewrite applied migrations. The initial schema is in `drizzle/0000_yummy_sugar_man.sql`. Catalogue seeding uses an idempotent runtime import from `data/catalogue.json`, not migration SQL. The seed never overwrites admin changes on subsequent deployments.

Use the managed Sites preview for browser QA. Publish through the repository source helper and the native Sites deployment flow. The hosting manifest declares the DB binding. Auth-dependent APIs and HTML use no-store caching.
