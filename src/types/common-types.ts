export type PaginatedResponse<T> = {
  data: T[]
  count: number
  pageSize: number
  noOfPage: number
  page: number
}
