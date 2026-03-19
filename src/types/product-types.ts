export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

export type Product = {
  id: string
  handle: string
  active: boolean
  status: ProductStatus
  title: string
  description: string | null
  thumbnail: string | null
  slug: string | null
  price: number
  mrp: number
  images: string // Comma-separated URLs or handled specifically by transformer
  variants: Variant[]
  options: any[]
  tags: string[]
  // ... other fields can be added as needed to match the platform
}

export type Variant = {
  id: string
  productId: string
  title: string
  sku: string | null
  price: number
  mrp: number
  stock_quantity: number
  stock_status: 'instock' | 'outofstock'
  options: any[]
}

export type Category = {
	id: string // Unique identifier for the category
	isActive: boolean // Indicates if the category is active
	isInternal: boolean // Indicates if the category is internal
	isMegamenu: boolean // Indicates if the category is part of a megamenu
	thumbnail: string | null // Optional thumbnail image URL
	path: string | null // Optional URL path for the category
	level: number | null // Optional level in the category hierarchy
	description: string | null // Optional description of the category
	isFeatured: boolean // Indicates if the category is featured
	keywords: string | null // Optional keywords for SEO
	rank: number // Rank for sorting, defaulting to 0
	link: string | null // Optional link associated with the category
	metaDescription: string | null // Optional meta description for SEO
	metaKeywords: string | null // Optional meta keywords for SEO
	metaTitle: string | null // Optional meta title for SEO
	name: string // Name of the category
	parentCategoryId: string | null // Optional reference to the parent category
	store: string | null // Optional store associated with the category
	slug: string | null // Optional URL-friendly name
	userId: string // User ID of the creator or owner
	activeProducts: number // Count of active products, defaults to 0
	inactiveProducts: number // Count of inactive products, defaults to 0
	createdAt: string // Timestamp of creation
	updatedAt: string // Timestamp of last update
}

export type Collection = {
	id: string // Unique identifier for the collection
	name: string // Name of the collection
	slug: string // URL-friendly slug for the collection
	description: string | null // Optional description of the collection
	isActive: boolean // Indicates if the collection is active
	isFeatured: boolean // Indicates if the collection is featured
	userId: string // User ID of the creator or owner
	productCount: number // Number of products in the collection, defaults to 0
	thumbnail: string | null // Optional thumbnail image URL
	metaTitle: string | null // Optional meta title for SEO
	metaDescription: string | null // Optional meta description for SEO
	createdAt: string // Timestamp of when the collection was created
	updatedAt: string // Timestamp of last update to the collection
}
