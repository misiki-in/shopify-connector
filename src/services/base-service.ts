import base32 from 'hi-base32';
import { isRestPath, resolveRestLocally } from './rest-guard'

export const PUBLIC_SHOPIFY_API_PREFIX = "/admin/api/2026-01"

export let SHOPIFY_STORE_DOMAIN: string = ''
export let SHOPIFY_ACCESS_TOKEN: string = ''
export let SHOPIFY_STOREFRONT_ACCESS_TOKEN: string = ''
export let SHOPIFY_PROXY_URL: string | null = '/api/shopify' // Optional proxy URL

/**
 * BaseService provides core HTTP functionality for all service classes.
 */
export class BaseService {
  private _fetch: typeof fetch

  constructor(fetchFn?: typeof fetch) {
    this._fetch = fetchFn || (typeof fetch !== 'undefined' ? fetch : () => Promise.reject(new Error('fetch not available')))
  }

  static setShopifyCredentials(storeDomain: string, accessToken: string, storefrontAccessToken?: string, proxyUrl?: string) {
    SHOPIFY_STORE_DOMAIN = storeDomain
    SHOPIFY_ACCESS_TOKEN = accessToken
    if (storefrontAccessToken) {
      SHOPIFY_STOREFRONT_ACCESS_TOKEN = storefrontAccessToken
    }
    if (proxyUrl) {
      SHOPIFY_PROXY_URL = proxyUrl
    }
  }

  static getCredentials() {
    if (!SHOPIFY_STORE_DOMAIN || (!SHOPIFY_ACCESS_TOKEN && !SHOPIFY_PROXY_URL)) {
      throw new Error("Shopify credentials not set. Call BaseService.setShopifyCredentials() first")
    }
    return {
      storeDomain: SHOPIFY_STORE_DOMAIN,
      accessToken: SHOPIFY_ACCESS_TOKEN,
      storefrontAccessToken: SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      proxyUrl: SHOPIFY_PROXY_URL
    }
  }

  setFetch(fetchFn: typeof fetch) {
    this._fetch = fetchFn
    return this
  }

  private async safeFetch(url: string, data?: any) {
    try {
      // const baseUrl = SHOPIFY_PROXY_URL
      //   ? `${SHOPIFY_PROXY_URL.replace(/\/$/, '')}`
      //   : `https://${SHOPIFY_STORE_DOMAIN}${PUBLIC_SHOPIFY_API_PREFIX}`

      const urlInBase64 = base32.encode(url)

      console.log("Encoding into", urlInBase64, this._fetch)
      const response = await this._fetch(`/proxy/shopify/${urlInBase64}`, data)
      return response
    } catch (e: any) {
      throw new Error(`Network error: ${e.message || 'Unable to reach the server.'}`)
    }
  }

  private async handleError(response: Response) {
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      throw new Error(data.errors || `HTTP error ${response.status}: ${response.statusText}`)
    } catch {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }
  }

  async callFetch<T>(url: string, body: any): Promise<T> {
    const { accessToken } = BaseService.getCredentials()

    const response = await this.safeFetch(url, {
      ...body,
      headers: {
        ...body.headers,
        'Content-Type': 'application/json',
        'X-Shopify-Api-Type': 'admin',
      }
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const text = await response.text()
    return text ? JSON.parse(text) as T : {} as T
  }

  async callStorefront<T>(query: string, variables: any = {}): Promise<T> {
    const response = await this.safeFetch('/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Api-Type': 'storefront',
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const result = await response.json()
    if (result.errors) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '))
    }

    return result.data as T
  }

  async get<T>(url: string): Promise<T> {
    if (isRestPath(url)) return (await resolveRestLocally('get', url)) as any
    return this.callFetch<T>(url, { method: "GET" })
  }

  async post<T>(url: string, data: any): Promise<T> {
    if (isRestPath(url)) return (await resolveRestLocally('post', url)) as any
    return this.callFetch<T>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T>(url: string, data: any): Promise<T> {
    if (isRestPath(url)) return (await resolveRestLocally('put', url)) as any
    return this.callFetch<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(url: string): Promise<T> {
    if (isRestPath(url)) return (await resolveRestLocally('delete', url)) as any
    return this.callFetch<T>(url, { method: 'DELETE' })
  }
}
