export type Vendor = {
	id: string
	status?: string | null
	address?: string | null
	email: string
	phone: string
	dialCode?: string | null
	name?: string | null
	email2?: string | null
	banners?: string | null
	logo?: string | null
	countryName?: string | null
	country?: string | null // Country.iso2 reference
	about?: string | null
	businessName: string
	website?: string | null
	description?: string | null
	info?: string | null
	shippingCharges: number
	codCharges: number
	slug?: string | null
	featuredImage?: string | null
	isEmailVerified: boolean
	isPhoneVerified: boolean
	address_1?: string | null
	address_2?: string | null
	city?: string | null
	isApproved: boolean
	isDeleted: boolean
	state?: string | null
	tax_number?: string | null
	zip?: string | null
	user: string // User.id reference
	createdAt: string
	updatedAt: string
}