import type { Cart, CartLineItem, CartProduct } from "../types"
import { BaseService } from "./base-service"

/**
 * GraphQL fragments and queries for Storefront API
 */
const CART_FRAGMENT = `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price {
                amount
                currencyCode
              }
              product {
                id
                title
                handle
                featuredImage {
                  url
                }
              }
            }
          }
        }
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    discountCodes {
      code
      applicable
    }
  }
`

const CART_QUERY = `
  query getCart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }
  ${CART_FRAGMENT}
`

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`

const CART_DISCOUNT_UPDATE_MUTATION = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`

/**
 * Transforms Shopify Storefront API cart to local Cart type
 */
function transformShopifyCart(shopifyCart: any): Cart {
  if (!shopifyCart) return createEmptyCart()

  const lineItems: CartLineItem[] = shopifyCart.lines.edges.map(({ node }: any) => ({
    id: node.id,
    productId: node.merchandise.product.id,
    variantId: node.merchandise.id,
    qty: node.quantity,
    price: parseFloat(node.merchandise.price.amount),
    total: parseFloat(node.merchandise.price.amount) * node.quantity,
  }))

  const items: CartProduct[] = shopifyCart.lines.edges.map(({ node }: any) => ({
    id: node.id,
    slug: node.merchandise.product.handle,
    thumbnail: node.merchandise.product.featuredImage?.url || '',
    productId: node.merchandise.product.id,
    variantId: node.merchandise.id,
    item_id: node.id,
    title: node.merchandise.product.title,
    price: parseFloat(node.merchandise.price.amount),
    product: {
      id: node.merchandise.product.id,
      title: node.merchandise.product.title,
      handle: node.merchandise.product.handle,
    },
    qty: node.quantity,
  }))

  return {
    id: shopifyCart.id,
    email: null,
    phone: null,
    lineItems,
    items,
    billingAddressId: null,
    shippingAddressId: null,
    regionId: null,
    userId: null,
    salesChannelId: null,
    storeId: null,
    couponCode: shopifyCart.discountCodes?.[0]?.code || null,
    discountAmount: 0, // Storefront API doesn't give a simple discount total easily
    couponAppliedDate: null,
    paymentId: null,
    paymentMethod: null,
    paymentAuthorizedAt: null,
    needAddress: true,
    isCodAvailable: false,
    type: 'shopify_storefront',
    completedAt: null,
    idempotencyKey: null,
    shippingCharges: 0,
    shippingMethod: null,
    qty: shopifyCart.totalQuantity,
    subtotal: parseFloat(shopifyCart.cost.subtotalAmount.amount),
    codCharges: 0,
    tax: parseFloat(shopifyCart.cost.totalTaxAmount?.amount || '0'),
    total: parseFloat(shopifyCart.cost.totalAmount.amount),
    savingAmount: 0,
  }
}

function createEmptyCart(): Cart {
  return {
    id: '',
    email: null,
    phone: null,
    lineItems: [],
    items: [],
    billingAddressId: null,
    shippingAddressId: null,
    regionId: null,
    userId: null,
    salesChannelId: null,
    storeId: null,
    couponCode: null,
    discountAmount: 0,
    couponAppliedDate: null,
    paymentId: null,
    paymentMethod: null,
    paymentAuthorizedAt: null,
    needAddress: true,
    isCodAvailable: false,
    type: '',
    completedAt: null,
    idempotencyKey: null,
    shippingCharges: 0,
    shippingMethod: null,
    qty: 0,
    subtotal: 0,
    codCharges: 0,
    tax: 0,
    total: 0,
    savingAmount: 0,
  }
}

export class CartService extends BaseService {
  private static instance: CartService
  private cartId: string | null = null

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService()
    }
    return CartService.instance
  }

  private getStoredCartId(): string | null {
    if (this.cartId) return this.cartId
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopify_cart_id')
    }
    return null
  }

  private setStoredCartId(id: string) {
    this.cartId = id
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopify_cart_id', id)
    }
  }

  /**
   * Initialize cart
   */
  async initCart() {
    const id = this.getStoredCartId()
    if (id) {
      try {
        return await this.getCart()
      } catch {
        return await this.createCart()
      }
    }
    return await this.createCart()
  }

  /**
   * Create a new cart
   */
  async createCart(): Promise<Cart> {
    const res = await this.callStorefront<any>(CART_CREATE_MUTATION, { input: {} })
    const cart = transformShopifyCart(res.cartCreate.cart)
    this.setStoredCartId(cart.id)
    return cart
  }

  /**
   * Get current cart
   */
  async getCart(): Promise<Cart> {
    const id = this.getStoredCartId()
    if (!id) return await this.createCart()

    try {
      const res = await this.callStorefront<any>(CART_QUERY, { cartId: id })
      if (!res.cart) return await this.createCart()
      return transformShopifyCart(res.cart)
    } catch (error) {
      console.error("Error fetching cart:", error)
      return await this.createCart()
    }
  }

  /**
   * Get cart by ID
   */
  async getCartByCartId(cartId: string): Promise<Cart> {
    localStorage.setItem('shopify_cart_id', cartId)
    this.cartId = cartId
    return this.getCart()
  }

  /**
   * Add item to cart
   */
  async addToCart({
    variantId,
    qty = 1
  }: {
    productId?: string
    variantId: string
    qty?: number
  }) {
    let id = this.getStoredCartId()
    if (!id) {
      const cart = await this.createCart()
      id = cart.id
    }

    const res = await this.callStorefront<any>(CART_LINES_ADD_MUTATION, {
      cartId: id,
      lines: [{ merchandiseId: variantId, quantity: qty }]
    })

    return transformShopifyCart(res.cartLinesAdd.cart)
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem({
    cartItemKey,
    qty
  }: {
    cartItemKey: string
    qty: number
  }) {
    const id = this.getStoredCartId()
    if (!id) throw new Error("Cart not found")

    const res = await this.callStorefront<any>(CART_LINES_UPDATE_MUTATION, {
      cartId: id,
      lines: [{ id: cartItemKey, quantity: qty }]
    })

    return transformShopifyCart(res.cartLinesUpdate.cart)
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartItemKey: string) {
    const id = this.getStoredCartId()
    if (!id) throw new Error("Cart not found")

    const res = await this.callStorefront<any>(CART_LINES_REMOVE_MUTATION, {
      cartId: id,
      lineIds: [cartItemKey]
    })

    return transformShopifyCart(res.cartLinesRemove.cart)
  }

  /**
   * Clear cart
   */
  async clearCart() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_cart_id')
    }
    this.cartId = null
    return await this.createCart()
  }

  /**
   * Apply discount code
   */
  async applyCoupon(couponCode: string) {
    const id = this.getStoredCartId()
    if (!id) throw new Error("Cart not found")

    const res = await this.callStorefront<any>(CART_DISCOUNT_UPDATE_MUTATION, {
      cartId: id,
      discountCodes: [couponCode]
    })

    return transformShopifyCart(res.cartDiscountCodesUpdate.cart)
  }

  /**
   * Remove discount code
   */
  async removeCoupon() {
    const id = this.getStoredCartId()
    if (!id) throw new Error("Cart not found")

    const res = await this.callStorefront<any>(CART_DISCOUNT_UPDATE_MUTATION, {
      cartId: id,
      discountCodes: []
    })

    return transformShopifyCart(res.cartDiscountCodesUpdate.cart)
  }
}

export const cartService = CartService.getInstance()
