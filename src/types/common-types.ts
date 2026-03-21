export type PaginatedResponse<T> = {
  data: T[]
  count: number
  pageSize: number
  noOfPage: number
  page: number
}

export type Enquiry = {
	id: string
	email: string
	phone: string
	message: string
	productId: string
	createdAt: string
	updatedAt: string
}

export type Feedback = {
	id: string // Unique identifier for the feedback
	userId: string // ID of the user providing the feedback
	content: string // Feedback or review content
	rating: number // Rating value, e.g., 1-5
	isActive: boolean // Indicates if the feedback is active/visible
	response: string | null // Optional response to the feedback
	feedbackDate: string // Date feedback was provided
	createdAt: string // Timestamp of when the feedback was created
	updatedAt: string // Timestamp of the last update to the feedback
}

export type Coupon = {
	id: string // Unique identifier for the coupon
	code: string // Unique code for the coupon
	amount: number // Discount amount
  discountValue: number
	type: 'USER' | 'TOTAL' | 'BOGO' // Type of coupon, as defined by the CouponTypeEnum
	maxAmount: number // Maximum discount amount
	createdAt: string // Timestamp of when the coupon was created
	updatedAt: string // Timestamp of the last update to the coupon
}

export type Blog = any
export type Contact = any