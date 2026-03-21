import { PAGE_SIZE } from '../config'
import type { Category, PaginatedResponse } from '../types'
import { BaseService } from './base-service'
import { PRODUCT_FRAGMENT, transformShopifyProduct } from './product-service'

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

export interface CategoryExtended extends Category {
  children: CategoryExtended[]
  parent: CategoryExtended | null
}

export function transformShopifyCollection(cat: any): CategoryExtended {
  return {
    id: cat.id,
    slug: cat.handle,
    name: cat.title,
    parentCategoryId: '',
    createdAt: '', // Storefront API doesn't expose createdAt for collections easily
    description: cat.description || cat.descriptionHtml || '',
    children: [],
    parent: null,
    thumbnail: cat.image?.url || null,
    link: '/collections/' + cat.handle,
    isActive: true,
    activeProducts: 0, // Storefront API doesn't expose products count in nodes easily without additional query
    inactiveProducts: 0,
    isInternal: false,
    isMegamenu: false,
    path: null,
    level: null,
    isFeatured: false,
    keywords: null,
    rank: 0,
    metaDescription: null,
    metaKeywords: null,
    metaTitle: null,
    store: null,
    userId: '',
    updatedAt: ''
  }
}

export class CategoryService extends BaseService {
  private static instance: CategoryService

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService()
    }
    return CategoryService.instance
  }

  /**
   * Fetch collections for footer
   */
  async fetchFooterCategories({
    page = 1,
    perPage = 20
  }: {
    page?: number
    perPage?: number
  } = {}) {
    return this.fetchAllCategories({ limit: perPage })
  }

  /**
   * Fetch featured categories
   */
  async fetchFeaturedCategories({ limit = 100 }: { limit?: number } = {}) {
    return this.fetchFeaturedCollections({ limit })
  }

  /**
   * Fetch featured collections
   */
  async fetchFeaturedCollections({ limit = 100 }: { limit?: number } = {}) {
    return this.fetchAllCategories({ limit })
  }

  /**
   * Fetch a single collection by ID or Handle
   */
  async fetchCategory(id: string) {
    const graphqlQuery = `
      ${COLLECTION_FRAGMENT}
      query getCollectionByHandle($handle: String!) {
        collection(handle: $handle) {
          ...CollectionFields
        }
      }
    `
    // Attempting to fetch by handle first as it's more common in Storefront API
    const res = await this.callStorefront<{ collection: any }>(graphqlQuery, { handle: id })
    console.log("collection res", res)
    //if (!res.collection) throw new Error('Collection not found')
    return transformShopifyCollection(res.collection)
  }

  /**
   * Fetch all collections
   */
  async fetchAllCategories({ limit = 100 }: { limit?: number } = {}) {
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
    const res = await this.callStorefront<{ collections: { nodes: any[] } }>(graphqlQuery, { first: limit })
    const collections = res.collections?.nodes || []

    return {
      data: collections.map(transformShopifyCollection)
    }
  }

  /**
   * Fetch all products of a collection
   */
  async fetchAllProductsOfCategory(id: string, { page = 1, perPage = PAGE_SIZE } = {}) {
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
    const res = await this.callStorefront<{ collection: { products: { nodes: any[] } } }>(graphqlQuery, {
      handle: id,
      first: perPage
    })

    const products = res.collection?.products?.nodes || []

    return {
      data: products.map(transformShopifyProduct) || [],
      total: products.length,
      page,
      pageSize: perPage
    }
  }

  /**
   * Get megamenu (hierarchical collections)
   */
  async getMegamenu() {
    const res = await this.fetchAllCategories({ limit: 100 })
    return res.data
  }
}

export const categoryService = CategoryService.getInstance()
