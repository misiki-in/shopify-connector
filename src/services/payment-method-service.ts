import { BaseService } from './base-service.js'
import type { PaymentMethod, PaginatedResponse } from '../types/index.js'

/**
 * PaymentMethodService provides functionality for working with payment methods
 * in the Shopify Storefront API.
 */
export class PaymentMethodService extends BaseService {
  private static instance: PaymentMethodService

  /**
   * Get the singleton instance of PaymentMethodService
   */
  static getInstance(): PaymentMethodService {
    if (!PaymentMethodService.instance) {
      PaymentMethodService.instance = new PaymentMethodService()
    }
    return PaymentMethodService.instance
  }

  /**
   * Fetches available payment gateways from Shopify
   * 
   * @param {Object} options - The request options
   * @param {number} [options.page=1] - The page number
   * @param {string} [options.q=''] - Search query
   * @param {string} [options.sort='-createdAt'] - Sort order
   * @returns {Promise<PaginatedResponse<PaymentMethod>>} Paginated list of payment methods
   */
  async list({ page = 1, q = '', sort = '-createdAt' } = {}): Promise<PaginatedResponse<PaymentMethod>> {
    const query = `
      query {
        shop {
          paymentSettings {
            acceptedCardBrands
            supportedDigitalWallets
          }
        }
      }
    `

    try {
      const res = await this.callStorefront<any>(query)
      const settings = res.shop?.paymentSettings
      const allData: PaymentMethod[] = []

      // Add Credit Card if brands are accepted
      if (settings?.acceptedCardBrands?.length > 0) {
        allData.push({
          id: 'credit_card',
          name: 'Credit Card',
          type: 'shopify_gateway',
          active: true,
          isTest: false,
          manualCapture: false,
          value: 'credit_card',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      // Add digital wallets
      settings?.supportedDigitalWallets?.forEach((wallet: string) => {
        allData.push({
          id: wallet.toLowerCase().replace(/_/g, '-'),
          name: wallet.replace(/_/g, ' '),
          type: 'digital_wallet',
          active: true,
          isTest: false,
          manualCapture: false,
          value: wallet.toLowerCase(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })

      // Always include COD as it's common for Shopify stores using this connector
      allData.push({
        id: 'manual',
        code: 'cod',
        name: 'Cash on Delivery',
        type: 'manual',
        active: true,
        isTest: false,
        manualCapture: false,
        value: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Filtering if q is provided
      const filteredData = q
        ? allData.filter(m => m.name.toLowerCase().includes(q.toLowerCase()))
        : allData

      return {
        data: filteredData,
        count: filteredData.length,
        pageSize: filteredData.length || 10,
        noOfPage: 1,
        page: 1,
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      return {
        data: [],
        count: 0,
        pageSize: 10,
        noOfPage: 0,
        page: 1,
      }
    }
  }
}

// Export singleton instance
export const paymentMethodService = PaymentMethodService.getInstance()
