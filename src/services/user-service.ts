import type { User } from '../types'
import { removeCustomerAccessToken, setCustomerAccessToken } from './auth-service'
import { BaseService } from './base-service'

type UserExtended = {
  userId: string
  role: string
} & User

// Browser-compatible cookie functions
function deleteMeCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'me=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;'
  }
}

function saveUserAsMeCookie(user: UserExtended) {
  if (typeof document !== 'undefined') {
    const me = encodeURIComponent(JSON.stringify(user))
    document.cookie = 'me=' + me + ';path=/;'
  }
}

function customerToUser(customer: any): UserExtended {
  return {
    id: customer.id?.toString() || '',
    userId: customer.id?.toString() || '',
    email: customer.email || '',
    firstName: customer.firstName || customer.first_name || '',
    lastName: customer.lastName || customer.last_name || '',
    phone: customer.phone || null,
    active: customer.state === 'enabled' || !!customer.id,
    createdAt: customer.createdAt || customer.created_at || '',
    updatedAt: customer.updatedAt || customer.updated_at || '',
    role: "USER"
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

  // Get current authenticated user (requires customerAccessToken)
  async getMe(customerAccessToken: string) {
    const query = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          firstName
          lastName
          email
          phone
        }
      }
    `
    const res = await this.callStorefront<any>(query, { customerAccessToken })
    if (!res.customer) throw new Error('Customer not found')
    return customerToUser(res.customer)
  }

  // Get specific user by ID (Admin API)
  async getUser(id: string) {
    const res = await this.get<{ customer: any }>(`/customers/${id}.json`)
    return customerToUser(res.customer)
  }

  // Customer registration (Storefront API)
  async signup({
    firstName,
    lastName,
    phone,
    email,
    password,
  }: {
    firstName: string
    lastName: string
    phone: string
    email: string
    password: string
  }) {
    const query = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
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
      input: { firstName, lastName, phone, email, password }
    })

    const data = res.customerCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    const user = customerToUser(data.customer)
    if (typeof document !== 'undefined') {
      saveUserAsMeCookie(user)
    }
    return user
  }

  // Login (Storefront API)
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

    // After login, we usually fetch the user details
    const token = data.customerAccessToken.accessToken
    const user = await this.getMe(token)

    if (typeof document !== 'undefined') {
      saveUserAsMeCookie(user)
    }

    setCustomerAccessToken(data.customerAccessToken.accessToken)
    return { user, token: data.customerAccessToken }
  }

  // Logout (clears cookie)
  async logout() {
    if (typeof document !== 'undefined') {
      deleteMeCookie()
    }
    removeCustomerAccessToken()
    return null
  }

  // Forgot password (Storefront API)
  async forgotCustomerPassword(email: string) {
    const query = `
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
    const res = await this.callStorefront<any>(query, { email })
    if (res.customerRecover?.customerUserErrors?.length > 0) {
      throw new Error(res.customerRecover.customerUserErrors[0].message)
    }
    return true
  }

  // Reset password (Storefront API)
  async resetPassword({ resetToken, password }: { resetToken: string; password: string }) {
    const query = `
      mutation customerReset($resetToken: String!, $password: String!) {
        customerReset(resetToken: $resetToken, password: $password) {
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
    const res = await this.callStorefront<any>(query, { resetToken, password })
    if (res.customerReset?.customerUserErrors?.length > 0) {
      throw new Error(res.customerReset.customerUserErrors[0].message)
    }
    return true
  }

  // Update profile (Storefront API)
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

    return customerToUser(data.customer)
  }

  // Check email existence (Admin API)
  async checkEmail(email: string) {
    const res = await this.get<{ customers: any[] }>(`/customers/search.json?query=email:${email}`)
    return { exists: (res.customers?.length || 0) > 0 }
  }

  // Join as vendor (placeholder)
  async joinAsVendor(data: any) {
    return Promise.resolve()
  }

  // Delete user (placeholder - requires Admin API with high permissions)
  async deleteUser(id: string) {
    throw new Error("Customer deletion requires Admin API with appropriate permissions.")
  }
}

export const userService = UserService.getInstance()
