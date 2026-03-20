import type { User } from '../types/index.js'
import { getCustomerAccessToken, removeCustomerAccessToken, setCustomerAccessToken } from './auth-service.js'
import { BaseService } from './base-service.js'

// Helper to transform Shopify customer response to User object
function customerToUser(customer: any): User {
  return {
    id: customer.id || '',
    email: customer.email || '',
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    phone: customer.phone || null,
    active: true,
    avatar: customer.avatar || null,
    role: 'USER',
    createdAt: customer.createdAt || '',
    updatedAt: customer.updatedAt || '',
  }
}

export class UserService extends BaseService {
  private static instance: UserService

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Retrieves the currently authenticated user's profile
  async getMe() {
    const token = getCustomerAccessToken()
    if (!token) throw new Error('No customer access token found')
    
    const query = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          firstName
          lastName
          email
          phone
          createdAt
          updatedAt
        }
      }
    `
    const res = await this.callStorefront<any>(query, { customerAccessToken: token })
    if (!res.customer) throw new Error('Customer not found')
    return customerToUser(res.customer)
  }

  // Retrieves a specific user by ID (requires Admin API)
  async getUser(id: string) {
    const res = await this.get<{ customer: any }>(`/customers/${id}.json`)
    return customerToUser(res.customer)
  }

  // Registers a new user account
  async signup({
    firstName,
    lastName,
    phone,
    email,
    password,
    cartId = null,
    origin
  }: {
    firstName: string
    lastName: string
    phone: string
    email: string
    password: string
    cartId?: string | null
    origin: string
  }) {
    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
            phone
            createdAt
            updatedAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      input: { firstName, lastName, phone, email, password }
    })

    const data = res.customerCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return customerToUser(data.customer)
  }

  // Authenticates a user with email and password
  async login({ email, password, cartId = null }: { email: string; password: string; cartId?: string | null }) {
    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      input: { email, password }
    })

    const data = res.customerAccessTokenCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    const token = data.customerAccessToken.accessToken
    setCustomerAccessToken(token)
    
    const user = await this.getMe()
    return { token, user }
  }

  // Initiates a password reset workflow
  async forgotPassword({ email, referrer }: { email: string; referrer: string }) {
    const mutation = `
      mutation customerRecover($email: String!) {
        customerRecover(email: $email) {
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, { email })
    if (res.customerRecover?.customerUserErrors?.length > 0) {
      throw new Error(res.customerRecover.customerUserErrors[0].message)
    }
    return true
  }

  // Logs out the current user
  async logout() {
    removeCustomerAccessToken()
    return true
  }

  // Updates a user's profile information
  async updateProfile({
    id,
    firstName,
    lastName,
    email,
    phone,
    avatar
  }: {
    id?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string | null
    avatar?: string | null
  }) {
    const token = getCustomerAccessToken()
    if (!token) throw new Error('No customer access token found')

    const mutation = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            id
            firstName
            lastName
            email
            phone
            createdAt
            updatedAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      customerAccessToken: token,
      customer: { firstName, lastName, email, phone }
    })

    const data = res.customerUpdate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return customerToUser(data.customer)
  }

  // Placeholder for joining as vendor
  async joinAsVendor(params: any) {
    return Promise.resolve()
  }

  // Change password (Storefront API)
  async changePassword({ old, password }: { old: string; password: string }) {
    const token = getCustomerAccessToken()
    if (!token) throw new Error('No customer access token found')

    const mutation = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer { id }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, {
      customerAccessToken: token,
      customer: { password }
    })

    const data = res.customerUpdate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return true
  }

  // Reset password (Storefront API)
  async resetPassword({ userId, token, password }: { userId: string; token: string; password: string }) {
    const mutation = `
      mutation customerReset($resetToken: String!, $password: String!) {
        customerReset(resetToken: $resetToken, password: $password) {
          customer { id }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(mutation, { resetToken: token, password })
    if (res.customerReset?.customerUserErrors?.length > 0) {
      throw new Error(res.customerReset.customerUserErrors[0].message)
    }
    return true
  }

  // Stubs for OTP (Shopify doesn't natively support OTP login via Storefront API without a carrier)
  async getOtp(params: any) {
    return { otp: 'OTP sent' }
  }

  async verifyOtp(params: any) {
    return { status: 'success' }
  }

  // Check email existence (requires Admin API)
  async checkEmail(email: string) {
    const res = await this.get<{ customers: any[] }>(`/customers/search.json?query=email:${email}`)
    return (res.customers?.length || 0) > 0
  }

  // Delete user (requires Admin API)
  async deleteUser(id: string) {
    return this.delete(`/customers/${id}.json`)
  }
}

export const userService = UserService.getInstance()
