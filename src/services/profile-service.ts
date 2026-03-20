import { BaseService } from './base-service.js'
import { userService } from './user-service.js'
import { getCustomerAccessToken } from './auth-service.js'
import type { User } from '../types/index.js'

/**
 * ProfileService provides functionality for working with the customer profile
 * using the Shopify Storefront API.
 */
export class ProfileService extends BaseService {
  private static instance: ProfileService

  /**
   * Get the singleton instance of ProfileService
   */
  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  /**
   * Fetches the current authenticated user's profile
   *
   * @returns {Promise<User>} The requested profile
   */
  async getOne() {
    return userService.getMe()
  }

  /**
   * Updates the current authenticated user's profile
   *
   * @param {Omit<User, 'id'>} data - The data to update
   * @returns {Promise<User>} The updated profile
   */
  async save(data: Omit<User, 'id'>) {
    return userService.updateProfile(data)
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance()
