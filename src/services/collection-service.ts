import { BaseService } from './base-service'
import { PAGE_SIZE } from '../config'
import { PRODUCT_FRAGMENT, transformShopifyProduct } from './product-service'
import { transformShopifyCollection } from './category-service'

const COLLECTION_FRAGMENT = `
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    descriptionHtml
    image {
      url
      altText
    }
  }
`

export class CollectionService extends BaseService {
  private static instance: CollectionService

  static getInstance(): CollectionService {
    if (!CollectionService.instance) {
      CollectionService.instance = new CollectionService()
    }
    return CollectionService.instance
  }

  /**
   * Fetch all collections from Shopify
   */
  async list({ page = 1, perPage = PAGE_SIZE, search = '' } = {}) {
    const graphqlQuery = `
      ${COLLECTION_FRAGMENT}
      query getCollections($first: Int!) {
        collections(first: $first) {
          nodes {
            ...CollectionFields
          }
        }
      }
    `
    try {
      const res = await this.callStorefront<{ collections: { nodes: any[] } }>(graphqlQuery, {
        first: 250 // Fetch many collections
      })
      const collections = res.collections?.nodes || []
      
      const transformedData = collections.map(transformShopifyCollection)

      return {
        data: transformedData,
        count: transformedData.length,
        page: page,
        pageSize: perPage,
        noOfPage: Math.ceil(transformedData.length / perPage)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
      return { data: [], count: 0, page, pageSize: perPage, noOfPage: 1 }
    }
  }

  /**
   * Get products by collection handle
   */
  async getProductsByCollection(handle: string, { page = 1, perPage = PAGE_SIZE } = {}) {
    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query getCollectionProducts($handle: String!, $first: Int!) {
        collection(handle: $handle) {
          products(first: $first) {
            nodes {
              ...ProductFields
            }
          }
        }
      }
    `
    try {
      const res = await this.callStorefront<{ collection: { products: { nodes: any[] } } }>(graphqlQuery, {
        handle: handle,
        first: perPage
      })

      const products = res.collection?.products?.nodes || []
      
      return {
        data: products.map(transformShopifyProduct) || [],
        total: products.length,
        page,
        pageSize: perPage
      }
    } catch (error) {
      console.error('Error fetching products by collection:', error)
      return { data: [], total: 0, page, pageSize: perPage }
    }
  }

  /**
   * Backward compatibility for getProductsByTag, mapping it to collections
   */
  async getProductsByTag(tag: string, options = {}) {
    return this.getProductsByCollection(tag, options)
  }
}

export const collectionService = CollectionService.getInstance()
