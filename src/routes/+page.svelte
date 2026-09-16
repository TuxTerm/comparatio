<script>
	import { onMount } from 'svelte';
	import { STORES } from '$lib/config.js';
	import { toCSV, downloadCSV } from '$lib/csv.js';
	import SearchForm from '$lib/components/SearchForm.svelte';
	import KeyPanel from '$lib/components/KeyPanel.svelte';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import PriceChart from '$lib/components/PriceChart.svelte';
	import ProductGrid from '$lib/components/ProductGrid.svelte';

	/** @typedef {{ message: string, type: 'info'|'success'|'error'|'step', ts?: string }} LogEntry */
	/** @typedef {{ id:string, title:string, price:number, currency?:string, storeName:string, storeColor?:string, condition?:string, rating?:number|null, reviewsCount?:number|null, url:string, imageUrl?:string, shipping?:number, shipsFrom?:string }} ProductRow */
	/** @typedef {{ bestDeal: ProductRow|null, total:number, avg:number, median:number, min:number, max:number, q1:number, q3:number, currency:string, cheapest: ProductRow|null, mostExpensive: ProductRow|null }} Insights */
	/** @typedef {{ id:string, name:string }} StoreBrief */
	/** @typedef {{ id:string, name:string, count:number, error?:string }} SourceStatus */
	/** @typedef {{ ok:boolean, mode:string, query?:string, stores?: StoreBrief[], statuses?: SourceStatus[], products?: ProductRow[], insights?: Insights|null, info?:string, error?:string }} ScrapeResult */

	const stores = STORES;

	let selectedStores = $state(new Set(STORES.map((s) => s.id)));
	let hasServerKey = $state(false);
	let providedKey = $state('');
	let busy = $state(false);
	let error = $state('');
	let modeInfo = $state('');
	let result = $state(/** @type {ScrapeResult|null} */ (null));
	let logEntries = $state(/** @type {LogEntry[]} */ ([]));
	let logScroll = $state(/** @type {HTMLElement|null} */ (null));

	const products = $derived(result?.products ?? []);
	const insights = $derived(result?.insights ?? null);
	const lastQuery = $derived(result?.query ?? '');
	const lastStoreNames = $derived(result?.stores ?? []);
	const statuses = $derived(result?.statuses ?? []);

	onMount(async () => {
		try {
			const persisted = localStorage.getItem('fc_key');
			if (persisted) providedKey = persisted;
		} catch {
			/* ignore */
		}
		try {
			const res = await fetch('/api/scrape');
			const data = await res.json();
			hasServerKey = Boolean(data?.hasKey);
		} catch {
			/* ignore */
		}
	});

	/**
	 * @param {string} msg
	 * @param {'info'|'success'|'error'|'step'} type
	 */
	function pushLog(msg, type = 'info') {
		logEntries = [
			...logEntries,
			{ message: msg, type, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
		];
	}

	/** @param {string} q */
	async function handleSearch(q) {
		if (busy) return;
		busy = true;
		error = '';
		modeInfo = '';
		logEntries = [];
		result = null;

		pushLog(`Starting scrape for “${q}”`, 'step');
		const storeNames = [...selectedStores].map((id) => STORES.find((s) => s.id === id)?.name || id);
		pushLog(`Targets: ${storeNames.join(', ')}`);

		try {
			const res = await fetch('/api/scrape', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: q,
					stores: [...selectedStores],
					apiKey: providedKey || ''
				})
			});
			/** @type {ScrapeResult} */
			const data = await res.json();
			if (!data.ok) {
				error = data.error || 'Request failed';
				pushLog(error, 'error');
				return;
			}

			modeInfo = data.info || '';
			pushLog(`Scraped live from ${data.stores?.length || 0} marketplace(s)`, 'success');

			result = data;

			const n = data.products?.length || 0;
			if (data.insights?.bestDeal) {
				const b = data.insights.bestDeal;
				pushLog(`Best value: ${b.title} at ${b.price} (${b.currency || 'INR'})`, 'success');
			}
			pushLog(`${n} relevant listing${n === 1 ? '' : 's'} found`, n ? 'success' : 'error');
		} catch (err) {
			const msg = /** @type {{ message?: string }} */ (err)?.message || 'Network error while scraping.';
			error = msg;
			pushLog(msg, 'error');
		} finally {
			busy = false;
		}
	}

	function exportCSV() {
		if (!products.length) return;
		const rows = products.map((p) => ({
			Title: p.title,
			Price: p.price,
			Currency: p.currency || 'INR',
			Condition: p.condition || '',
			Rating: p.rating != null ? p.rating : '',
			Reviews: p.reviewsCount != null ? p.reviewsCount : '',
			Shipping: p.shipping || 0,
			Store: p.storeName,
			URL: p.url
		}));
		const stamp = new Date().toISOString().slice(0, 10);
		const file = `${(lastQuery || 'products').replace(/[^\w]+/g, '_').toLowerCase().slice(0, 40)}_${stamp}.csv`;
		downloadCSV(toCSV(rows), file);
	}

	$effect(() => {
		if (logScroll && logScroll.scrollHeight) {
			logScroll.scrollTop = logScroll.scrollHeight;
		}
	});

	const sourcesList = stores.map((s) => `${s.name} · ${s.description}`);
</script>

<svelte:head>
	<title>PricePulse — Find the Best Price</title>
	<meta name="description" content="Scrape leading marketplaces with Firecrawl and instantly surface the best deal." />
</svelte:head>

<div class="min-h-screen bg-[#0b1120] text-slate-200">
	<div class="pointer-events-none fixed inset-x-0 top-0 h-96 overflow-hidden">
		<div class="absolute -top-24 left-1/2 h-72 w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"></div>
		<div class="absolute top-10 left-10 h-40 w-40 rounded-full bg-fuchsia-600/10 blur-3xl"></div>
		<div class="absolute top-16 right-16 h-40 w-40 rounded-full bg-sky-600/10 blur-3xl"></div>
	</div>

	<div class="pointer-events-none fixed inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0b1120] to-transparent"></div>

	<main class="relative z-10 mx-auto max-w-6xl px-4 pt-10 sm:px-6">
		<section class="text-center">
			<div class="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
				<span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
				Powered by Firecrawl AI extraction
			</div>
			<h1 class="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl" style="line-height: 1.05;">
				Never overpay again.
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
				Search any product. We scrape <span class="text-slate-200">Flipkart</span>, <span class="text-slate-200">Amazon India</span>, <span class="text-slate-200">Snapdeal</span> &amp; <span class="text-slate-200">Meesho</span> live, compare every source and recommend the smartest deal in ₹ for your budget.
			</p>
		</section>

		<section class="mt-10 space-y-4">
			<SearchForm {stores} selected={selectedStores} onSubmit={handleSearch} {busy} />
			<KeyPanel sources={sourcesList} onApiKeyChange={(v) => (providedKey = v)} {hasServerKey} />
		</section>
	</main>

	<section class="relative z-10 mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-sm font-mono uppercase tracking-widest text-slate-500">Live activity</h2>
			{#if modeInfo}<span class="text-xs text-slate-500">{modeInfo}</span>{/if}
		</div>
		<div class="mt-2">
			<ActivityLog active={busy} entries={logEntries} query={lastQuery} stores={lastStoreNames} bind:scrollEl={logScroll} />
		</div>

		{#if error}
			<div class="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠ {error}</div>
		{/if}

		{#if result && insights}
			<div class="mt-8 space-y-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 class="text-xl font-bold text-white">Results for “{lastQuery}”</h2>
					<button onclick={exportCSV} disabled={!products.length} class="disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
						Export CSV ({products.length})
					</button>
				</div>

				<StatsPanel deal={insights.bestDeal} stats={insights} currency={insights.currency} />

				<PriceChart products={products} bestDeal={insights.bestDeal || null} currency={insights.currency} />

				{#if statuses.length}
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Sources:</span>
						{#each statuses as st}
							<span class="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs {st.count > 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}">
								<span class="h-1.5 w-1.5 rounded-full {st.count > 0 ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
								{st.name}
								<span class="opacity-70">{st.count > 0 ? `${st.count} found` : 'blocked'}</span>
							</span>
						{/each}
					</div>
				{/if}

				<header class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold text-slate-200">All listings</h3>
				</header>
				<ProductGrid products={products} currency={insights.currency} />
			</div>
		{:else if !busy && !error}
			<div class="mt-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
				No results yet — run a search above and the best-price recommendation will appear here. The live activity log updates as we scrape each store.
			</div>
		{/if}
	</section>
</div>