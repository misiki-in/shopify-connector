# @misiki/shopify-connector

[![NPM Version](https://img.shields.io/npm/v/@misiki/shopify-connector.svg)](https://www.npmjs.com/package/@misiki/shopify-connector)
[![License](https://img.shields.io/npm/l/@misiki/shopify-connector.svg)](https://github.com/misiki-in/shopify-connector/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**The Official TypeScript API Connector for connecting `svelte-commerce` to Shopify E-Commerce Backend.**

`@misiki/shopify-connector` provides a production-ready, fully-typed API client and integration layer that seamlessly bridges [svelte-commerce](https://github.com/misiki-in/svelte-commerce) storefronts with [Shopify](https://shopify.com) headless e-commerce backends, mirroring the full 26-service surface every svelte-commerce connector implements.

> **Coverage:** 16 of 26 services are wired to the live Shopify API.
> The remaining 10 have no Shopify equivalent and return empty placeholder
> data. Each placeholder says why in a comment at the top of its service file.

---

## 🚀 Step-by-Step Integration Guide

Follow these steps to connect `svelte-commerce` with `shopify-connector` and your Shopify backend.

### 1. Install the Connector

Inside your `svelte-commerce` project directory, run:

```bash
bun i @misiki/shopify-connector
```

*(Or using npm / pnpm / yarn):*
```bash
npm install @misiki/shopify-connector
# or
pnpm add @misiki/shopify-connector
```

### 2. Configure `kitcommerce.config.ts`

In `svelte-commerce`, open `kitcommerce.config.ts` and change the `export *` line to import from `@misiki/shopify-connector`:

```typescript
// kitcommerce.config.ts
export * from '@misiki/shopify-connector';
```

### 3. Environment Variables Setup

Add the required environment variables in your `svelte-commerce` `.env` file:

```env
PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_SHOPIFY_ACCESS_TOKEN=your-access-token
PUBLISHABLE_API_URL=http://localhost:5173
```

### 4. Obtaining Environment Settings from Shopify Admin

To get the necessary API configurations from your Shopify backend:

1. **Log into Shopify Admin**:
   - Access your admin dashboard at `https://admin.shopify.com/store/your-store` (or `https://your-store.myshopify.com/admin`).
2. **Navigate to Apps and Custom Apps**:
   - Go to **Settings > Apps and sales channels > Develop apps** (or **Custom Apps**).
3. **Create/Configure Custom App & Access Tokens**:
   - Create a Custom App and configure Admin API / Storefront API scopes.
   - Install the app to generate your Admin API Access Token / Storefront Access Token.
   - Set your store domain and token as the values for `PUBLIC_SHOPIFY_STORE_DOMAIN` and `PUBLIC_SHOPIFY_ACCESS_TOKEN` in your `.env` file.

### 5. Build and Run the Project

Run the development server in `svelte-commerce`:

```bash
bun dev
```

To build and run the production application:

```bash
# Build the project
bun run build

# Preview the built application
bun run preview
```

## Service coverage

| Service | Status |
| --- | --- |
| `client.product` | ✅ live |
| `client.category` | ✅ live |
| `client.collection` | ✅ live |
| `client.order` | ✅ live |
| `client.coupon` | ✅ live |
| `client.address` | ✅ live |
| `client.review` | ⚠️ placeholder (no Shopify equivalent) |
| `client.cart` | ✅ live |
| `client.country` | ⚠️ placeholder (no Shopify equivalent) |
| `client.page` | ⚠️ placeholder (no Shopify equivalent) |
| `client.blog` | ✅ live |
| `client.store` | ✅ live |
| `client.paymentMethod` | ✅ live |
| `client.search` | ✅ live |
| `client.user` | ✅ live |
| `client.auth` | ✅ live |
| `client.profile` | ⚠️ placeholder (no Shopify equivalent) |
| `client.wishlist` | ⚠️ placeholder (no Shopify equivalent) |
| `client.vendor` | ⚠️ placeholder (no Shopify equivalent) |
| `client.checkout` | ✅ live |
| `client.chat` | ⚠️ placeholder (no Shopify equivalent) |
| `client.contact` | ⚠️ placeholder (no Shopify equivalent) |
| `client.enquiry` | ⚠️ placeholder (no Shopify equivalent) |
| `client.faq` | ⚠️ placeholder (no Shopify equivalent) |
| `client.meilisearch` | ✅ live |
| `client.menu` | ✅ live |

## Development

```bash
bun install && bun run build
```

## License

MIT © misiki-in
