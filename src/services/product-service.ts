import { PAGE_SIZE } from '../config'
import { ProductStatus, type Product, type Variant } from '../types'
import { BaseService } from './base-service'

export const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    descriptionHtml
    vendor
    productType
    createdAt
    updatedAt
    publishedAt
    availableForSale
    tags
    options {
      id
      name
      values
    }
    featuredImage {
      url
      altText
    }
    images(first: 20) {
      nodes {
        url
        altText
      }
    }
    variants(first: 250) {
      nodes {
        id
        title
        sku
        availableForSale
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`

export function transformShopifyProduct(product: any): Product {
  const thumbnail = product.featuredImage?.url || (product.images?.nodes?.[0]?.url) || ''
  const images = product.images?.nodes ? product.images.nodes.map((img: any) => img.url).join(',') : ''

  return {
    id: product.id,
    handle: product.handle,
    slug: product.handle,
    title: product.title,
    description: product.descriptionHtml,
    status: product.publishedAt ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
    active: product.availableForSale,
    thumbnail: thumbnail,
    images: images,
    price: parseFloat(product.variants?.nodes?.[0]?.price?.amount || '0'),
    mrp: parseFloat(product.variants?.nodes?.[0]?.compareAtPrice?.amount || '0'),
    options: product.options?.map((opt: any) => ({
      id: opt.id,
      name: opt.name,
      values: opt.values,
    })) || [],
    variants: product.variants?.nodes?.map((variant: any): Variant => ({
      id: variant.id,
      productId: product.id,
      title: variant.title,
      sku: variant.sku,
      price: parseFloat(variant.price?.amount || '0'),
      mrp: parseFloat(variant.compareAtPrice?.amount || '0'),
      stock_quantity: 0, // Storefront API doesn't expose exact inventory quantity easily
      stock_status: variant.availableForSale ? 'instock' : 'outofstock',
      options: variant.selectedOptions?.map((opt: any) => ({
        name: opt.name,
        value: opt.value
      })) || []
    })) || [],
    tags: product.tags || [],
  }
}

export class ProductService extends BaseService {
  private static instance: ProductService

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService()
    }
    return ProductService.instance
  }

  /**
   * List featured products
   * @param page - Page number
   * @param perPage - Items per page
   */
  async listFeaturedProducts({ page = 1, perPage = PAGE_SIZE } = {}) {
    return this.list({ page, perPage })
  }

  /**
   * List trending products
   * @param page - Page number
   * @param search - Search term
   * @param perPage - Items per page
   */
  async listTrendingProducts({ page = 1, search = '', perPage = PAGE_SIZE } = {}) {
    return this.list({ page, perPage, search })
  }

  /**
   * List related products
   * @param page - Page number
   * @param collectionId - Collection ID or Handle
   * @param perPage - Items per page
   */
  async listRelatedProducts({ page = 1, collectionId = '', perPage = PAGE_SIZE } = {}) {
    return this.list({ page, perPage, category: collectionId })
  }

  /**
   * List products with filters
   */
  async list({
    page = 1,
    perPage = PAGE_SIZE,
    search = '',
    category = '',
    tag = '',
    vendor = '',
    status = 'active'
  } = {}) {
    let query = ''
    if (search) query += `title:${search} `
    if (tag) query += `tag:${tag} `
    if (vendor) query += `vendor:${vendor} `
    if (category) {
      // In Storefront API, category might be a collection handle
      query += `collection:${category} `
    }

    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query listProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          nodes {
            ...ProductFields
          }
        }
      }
    `

    try {
      const res = await this.callStorefront<{ products: { nodes: any[] } }>(graphqlQuery, {
        first: perPage,
        query: query.trim() || undefined
      })

      console.log("response for list()", res)

      const products = res.products?.nodes || []

      console.log(products)
      return {
        data: products.map(transformShopifyProduct),
        count: products.length,
        page,
        pageSize: perPage,
        noOfPage: Math.ceil(products.length / perPage)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      return {
        data: [],
        count: 0,
        page,
        pageSize: perPage,
        noOfPage: 1
      }
    }
  }

  async getOne(handle: string) {
    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          ...ProductFields
        }
      }
    `
    const res = await this.callStorefront<{ product: any }>(graphqlQuery, { handle })
    if (!res.product) throw new Error('Product not found')
    return transformShopifyProduct(res.product)
  }

  async getById(id: string) {
    const graphqlQuery = `
      ${PRODUCT_FRAGMENT}
      query getProductById($id: ID!) {
        node(id: $id) {
          ... on Product {
            ...ProductFields
          }
        }
      }
    `
    const res = await this.callStorefront<{ node: any }>(graphqlQuery, { id })
    if (!res.node) throw new Error('Product not found')
    return transformShopifyProduct(res.node)
  }
}

export const productService = ProductService.getInstance()
