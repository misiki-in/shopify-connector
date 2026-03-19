/**
 * Example SvelteKit Proxy for Shopify Admin API
 * 
 * File: src/routes/api/shopify/[...path]/+server.ts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SHOPIFY_STORE_DOMAIN = 'your-store.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = 'your-admin-access-token';

export const fallback: RequestHandler = async ({ request, params, url }) => {
  const path = params.path;
  const searchParams = url.searchParams.toString();
  const shopifyUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/${path}.json${searchParams ? '?' + searchParams : ''}`;

  const headers = new Headers();
  headers.set('X-Shopify-Access-Token', SHOPIFY_ACCESS_TOKEN);
  headers.set('Content-Type', 'application/json');

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    options.body = await request.text();
  }

  try {
    const response = await fetch(shopifyUrl, options);
    const data = await response.json();
    
    return json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust for production
      }
    });
  } catch (error: any) {
    return json({ errors: error.message }, { status: 500 });
  }
};
