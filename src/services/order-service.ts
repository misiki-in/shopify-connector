import { PAGE_SIZE } from '../config'
import type { Order, PaginatedResponse } from '../types'
import { BaseService } from './base-service'
import { getCustomerAccessToken } from './auth-service'

export class OrderService extends BaseService {
  private static instance: OrderService

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService()
    }
    return OrderService.instance
  }

  /**
   * Fetches customer's orders from the Shopify Storefront API
   */
  async list({ page = 1, perPage = PAGE_SIZE, q = '', sort = '-createdAt' }: { 
    page?: number; 
    perPage?: number; 
    q?: string; 
    sort?: string 
  } = {}): Promise<PaginatedResponse<Order>> {
    const customerAccessToken = getCustomerAccessToken()
    if (!customerAccessToken) {
      return { data: [], count: 0, page, pageSize: perPage, noOfPage: 0 }
    }

    const query = `
      query getCustomerOrders($customerAccessToken: String!, $first: Int) {
        customer(customerAccessToken: $customerAccessToken) {
          orders(first: $first) {
            edges {
              node {
                id
                name
                orderNumber
                processedAt
                financialStatus
                fulfillmentStatus
                totalPriceV2 { amount currencyCode }
                subtotalPriceV2 { amount currencyCode }
                totalTaxV2 { amount currencyCode }
                totalShippingPriceV2 { amount currencyCode }
                shippingAddress {
                  firstName lastName address1 address2 city province country zip phone
                }
                billingAddress {
                  firstName lastName address1 address2 city province country zip phone
                }
                lineItems(first: 250) {
                  edges {
                    node {
                      title
                      quantity
                      variant {
                        id
                        priceV2 { amount currencyCode }
                        sku
                        image { url }
                        product { id }
                      }
                    }
                  }
                }
              }
            }
            totalCount
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, { 
      customerAccessToken,
      first: perPage
    })

    const orders = res.customer?.orders?.edges?.map((edge: any) => transformShopifyOrder(edge.node)) || []
    const totalCount = res.customer?.orders?.totalCount || orders.length

    return {
      data: orders,
      count: totalCount,
      page,
      pageSize: perPage,
      noOfPage: Math.ceil(totalCount / perPage)
    }
  }

  /**
   * Fetches a single order by GraphQL ID
   */
  async fetchOrder(id: string): Promise<Order> {
    const query = `
      query getOrder($id: ID!) {
        node(id: $id) {
          ... on Order {
            id
            name
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            totalPriceV2 { amount currencyCode }
            subtotalPriceV2 { amount currencyCode }
            totalTaxV2 { amount currencyCode }
            totalShippingPriceV2 { amount currencyCode }
            shippingAddress {
              firstName lastName address1 address2 city province country zip phone
            }
            billingAddress {
              firstName lastName address1 address2 city province country zip phone
            }
            lineItems(first: 250) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    id
                    priceV2 { amount currencyCode }
                    sku
                    image { url }
                    product { id }
                  }
                }
              }
            }
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, { id })
    if (!res.node) throw new Error('Order not found')
    
    return transformShopifyOrder(res.node)
  }

  /**
   * Fetches an order by order number (name in Shopify)
   */
  async getOrder(orderNo: string): Promise<Order> {
    // In Shopify Storefront API, you can't easily query an order by name directly without listing.
    // If orderNo is a GraphQL ID, fetchOrder will work.
    if (orderNo.startsWith('gid://')) {
      return this.fetchOrder(orderNo)
    }
    
    // Otherwise, we search in the customer's orders.
    const orders = await this.list({ perPage: 50 })
    const order = orders.data.find(o => o.orderNo === orderNo || o.id === orderNo)
    
    if (!order) throw new Error(`Order ${orderNo} not found`)
    return order
  }

  async listOrdersByParent({ orderNo, cartId }: { orderNo: string | null; cartId: string | null }) {
    return { data: [], count: 0, page: 1, pageSize: 20, noOfPage: 0 } as PaginatedResponse<Order>
  }

  async fetchTrackOrder(id: string) {
    const order = await this.fetchOrder(id)
    return { data: [order], count: 1, page: 1, pageSize: 20, noOfPage: 1 } as PaginatedResponse<Order>
  }

  async paySuccessPageHit(orderId: string) {
    return this.fetchOrder(orderId)
  }

  // Payment stubs to match the storefront checkout interface
  async codCheckout(params: any) { return {} as Order }
  async cashfreeCheckout(params: any) { return {} as Order }
  async razorpayCheckout(params: any) { return {} as Order }
  async stripeCheckout(params: any) { return {} as Order }
  async razorCapture(params: any) { return {} as Order }

  async listPublic() {
    return { data: [], count: 0, page: 1, pageSize: 20, noOfPage: 0 } as PaginatedResponse<Order>
  }

  async getOrderByEmailAndOTP(params: any) {
    return { data: [], count: 0, page: 1, pageSize: 20, noOfPage: 0 } as PaginatedResponse<Order>
  }

  async buyAgain() {
    return { data: [], count: 0, page: 1, pageSize: 20, noOfPage: 0 } as PaginatedResponse<Order>
  }

  async submitReview(params: any) {
    return {}
  }
}

export function transformShopifyOrder(order: any): Order {
  return {
    id: order.id,
    orderNo: order.name || order.orderNumber?.toString() || '',
    parentOrderNo: '',
    createdAt: order.processedAt,
    updatedAt: order.processedAt, // Storefront API doesn't expose updatedAt directly for Order
    status: order.fulfillmentStatus || order.financialStatus,
    lineItems: order.lineItems?.edges?.map((edge: any) => {
      const item = edge.node
      return {
        id: item.variant?.id || '',
        productId: item.variant?.product?.id || '',
        variantId: item.variant?.id || '',
        qty: item.quantity,
        price: parseFloat(item.variant?.priceV2?.amount || '0'),
        total: parseFloat(item.variant?.priceV2?.amount || '0') * item.quantity,
        title: item.title,
        sku: item.variant?.sku || '',
        thumbnail: item.variant?.image?.url || '',
      }
    }) || [],
    userEmail: '', // Not directly exposed in Order in Storefront API without customer
    userPhone: order.shippingAddress?.phone || '',
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    subtotal: parseFloat(order.subtotalPriceV2?.amount || '0'),
    total: parseFloat(order.totalPriceV2?.amount || '0'),
    discount: 0, // Needs calculation or more detailed query
    shipping: parseFloat(order.totalShippingPriceV2?.amount || '0'),
    tax: parseFloat(order.totalTaxV2?.amount || '0'),
    paymentMethod: order.financialStatus,
    paymentStatus: order.financialStatus,
    currencyCode: order.totalPriceV2?.currencyCode,
    paid: order.financialStatus === 'PAID',
  }
}

export const orderService = OrderService.getInstance()
