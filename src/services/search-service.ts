import { orderFromSort } from "../config"
import { ProductSearchResult } from "../types/product-search"
import { BaseService } from "./base-service"
import { PRODUCT_FRAGMENT, transformShopifyProduct } from "./product-service"

/**
 * SearchService provides a high-level API for product search operations
 * for Shopify using the Storefront API.
 */
export class SearchService extends BaseService {
  private static instance: SearchService

  /**
   * Get the singleton instance
   */
  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService()
    }
    return SearchService.instance
  }

  /**
   * Performs a product search using URL search parameters
   * 
   * @param {URL} url - The URL containing search parameters
   * @param {string} [slug] - Optional category slug
   */
  async searchWithUrl(url: URL, slug?: string) {
    try {
      const searchParams = new URLSearchParams(url.search)
      const query = searchParams.get('q') || searchParams.get('search') || ''
      const tags = searchParams.get('tags') || searchParams.get('tag')
      const vendor = searchParams.get('vendor')
      const category = slug || searchParams.get('categories') || searchParams.get('collection')

      let shopifyQuery = query
      if (tags) shopifyQuery += ` tag:${tags}`
      if (vendor) shopifyQuery += ` vendor:${vendor}`
      if (category) shopifyQuery += ` collection:${category}`

      return this.executeSearch(shopifyQuery.trim() || '*')
    } catch (error) {
      console.error('SearchService Error:', error)
      return this.emptyResult()
    }
  }

  /**
   * Search with a simple query string
   */
  async searchWithQuery(query: string) {
    return this.executeSearch(query)
  }

  /**
   * Execute the GraphQL search query
   */
  private async executeSearch(query: string): Promise<ProductSearchResult> {
    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query search($query: String!, $first: Int) {
        search(query: $query, first: $first, types: [PRODUCT]) {
          nodes {
            ... on Product {
              ...ProductFields
            }
          }
          totalCount
        }
      }
    `

    try {
      const res = await this.callStorefront<{ search: { nodes: any[], totalCount: number } }>(graphqlQuery, {
        query: query || '*',
        first: 50
      })

      const products = res.search?.nodes || []
      const count = res.search?.totalCount || products.length

      return {
        data: products.map(transformShopifyProduct),
        count,
        totalPages: Math.ceil(count / 50),
        categoryHierarchy: [],
        facets: {
          priceStat: { min: undefined, max: undefined },
          categories: [],
          tags: [],
          allFilters: {},
        },
      }
    } catch (error) {
      console.error('SearchService GraphQL Error:', error)
      return this.emptyResult()
    }
  }

  /**
   * Create an empty product search result
   */
  emptyResult(): ProductSearchResult {
    return {
      data: [],
      count: 0,
      totalPages: 0,
      categoryHierarchy: [],
      facets: {
        priceStat: { min: undefined, max: undefined },
        categories: [],
        tags: [],
        allFilters: {}
      }
    }
  }
}

// Use singleton instance
export const searchService = SearchService.getInstance()
