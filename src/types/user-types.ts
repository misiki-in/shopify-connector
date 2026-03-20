export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  active: boolean
  avatar?: string | null
  role?: string | null
  cartId?: string | null
  createdAt: string
  updatedAt: string
}
