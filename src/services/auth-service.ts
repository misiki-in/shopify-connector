import { BaseService } from './base-service'
import type { User } from '../types'

/**
 * AuthService handles customer authentication and profile management
 * using the Shopify Storefront API.
 */
export class AuthService extends BaseService {
  private static instance: AuthService
  private currentUser: User | null = null

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Get current user (requires customerAccessToken)
   */
  async getMe(customerAccessToken: string): Promise<User> {
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
    const res = await this.callStorefront<any>(query, { customerAccessToken })
    const customer = res.customer
    if (!customer) throw new Error('Customer not found')

    this.currentUser = this.transformCustomer(customer)
    return this.currentUser
  }

  /**
   * Login with email and password
   */
  async login({ email, password }: { email: string; password: string }) {
    const query = `
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
    const res = await this.callStorefront<any>(query, {
      input: { email, password }
    })

    const data = res.customerAccessTokenCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return data.customerAccessToken
  }

  /**
   * Register a new customer
   */
  async signup({
    email,
    password,
    firstName,
    lastName
  }: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) {
    const query = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, {
      input: { email, password, firstName, lastName }
    })

    const data = res.customerCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return this.transformCustomer(data.customer)
  }

  /**
   * Update customer profile
   */
  async updateProfile({
    customerAccessToken,
    firstName,
    lastName,
    email,
    phone
  }: {
    customerAccessToken: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }) {
    const query = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, {
      customerAccessToken,
      customer: { firstName, lastName, email, phone }
    })

    const data = res.customerUpdate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return this.transformCustomer(data.customer)
  }

  /**
   * Change password
   */
  async changePassword(customerAccessToken: string, newPassword: string) {
    const query = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            id
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, {
      customerAccessToken,
      customer: { password: newPassword }
    })

    const data = res.customerUpdate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return true
  }

  /**
   * Update billing address
   */
  async updateBillingAddress(customerAccessToken: string, address: any) {
    const query = `
      mutation customerAddressCreate($customerAccessToken: String!, $address: CustomerAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress {
            id
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `
    const res = await this.callStorefront<any>(query, {
      customerAccessToken,
      address
    })

    const data = res.customerAddressCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return true
  }

  /**
   * Update shipping address
   */
  async updateShippingAddress(customerAccessToken: string, address: any) {
    return this.updateBillingAddress(customerAccessToken, address)
  }

  /**
   * Get customer by ID (Admin API)
   */
  async getCustomer(id: string) {
    const res = await this.get<{ customer: any }>(`/customers/${id}.json`)
    return this.transformCustomer(res.customer)
  }

  /**
   * Logout
   */
  logout() {
    this.currentUser = null
    return true
  }

  /**
   * Get current user (local state)
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Transform Shopify customer to User type
   */
  private transformCustomer(customer: any): User {
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
      active: true,
      createdAt: customer.createdAt || '',
      updatedAt: customer.updatedAt || '',
    }
  }
}

export const authService = AuthService.getInstance()
