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
    buyerIdentity {
      email
      phone
      deliveryAddressPreferences {
        __typename
        ... on MailingAddress {
          id
          firstName
          lastName
          address1
          address2
          city
          province
          zip
          country
          phone
        }
      }
    }
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

const CART_BUYER_IDENTITY_UPDATE_MUTATION = `
  mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
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

const CART_DELIVERY_ADDRESSES_UPDATE_MUTATION = `
  mutation cartDeliveryAddressesUpdate($cartId: ID!, $addresses: [CartSelectableAddressUpdateInput!]!) {
    cartDeliveryAddressesUpdate(cartId: $cartId, addresses: $addresses) {
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

  const buyerIdentity = shopifyCart.buyerIdentity
  const deliveryAddress = buyerIdentity?.deliveryAddressPreferences?.find((p: any) => p.__typename === 'MailingAddress')

  const shippingAddress = deliveryAddress ? {
    id: deliveryAddress.id,
    active: true,
    address_1: deliveryAddress.address1,
    address_2: deliveryAddress.address2,
    city: deliveryAddress.city,
    country: deliveryAddress.country,
    countryCode: null,
    firstName: deliveryAddress.firstName,
    lastName: deliveryAddress.lastName,
    phone: deliveryAddress.phone,
    state: deliveryAddress.province,
    zip: deliveryAddress.zip,
    isPrimary: true,
  } : null

  const lineItems: CartLineItem[] = shopifyCart.lines.edges.map(({ node }: any) => ({
    id: node.id,
    productId: node.merchandise.product.id,
    variantId: node.merchandise.id,
    qty: node.quantity,
    price: parseFloat(node.merchandise.price.amount),
    total: parseFloat(node.merchandise.price.amount) * node.quantity,
    slug: node.merchandise.product.handle,
    thumbnail: node.merchandise.product.featuredImage?.url || '',
    item_id: node.id,
    title: node.merchandise.product.title,
    isSelectedForCheckout: true,
    product: {
      id: node.merchandise.product.id,
      title: node.merchandise.product.title,
      handle: node.merchandise.product.handle,
    },
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
    isSelectedForCheckout: true,
    product: {
      id: node.merchandise.product.id,
      title: node.merchandise.product.title,
      handle: node.merchandise.product.handle,
    },
    qty: node.quantity,
  }))

  return {
    id: shopifyCart.id,
    email: buyerIdentity?.email || null,
    phone: buyerIdentity?.phone || null,
    lineItems,
    items,
    billingAddressId: null,
    shippingAddressId: null,
    shippingAddress: shippingAddress,
    billingAddress: shippingAddress, // Map delivery address to both for now
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
    shippingAddress: null,
    billingAddress: null,
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
      return localStorage.getItem('shopify_cart_id') || localStorage.getItem('cart_id')
    }
    return null
  }

  private setStoredCartId(id: string) {
    this.cartId = id
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopify_cart_id', id)
      localStorage.setItem('cart_id', id)
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
    console.log("get cart called", id)

    if (!id || !id.includes('gid://shopify/Cart/')) {
      console.log("invalid cart id", id, "creating new cart")
      return await this.createCart()
    }

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
    //localStorage.setItem('shopify_cart_id', cartId)
    //this.cartId = cartId
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
   * Update cart (compatibility method for litekart-connector)
   */
  async updateCart({
    qty,
    cartId,
    lineId = null,
    productId,
    variantId,
    isSelectedForCheckout
  }: any) {
    if (!cartId) {
      cartId = this.getStoredCartId()
    }
    if (!cartId) {
      const cart = await this.createCart()
      cartId = cart.id
    }

    if (lineId) {
      return this.updateCartItem({ cartItemKey: lineId, qty })
    } else if (variantId) {
      return this.addToCart({ variantId, qty })
    }

    return this.getCart()
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
   * Update cart 2 (compatibility method for litekart-connector)
   */
  async updateCart2({
    cartId,
    email,
    phone,
    shippingAddress,
    billingAddress,
    isBillingAddressSameAsShipping
  }: any) {
    let id = cartId || this.getStoredCartId()
    if (!id) {
      const cart = await this.createCart()
      id = cart.id
    }

    console.log("updateCart2 id", id)
    console.log(email, cartId, shippingAddress, billingAddress, isBillingAddressSameAsShipping)
    let currentCart: any

    // Update Buyer Identity (Email, Phone, Address)
    const buyerIdentity: any = {}
    if (email) buyerIdentity.email = email
    if (phone) buyerIdentity.phone = phone
    if (shippingAddress) {
      buyerIdentity.deliveryAddressPreferences = [
        {
          deliveryAddress: this.mapToShopifyAddressInput(shippingAddress)
        }
      ]
    }

    if (Object.keys(buyerIdentity).length > 0) {
      const res = await this.callStorefront<any>(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
        cartId: id,
        buyerIdentity
      })
      currentCart = res.cartBuyerIdentityUpdate.cart
    }

    // Note: Shopify Cart Storefront API doesn't have a separate billingAddress field.
    // Billing address is typically collected during the payment step of checkout.
    // For now, we'll just return the updated cart.

    return currentCart ? transformShopifyCart(currentCart) : this.getCart()
  }

  /**
   * Maps local address data to Shopify MailingAddressInput
   */
  private mapToShopifyAddressInput(address: any): any {
    console.log("input address", address)
    return {
      address1: address.address_1 || address.address,
      address2: address.address_2 || '',
      city: address.city,
      country: address.country || address.countryCode || 'IN',
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      province: address.state,
      zip: address.zip,
    }
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
      localStorage.removeItem('cart_id')
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

  /**
   * Complete cart (checkout)
   */
  async completeCart(cartId: string) {
    return this.getCart()
  }

  /**
   * Update shipping rate
   */
  async updateShippingRate({
    cartId,
    shippingRateId
  }: {
    cartId: string
    shippingRateId: string
  }) {
    return this.getCart()
  }
}

export const cartService = CartService.getInstance()
