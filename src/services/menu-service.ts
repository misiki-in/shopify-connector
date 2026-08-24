import { BaseService } from './base-service'
import { readStaticStore } from './static-store'

export interface MenuItem {
    id: string
    name: string
    link: string
    items?: MenuItem[]
}

export interface Menu {
    id: string
    active: boolean
    name: string
    menuId: string
    link?: string | null
    items: MenuItem[]
    storeId?: string
    userId?: string
    createdAt?: string
    updatedAt?: string
}

const MENU_ITEM_FRAGMENT = `
  fragment MenuItemFields on MenuItem {
    id
    title
    url
    items {
      id
      title
      url
      items {
        id
        title
        url
        items {
          id
          title
          url
        }
      }
    }
  }
`

const MENU_QUERY = `
  ${MENU_ITEM_FRAGMENT}
  query getMenu($handle: String!) {
    menu(handle: $handle) {
      id
      title
      handle
      items {
        ...MenuItemFields
      }
    }
  }
`

export function transformShopifyMenuItem(item: any): MenuItem {
    return {
        id: item.id,
        name: item.title,
        link: item.url ? item.url.replace(/^https?:\/\/[^\/]+/, '') : '',
        items: item.items ? item.items.map(transformShopifyMenuItem) : []
    }
}

export function transformShopifyMenu(menu: any, menuId: string): Menu {
    return {
        id: menu.id,
        active: true,
        name: menu.title,
        menuId: menuId,
        link: null,
        items: menu.items ? menu.items.map(transformShopifyMenuItem) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
}

/**
 * MenuService provides functionality for working with navigation menus
 * from Shopify Storefront API.
 */
export class MenuService extends BaseService {
    private static instance: MenuService

    /**
     * Get the singleton instance
     * 
     * @returns {MenuService} The singleton instance of MenuService
     */
    static getInstance(): MenuService {
        if (!MenuService.instance) {
            MenuService.instance = new MenuService()
        }
        return MenuService.instance
    }

    /**
     * Fetches Menus from Shopify
     * 
     * @returns {Promise<any>} The requested data in PaginatedResponse format
     */
    async list() {
        // The nav reads `response.data` and filters on `menuId`. When the storefront has registered
        // its own store identity, the menus recorded there are the authoritative answer and no
        // Storefront API call is made.
        const staticStore = await readStaticStore()
        if (staticStore) {
            const menus = (staticStore.menu ?? []) as Menu[]
            return {
                count: menus.length,
                data: menus,
                page: 1,
                pageSize: 20,
                noOfPage: 1
            }
        }

        try {
            // Fetch common menus. Shopify default handles are 'main-menu' and 'footer'
            // We map 'main-menu' to 'header' for svelte-commerce compatibility
            const [mainMenuRes, footerMenuRes] = await Promise.all([
                this.callStorefront<{ menu: any }>(MENU_QUERY, { handle: 'main-menu' }),
                this.callStorefront<{ menu: any }>(MENU_QUERY, { handle: 'footer' })
            ]).catch(err => {
                console.error("Error calling Storefront API for menus:", err)
                return [{ menu: null }, { menu: null }]
            })

            const menus: Menu[] = []

            if (mainMenuRes && mainMenuRes.menu) {
                menus.push(transformShopifyMenu(mainMenuRes.menu, 'header'))
            }

            if (footerMenuRes && footerMenuRes.menu) {
                menus.push(transformShopifyMenu(footerMenuRes.menu, 'footer'))
            }
            console.log("menu:", menus)

            // If no menus found, return empty data
            return {
                count: menus.length,
                data: menus,
                page: 1,
                pageSize: 20,
                noOfPage: 1
            }
        } catch (error: any) {
            console.error('Error in MenuService.list:', error)
            return {
                count: 0,
                data: [],
                page: 1,
                pageSize: 20,
                noOfPage: 1
            }
        }
    }

    /**
     * Fetch a specific menu by handle
     * @param handle Shopify menu handle (e.g., 'main-menu', 'footer')
     */
    async getMenu(handle: string) {
        const res = await this.callStorefront<{ menu: any }>(MENU_QUERY, { handle })
        if (!res.menu) return null
        return transformShopifyMenu(res.menu, handle)
    }
}

// Use singleton instance
export const menuService = MenuService.getInstance()

