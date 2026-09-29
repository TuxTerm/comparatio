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
	<title>comparatio.swag — Find the Best Price</title>
	<meta name="description" content="Scalp Flipkart, Amazon India, Snapdeal & Meesho with Firecrawl and surface the smartest deal in ₹ for your budget." />
</svelte:head>

<div class="min-h-screen bg-ink text-chalk">
	<!-- terminal header / masthead (structure kept, styling swapped) -->
	<header class="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
		<a href="/" class="term-link font-mono text-sm text-chalk no-underline">
			<span class="font-bold text-signal">$</span> comparatio.swag
		</a>
		<nav class="hidden items-center gap-5 font-mono text-sm sm:flex">
			<a href="#search" class="text-chalk no-underline transition-colors hover:text-signal">search</a>
			<a href="#activity" class="text-chalk no-underline transition-colors hover:text-signal">activity</a>
			<a href="#results" class="text-chalk no-underline transition-colors hover:text-signal">results</a>
			<a href="https://github.com/TuxTerm/comparatio" target="_blank" rel="noreferrer" class="text-chalk no-underline transition-colors hover:text-signal">src</a>
		</nav>
	</header>

	<hr class="border-t border-dashed border-border-term" />

	<main class="relative z-10 mx-auto max-w-6xl px-4 pt-12 sm:px-6">
		<section id="search" class="text-center">
			<div class="inline-flex items-center gap-2 border border-signal/60 bg-signal/5 px-3 py-1 font-mono text-xs text-signal">
				<span class="h-2 w-2 animate-pulse rounded-none bg-signal"></span>
				scrape --engine firecrawl --markets in
			</div>
			<h1 class="mt-8 font-mono text-3xl font-bold leading-tight text-chalk sm:text-5xl">
				[sudo] never pay <span class="bg-signal px-2 text-ink">full price</span>
			</h1>
			<p class="mx-auto mt-5 max-w-2xl font-mono text-sm text-chalk-dim sm:text-base">
				<span class="text-signal">$</span> Search any product. We scrape
				<span class="text-chalk">Flipkart</span>, <span class="text-chalk">Amazon India</span>, <span class="text-chalk">Snapdeal</span> &amp;
				<span class="text-chalk">Meesho</span> live, diff every source and recommend the smartest deal in ₹ for your budget.
			</p>
		</section>

		<section class="mt-10 space-y-4">
			<SearchForm {stores} selected={selectedStores} onSubmit={handleSearch} {busy} />
			<KeyPanel sources={sourcesList} onApiKeyChange={(v) => (providedKey = v)} {hasServerKey} />
		</section>
	</main>

	<section id="activity" class="relative z-10 mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
		<div class="flex items-center justify-between gap-2">
			<h2 class="term-head font-mono text-sm uppercase tracking-widest text-chalk-dim">Live activity</h2>
			{#if modeInfo}<span class="font-mono text-xs text-chalk-dim">{modeInfo}</span>{/if}
		</div>
		<div class="mt-3">
			<ActivityLog active={busy} entries={logEntries} query={lastQuery} stores={lastStoreNames} bind:scrollEl={logScroll} />
		</div>

		{#if error}
			<div class="mt-4 border-2 border-bad/50 bg-bad/10 px-4 py-3 font-mono text-sm text-bad">⚠ {error}</div>
		{/if}

		{#if result && insights}
			<div id="results" class="mt-10 space-y-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 class="term-head font-mono text-xl font-bold text-chalk">Results for “{lastQuery}”</h2>
					<button onclick={exportCSV} disabled={!products.length} class="disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 border-2 border-signal bg-signal px-4 py-2 font-mono text-sm font-bold text-ink transition-colors hover:bg-transparent hover:text-signal">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
						export csv ({products.length})
					</button>
				</div>

				<StatsPanel deal={insights.bestDeal} stats={insights} currency={insights.currency} />

				<PriceChart products={products} bestDeal={insights.bestDeal || null} currency={insights.currency} />

				{#if statuses.length}
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-mono text-xs font-semibold uppercase tracking-wider text-chalk-dim">Sources:</span>
						{#each statuses as st}
							<span class="inline-flex items-center gap-1.5 border-2 px-2.5 py-1 font-mono text-xs {st.count > 0 ? 'border-good/60 bg-good/10 text-good' : 'border-bad/60 bg-bad/10 text-bad'}">
								<span class="h-1.5 w-1.5 rounded-none {st.count > 0 ? 'bg-good' : 'bg-bad'}"></span>
								{st.name}
								<span class="opacity-70">[{st.count > 0 ? `${st.count} found` : 'blocked'}]</span>
							</span>
						{/each}
					</div>
				{/if}

				<header class="mb-3 flex items-center justify-between">
					<h3 class="term-head font-mono text-sm text-chalk">All listings</h3>
				</header>
				<ProductGrid products={products} currency={insights.currency} />
			</div>
		{:else if !busy && !error}
			<div class="mt-8 border-2 border-dashed border-border-term bg-ink px-6 py-12 text-center font-mono text-sm text-chalk-dim">
				<span class="text-signal">$</span> no results yet — run a search above and the best-price recommendation will appear here.
				<br />
				the live activity log updates as we scrape each store.
			</div>
		{/if}
	</section>
</div>