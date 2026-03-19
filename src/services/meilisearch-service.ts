import { MeilisearchResponse, MsSearchParams } from "../types/product-search"
import { BaseService } from "./base-service"

/**
 * MeilisearchService provides direct access to Meilisearch functionality
 * for product searches and autocomplete features.
 */
export class MeilisearchService extends BaseService {
  private static instance: MeilisearchService

  /**
   * Get the singleton instance
   *
   * @returns {MeilisearchService} The singleton instance of MeilisearchService
   */
  static getInstance(): MeilisearchService {
    if (!MeilisearchService.instance) {
      MeilisearchService.instance = new MeilisearchService()
    }
    return MeilisearchService.instance
  }

  /**
   * Performs a product search via Meilisearch
   *
   * @param {MsSearchParams} params - The search parameters to use
   * @returns {Promise<MeilisearchResponse>} Promise resolving to search results
   */
  async search(params: MsSearchParams) {
    const {
      query,
      categories,
      price,
      keywords,
      tags,
      originCountry,
      page,
      otherParams,
      attributeParams,
      optionParams,
      sort
    } = params
    
    // In local implementation, this was just a placeholder returning empty hits
    return {
      hits: []
    }
  }

  /**
   * Performs an autocomplete search for product suggestions
   *
   * @param {object} params - The search parameters
   * @param {string} params.query - The partial search query to get suggestions for
   * @returns {Promise<MeilisearchResponse>} Promise resolving to search results
   */
  async searchAutoComplete(params: {
    query: string
  }): Promise<MeilisearchResponse> {
    const { query } = params
    const searchParams = new URLSearchParams()
    searchParams.append('search', query)
    return this.get<MeilisearchResponse>(
      `/api/ms-autocomplete/products?${searchParams?.toString()}`
    )
  }
}

// Use singleton instance
export const meilisearchService = MeilisearchService.getInstance()
