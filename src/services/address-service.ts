import type { Address, CreateAddressParams, ListAddressesParams, PaginatedResponse, UpdateAddressParams } from "../types"
import { BaseService } from "./base-service"
import { getCustomerAccessToken } from "./auth-service"

/**
 * AddressService provides functionality for managing user addresses
 * using the Shopify Storefront API.
 */
export class AddressService extends BaseService {
  private static instance: AddressService

  /**
   * Get the singleton instance
   */
  static getInstance(): AddressService {
    if (!AddressService.instance) {
      AddressService.instance = new AddressService()
    }
    return AddressService.instance
  }

  /**
   * Fetches a paginated list of addresses for the customer
   */
  async list(params: ListAddressesParams = {}): Promise<PaginatedResponse<Address>> {
    const customerAccessToken = getCustomerAccessToken()
    if (!customerAccessToken) {
      return { data: [], count: 0, pageSize: 100, noOfPage: 0, page: 1 }
    }
    const query = `
      query getCustomerAddresses($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          addresses(first: 100) {
            edges {
              node {
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
          defaultAddress {
            id
          }
        }
      }
    `

    try {
      const res = await this.callStorefront<any>(query, { customerAccessToken })
      const customer = res.customer
      if (!customer) throw new Error("Customer not found")

      const defaultAddressId = customer.defaultAddress?.id
      const addresses = customer.addresses.edges.map(({ node }: any) =>
        this.transformShopifyAddress(node, defaultAddressId)
      )

      return {
        data: addresses,
        count: addresses.length,
        pageSize: 100,
        noOfPage: 1,
        page: 1
      }
    } catch (error) {
      console.error("AddressService.list Error:", error)
      return { data: [], count: 0, pageSize: 100, noOfPage: 0, page: 1 }
    }
  }

  /**
   * Fetches a single address by ID
   */
  async fetchAddress(id: string): Promise<Address> {
    // Shopify Storefront API doesn't have a direct "fetch address by ID" without customer context easily
    // We fetch all and find the one we need, or just return from local if available.
    // For simplicity and interface alignment, we'll fetch list and find.
    const res = await this.list()
    const address = res.data.find(a => a.id === id)
    if (!address) throw new Error("Address not found")
    return address
  }

  /**
   * Creates a new address for the current customer
   */
  async saveAddress(address: CreateAddressParams): Promise<Address> {
    const mutation = `
      mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress {
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
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `

    const customerAccessToken = getCustomerAccessToken()
    if (!customerAccessToken) throw new Error("Customer access token not found")

    const res = await this.callStorefront<any>(mutation, {
      customerAccessToken,
      address: this.mapToShopifyAddressInput(address)
    })

    const data = res.customerAddressCreate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return this.transformShopifyAddress(data.customerAddress)
  }

  /**
   * Updates an existing address
   */
  async editAddress(id: string, address: UpdateAddressParams): Promise<Address> {
    const mutation = `
      mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
          customerAddress {
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
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `

    const customerAccessToken = getCustomerAccessToken()
    if (!customerAccessToken) throw new Error("Customer access token not found")

    const res = await this.callStorefront<any>(mutation, {
      customerAccessToken,
      id,
      address: this.mapToShopifyAddressInput(address)
    })

    const data = res.customerAddressUpdate
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }

    return this.transformShopifyAddress(data.customerAddress)
  }

  /**
   * Deletes an address
   */
  async deleteAddress(id: string): Promise<void> {
    const mutation = `
      mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
        customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
          deletedCustomerAddressId
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `

    const customerAccessToken = getCustomerAccessToken()
    if (!customerAccessToken) throw new Error("Customer access token not found")

    const res = await this.callStorefront<any>(mutation, {
      customerAccessToken,
      id
    })

    const data = res.customerAddressDelete
    if (data.customerUserErrors?.length > 0) {
      throw new Error(data.customerUserErrors[0].message)
    }
  }

  /**
   * Transforms Shopify MailingAddress to local Address type
   */
  private transformShopifyAddress(node: any, defaultAddressId?: string): Address {
    return {
      id: node.id,
      active: true,
      address_1: node.address1,
      address_2: node.address2,
      city: node.city,
      country: node.country,
      firstName: node.firstName,
      lastName: node.lastName,
      phone: node.phone,
      state: node.province,
      zip: node.zip,
      countryCode: null, // Shopify MailingAddress doesn't always provide code in Storefront API node
      isPrimary: node.id === defaultAddressId,
    }
  }

  /**
   * Maps local address data to Shopify MailingAddressInput
   */
  private mapToShopifyAddressInput(address: any): any {
    return {
      address1: address.address_1,
      address2: address.address_2,
      city: address.city,
      country: address.country || address.countryCode,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      province: address.state,
      zip: address.zip,
    }
  }
}

export const addressService = AddressService.getInstance()
