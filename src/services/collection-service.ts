import { BaseService } from './base-service'
import { PAGE_SIZE } from '../config'
import { PRODUCT_FRAGMENT, transformShopifyProduct } from './product-service'

export class CollectionService extends BaseService {
  private static instance: CollectionService

  static getInstance(): CollectionService {
    if (!CollectionService.instance) {
      CollectionService.instance = new CollectionService()
    }
    return CollectionService.instance
  }

  /**
   * Fetch all unique product tags
   */
  async list() {
    const graphqlQuery = `
      query getTags($first: Int!) {
        productTags(first: $first) {
          edges {
            node
          }
        }
      }
    `
    try {
      const res = await this.callStorefront<{ productTags: { edges: Array<{ node: string }> } }>(graphqlQuery, {
        first: 250
      })
      const tags = res.productTags?.edges?.map(edge => edge.node) || []
      
      return {
        data: tags.map(tag => ({
          id: tag,
          name: tag,
          slug: tag,
          status: 'active'
        })),
        count: tags.length
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      return { data: [], count: 0 }
    }
  }

  /**
   * Get products by tag
   */
  async getProductsByTag(tag: string, { page = 1, perPage = PAGE_SIZE } = {}) {
    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query getProductsByTag($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          nodes {
            ...ProductFields
          }
        }
      }
    `
    try {
      const res = await this.callStorefront<{ products: { nodes: any[] } }>(graphqlQuery, {
        query: `tag:${tag}`,
        first: perPage
      })

      const products = res.products?.nodes || []
      
      return {
        data: products.map(transformShopifyProduct) || [],
        total: products.length,
        page,
        pageSize: perPage
      }
    } catch (error) {
      console.error('Error fetching products by tag:', error)
      return { data: [], total: 0, page, pageSize: perPage }
    }
  }
}

export const collectionService = CollectionService.getInstance()
