import { BaseService } from './base-service'

export class CouponService extends BaseService {
  private static instance: CouponService

  static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService()
    }
    return CouponService.instance
  }

  async fetchCoupons() {
    const res = await this.get<{ price_rules: any[] }>('/price_rules.json')
    return res.price_rules?.map(rule => ({
      id: rule.id.toString(),
      code: rule.title,
      amount: parseFloat(rule.value),
      type: rule.value_type === 'percentage' ? 'PERCENT' : 'FIXED',
    })) || []
  }
}

export const couponService = CouponService.getInstance()
