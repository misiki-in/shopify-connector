export type Order = {
  id: string
  orderNo: string
  parentOrderNo?: string
  createdAt: string
  updatedAt: string
  status: string
  lineItems: Array<{
    id: string
    productId: string
    variantId: string
    qty: number
    price: number
    total: number
    title: string
    sku: string
    thumbnail?: string
  }>
  userId?: string
  userEmail: string
  userPhone: string
  userFirstName?: string
  userLastName?: string
  shippingAddress: any
  billingAddress: any
  subtotal: number
  total: number
  discount: number
  shipping: number
  tax: number
  paymentMethod: string
  paymentStatus: string
  currencyCode?: string
  currencySymbol?: string
  paid?: boolean
}
