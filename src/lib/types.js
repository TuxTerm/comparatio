/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} title
 * @property {number} price
 * @property {string} [currency]
 * @property {string} [url]
 * @property {string} [imageUrl]
 * @property {number|null} [rating]
 * @property {number|null} [reviewsCount]
 * @property {string} [condition]
 * @property {number} [shipping]
 * @property {string} [shipsFrom]
 * @property {string} [storeId]
 * @property {string} [storeName]
 * @property {string} [storeColor]
 * @property {string[]} [keywords]
 * @property {string} [source]
 * @property {{ brand?: string, listPrice?: number|null, inStock?: boolean }} [details]
 */

/**
 * @typedef {Object} Insights
 * @property {number} total
 * @property {Product|null} bestDeal
 * @property {number} avg
 * @property {number} median
 * @property {number} min
 * @property {number} max
 * @property {number} q1
 * @property {number} q3
 * @property {Product|null} cheapest
 * @property {Product|null} mostExpensive
 * @property {string} currency
 */

/**
 * @typedef {Object} LogEntry
 * @property {string} message
 * @property {'info'|'success'|'error'|'step'} type
 * @property {string} [ts]
 */

/**
 * @typedef {Object} ScrapeResult
 * @property {boolean} ok
 * @property {string} mode
 * @property {string} [currency]
 * @property {string} [query]
 * @property {Array<{id:string,name:string}>} [stores]
 * @property {Product[]} [products]
 * @property {Insights} [insights]
 * @property {string} [info]
 * @property {string} [error]
 */

/**
 * @typedef {Object} Store
 * @property {string} id
 * @property {string} name
 * @property {string} logo
 * @property {string} color
 * @property {string} description
 * @property {(query: string) => string} buildSearchUrl
 */

export {};