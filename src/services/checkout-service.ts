import { BaseService } from './base-service.js'
import type { Cart, Checkout } from '../types/index.js'
import { cartService } from './cart-service.js'

/**
 * CheckoutService provides functionality for managing checkout processes
 * in the Shopify Storefront API.
 */
export class CheckoutService extends BaseService {
  private static instance: CheckoutService

  /**
   * Get the singleton instance of CheckoutService
   */
  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService()
    }
    return CheckoutService.instance
  }

  /**
   * Retrieves shipping rates (delivery options) for a Shopify cart
   * 
   * @param {Object} params - Parameters for getting shipping rates
   * @param {string} params.cartId - The cart ID
   * @returns {Promise<Checkout>} Updated checkout information with shipping cost
   */
  async getShippingRates({ cartId }: { cartId: string }): Promise<Checkout> {
    const query = `
      query getCart($id: ID!) {
        cart(id: $id) {
          id
          totalQuantity
          cost {
            totalAmount { amount currencyCode }
            subtotalAmount { amount currencyCode }
            totalTaxAmount { amount currencyCode }
          }
          deliveryGroups(first: 1) {
            edges {
              node {
                deliveryOptions {
                  code
                  title
                  estimatedCost { amount currencyCode }
                }
              }
            }
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, { id: cartId })
    const cart = res.cart

    if (!cart) {
      throw new Error(`Cart not found with ID: ${cartId}`)
    }

    const deliveryOption = cart.deliveryGroups?.edges?.[0]?.node?.deliveryOptions?.[0]

    return {
      id: cart.id,
      orderId: '',
      userId: '',
      status: 'pending',
      totalAmount: parseFloat(cart.cost.totalAmount.amount),
      paymentMethod: '',
      paymentStatus: 'unpaid',
      isConfirmed: false,
      discount: 0,
      tax: parseFloat(cart.cost.totalTaxAmount?.amount || '0'),
      shippingCost: deliveryOption ? parseFloat(deliveryOption.estimatedCost.amount) : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Initiates Cash on Delivery checkout process
   * For Shopify, this updates the cart note, sets the return URL, and returns the redirect URL.
   */
  async checkoutCOD({ cartId, origin }: { cartId: string; origin: string }): Promise<any> {
    const mutation = `
      mutation checkoutInitiate($cartId: ID!, $note: String!, $attributes: [AttributeInput!]!) {
        cartNoteUpdate(cartId: $cartId, note: $note) {
          cart { id }
        }
        cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      cartId,
      note: 'Payment Method: Cash on Delivery (COD)',
      attributes: [{ key: 'return_url', value: origin }]
    })

    window.location.href = res.cartAttributesUpdate.cart.checkoutUrl
    return { status: 'redirect', url: res.cartAttributesUpdate.cart.checkoutUrl }
  }

  /**
   * Initiates Razorpay checkout process (redirects to Shopify checkout)
   */
  async checkoutRazorpay({ cartId, origin }: { cartId: string; origin: string }): Promise<any> {
    const mutation = `
      mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
        cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      cartId,
      attributes: [{ key: 'return_url', value: origin }]
    })
    return { status: 'redirect', url: res.cartAttributesUpdate.cart.checkoutUrl }
  }

  /**
   * Capture Razorpay payment (stub)
   */
  async captureRazorpayPayment(params: any): Promise<any> {
    return { status: 'success', message: 'Payment captured via Shopify Checkout' }
  }

  /**
   * Initiates PhonePe checkout process (redirects to Shopify checkout)
   */
  async checkoutPhonepe(params: any): Promise<any> {
    const mutation = `
      mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
        cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      cartId: params.cartId,
      attributes: [{ key: 'return_url', value: params.origin }]
    })
    return { status: 'redirect', url: res.cartAttributesUpdate.cart.checkoutUrl }
  }

  async capturePhonepePayment(params: any): Promise<any> {
    return { status: 'success' }
  }

  async checkoutPaypal(params: any): Promise<any> {
    const mutation = `
      mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
        cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      cartId: params.cartId,
      attributes: [{ key: 'return_url', value: params.origin }]
    })
    return { status: 'redirect', url: res.cartAttributesUpdate.cart.checkoutUrl }
  }

  async checkoutStripe(params: any): Promise<any> {
    const mutation = `
      mutation cartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
        cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      cartId: params.cartId,
      attributes: [{ key: 'return_url', value: params.origin }]
    })
    return { status: 'redirect', url: res.cartAttributesUpdate.cart.checkoutUrl }
  }

  async checkoutStripeCapture(params: any): Promise<any> {
    return { status: 'success' }
  }

  async createAffirmPayOrder(params: any): Promise<any> {
    return { status: 'success' }
  }

  async cancelAffirmOrder(params: any): Promise<any> {
    return { status: 'success' }
  }

  async confirmAffirmOrder(params: any): Promise<any> {
    return { status: 'success' }
  }
}

// Export singleton instance
export const checkoutService = CheckoutService.getInstance()
