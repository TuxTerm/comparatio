/** @import { Store } from './types.js' */

/**
 * @type {Store[]}
 */
export const STORES = [
	{
		id: 'flipkart',
		name: 'Flipkart',
		logo: 'f',
		color: '#2874f0',
		description: "India's biggest online mall",
		buildSearchUrl(query) {
			return `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
		}
	},
	{
		id: 'amazonin',
		name: 'Amazon India',
		logo: 'a',
		color: '#ff9900',
		description: 'Everything at your doorstep',
		buildSearchUrl(query) {
			return `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
		}
	},
	{
		id: 'snapdeal',
		name: 'Snapdeal',
		logo: 's',
		color: '#e0393e',
		description: 'Deals on electronics & more',
		buildSearchUrl(query) {
			return `https://www.snapdeal.com/search?keyword=${encodeURIComponent(query)}`;
		}
	},
	{
		id: 'meesho',
		name: 'Meesho',
		logo: 'm',
		color: '#e23744',
		description: 'Affordable fashion & home',
		buildSearchUrl(query) {
			return `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
		}
	}
];

export const DEFAULT_CURRENCY = 'INR';