<script>
	import { formatCurrency } from '$lib/analysis.js';

	/** @typedef {{id:string, title:string, price:number, currency?:string, storeName:string, condition?:string, rating?:number|null, reviewsCount?:number|null, url:string, imageUrl?:string}} Deal */
	/** @type {{ deal: Deal|null, stats: {total:number, avg:number, median:number, min:number, max:number, q1:number, q3:number, currency:string}|null, currency?: string }} */
	let { deal, stats, currency = 'USD' } = $props();

	const fmt = (/** @type {number} */ n) => (stats ? formatCurrency(n, stats.currency || currency) : '—');
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
	<div class="sm:col-span-2 lg:col-span-2 lg:row-span-1 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-900/60 p-5">
		<div class="flex items-center gap-2 text-emerald-300">
			<span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
			</span>
			<h3 class="text-sm font-semibold uppercase tracking-wider">Best Value Deal</h3>
		</div>
		{#if deal}
			<p class="mt-3 line-clamp-2 font-medium text-slate-100">{deal.title}</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<div>
					<p class="text-3xl font-bold text-emerald-300">{fmt(deal.price)}</p>
					<p class="mt-0.5 text-xs text-slate-400">
						<span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style="background:{deal.storeName?.toLowerCase() === 'ebay' ? '#e5323822' : '#36348f26'}">
							{deal.storeName} · {deal.condition || 'Sale'}
						</span>
					</p>
				</div>
				{#if deal.rating != null}
					<div class="text-right">
						<p class="text-sm font-medium text-amber-300">★ {deal.rating.toFixed(1)}</p>
						{#if deal.reviewsCount != null && deal.reviewsCount > 0}
							<p class="text-[10px] text-slate-500">{deal.reviewsCount.toLocaleString()} reviews</p>
						{/if}
					</div>
				{/if}
			</div>
			<a href={deal.url} target="_blank" rel="noreferrer" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400">
				View on {deal.storeName}
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6v6M10 14l10-10" /></svg>
			</a>
		{:else}
			<p class="mt-3 text-sm text-slate-500">No qualifying deals found.</p>
		{/if}
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
		<div class="flex items-center gap-2 text-slate-300">
			<svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
			<span class="text-xs font-semibold uppercase tracking-wider">Lowest</span>
		</div>
		<p class="mt-2 text-2xl font-bold text-slate-100">{stats ? fmt(stats.min) : '—'}</p>
		<p class="mt-1 text-[11px] text-slate-500">Median {stats ? fmt(stats.median) : '—'}</p>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
		<div class="flex items-center gap-2 text-slate-300">
			<svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 13.414V19a1 1 0 01-.447.894l-4 2A1 1 0 019 21v-7.586L2.293 6.707A1 1 0 012 6V4z"/></svg>
			<span class="text-xs font-semibold uppercase tracking-wider">Average</span>
		</div>
		<p class="mt-2 text-2xl font-bold text-slate-100">{stats ? fmt(stats.avg) : '—'}</p>
		<p class="mt-1 text-[11px] text-slate-500">Across {stats?.total || 0} listings</p>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
		<div class="flex items-center gap-2 text-slate-300">
			<svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 6h10a2 2 0 002-2v-5l-2.5-1.5a2 2 0 00-2 0L14 13a2 2 0 01-2 0l-2.5-1.5a2 2 0 00-2 0L5 13"/></svg>
			<span class="text-xs font-semibold uppercase tracking-wider">Highest</span>
		</div>
		<p class="mt-2 text-2xl font-bold text-slate-100">{stats ? fmt(stats.max) : '—'}</p>
		<p class="mt-1 text-[11px] text-slate-500">IQR {stats ? `${fmt(stats.q1)} · ${fmt(stats.q3)}` : '—'}</p>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
		<div class="flex items-center gap-2 text-slate-300">
			<svg class="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8 5-8-5M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/></svg>
			<span class="text-xs font-semibold uppercase tracking-wider">Typical</span>
		</div>
		<p class="mt-2 text-2xl font-bold text-slate-100">{stats ? fmt(stats.median) : '—'}</p>
		<p class="mt-1 text-[11px] text-slate-500">Middle of the pack</p>
	</div>
</div>