import { BaseService } from './base-service'
import { storeData } from '../config'
import { categoryService } from './category-service'

export class StoreService extends BaseService {
  private static instance: StoreService

  static getInstance(): StoreService {
    if (!StoreService.instance) {
      StoreService.instance = new StoreService()
    }
    return StoreService.instance
  }

  async getStore() {
    const res = await this.get<{ shop: any }>('/shop.json')
    return res.shop
  }

  /**
   * Retrieves store details by ID or Domain (Platform standard)
   */
  async getStoreByIdOrDomain(params?: { storeId?: string; domain?: string }) {
    try {
      const store = JSON.parse(storeData)
      // Attempt to enrich with megamenu from collections
      // try {
      //   store.megamenu = await categoryService.getMegamenu()
      // } catch (e) {
      //   console.warn("Failed to fetch megamenu for store:", e.message)
      //   store.megamenu = []
      // }
      return store
    } catch (error: any) {
      console.error("Error in getStoreByIdOrDomain:", error)
      return {}
    }
  }
}

export const storeService = StoreService.getInstance()
