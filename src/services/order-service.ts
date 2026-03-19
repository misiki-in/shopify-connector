import { PAGE_SIZE } from '../config'
import type { Order, PaginatedResponse } from '../types'
import { BaseService } from './base-service'

export class OrderService extends BaseService {
  private static instance: OrderService

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService()
    }
    return OrderService.instance
  }

  async list({ page = 1, perPage = PAGE_SIZE, customerId }: { page?: number; perPage?: number; customerId?: string } = {}): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams()
    params.set('limit', String(perPage))
    if (customerId) params.set('customer_id', customerId)

    const res = await this.get<{ orders: any[] }>(`/orders.json?${params.toString()}`)
    const { transformShopifyOrder } = await import('./order-service')
    
    return {
      data: res.orders?.map(transformShopifyOrder) || [],
      count: res.orders?.length || 0,
      page,
      pageSize: perPage,
      noOfPage: 1
    }
  }

  async fetchOrder(id: string) {
    const res = await this.get<{ order: any }>(`/orders/${id}.json`)
    return transformShopifyOrder(res.order)
  }
}

export function transformShopifyOrder(order: any): Order {
  return {
    id: order.id.toString(),
    orderNo: order.name,
    parentOrderNo: '',
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    status: order.fulfillment_status || order.financial_status,
    lineItems: order.line_items?.map((item: any) => ({
      id: item.id.toString(),
      productId: item.product_id?.toString(),
      variantId: item.variant_id?.toString(),
      qty: item.quantity,
      price: parseFloat(item.price),
      total: parseFloat(item.price) * item.quantity,
      title: item.title,
      sku: item.sku,
    })) || [],
    userEmail: order.email || order.customer?.email || '',
    userPhone: order.shipping_address?.phone || '',
    shippingAddress: order.shipping_address,
    billingAddress: order.billing_address,
    subtotal: parseFloat(order.subtotal_price || '0'),
    total: parseFloat(order.total_price || '0'),
    discount: parseFloat(order.total_discounts || '0'),
    shipping: parseFloat(order.total_shipping_price || '0'),
    tax: parseFloat(order.total_tax || '0'),
    paymentMethod: order.financial_status,
    paymentStatus: order.financial_status,
  }
}

export const orderService = OrderService.getInstance()
