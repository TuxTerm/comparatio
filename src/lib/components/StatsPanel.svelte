<script>
	import { formatCurrency } from '$lib/analysis.js';

	/** @typedef {{id:string, title:string, price:number, currency?:string, storeName:string, condition?:string, rating?:number|null, reviewsCount?:number|null, url:string, imageUrl?:string}} Deal */
	/** @type {{ deal: Deal|null, stats: {total:number, avg:number, median:number, min:number, max:number, q1:number, q3:number, currency:string}|null, currency?: string }} */
	let { deal, stats, currency = 'INR' } = $props();

	const fmt = (/** @type {number} */ n) => (stats ? formatCurrency(n, stats.currency || currency) : '—');
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
	<div class="sm:col-span-2 lg:col-span-2 lg:row-span-1 border-2 border-signal bg-signal/5 p-5">
		<div class="flex items-center gap-2 text-signal">
			<span class="inline-flex h-8 w-8 items-center justify-center bg-signal font-mono text-lg font-bold text-ink">✓</span>
			<h3 class="term-head font-mono text-sm font-bold uppercase tracking-wider text-signal">Best Value Deal</h3>
		</div>
		{#if deal}
			<p class="mt-3 line-clamp-2 font-mono text-sm text-chalk">{deal.title}</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<div>
					<p class="font-mono text-3xl font-bold text-signal">{fmt(deal.price)}</p>
					<p class="mt-0.5 font-mono text-xs text-chalk-dim">
						<span class="inline-flex items-center gap-1 border border-chalk-dim px-1.5 py-0.5">[{deal.storeName}] · {deal.condition || 'Sale'}</span>
					</p>
				</div>
				{#if deal.rating != null}
					<div class="text-right">
						<p class="font-mono text-sm font-medium text-signal">★ {deal.rating.toFixed(1)}</p>
						{#if deal.reviewsCount != null && deal.reviewsCount > 0}
							<p class="font-mono text-[10px] text-chalk-dim">{deal.reviewsCount.toLocaleString()} reviews</p>
						{/if}
					</div>
				{/if}
			</div>
			<a href={deal.url} target="_blank" rel="noreferrer" class="mt-4 inline-flex items-center gap-2 border-2 border-signal bg-signal px-4 py-2 font-mono text-sm font-bold text-ink transition-colors hover:bg-transparent hover:text-signal">
				open → {deal.storeName}
			</a>
		{:else}
			<p class="mt-3 font-mono text-sm text-chalk-dim">no qualifying deals found.</p>
		{/if}
	</div>

	<div class="border-2 border-border-term bg-ink p-5 term-card-hover">
		<div class="flex items-center gap-2 text-good">
			<span class="font-mono text-xs font-bold uppercase tracking-wider">[lowest]</span>
		</div>
		<p class="mt-2 font-mono text-2xl font-bold text-chalk">{stats ? fmt(stats.min) : '—'}</p>
		<p class="mt-1 font-mono text-[11px] text-chalk-dim">median {stats ? fmt(stats.median) : '—'}</p>
	</div>

	<div class="border-2 border-border-term bg-ink p-5 term-card-hover">
		<div class="flex items-center gap-2 text-signal">
			<span class="font-mono text-xs font-bold uppercase tracking-wider">[avg]</span>
		</div>
		<p class="mt-2 font-mono text-2xl font-bold text-chalk">{stats ? fmt(stats.avg) : '—'}</p>
		<p class="mt-1 font-mono text-[11px] text-chalk-dim">across {stats?.total || 0} listings</p>
	</div>

	<div class="border-2 border-border-term bg-ink p-5 term-card-hover">
		<div class="flex items-center gap-2 text-bad">
			<span class="font-mono text-xs font-bold uppercase tracking-wider">[highest]</span>
		</div>
		<p class="mt-2 font-mono text-2xl font-bold text-chalk">{stats ? fmt(stats.max) : '—'}</p>
		<p class="mt-1 font-mono text-[11px] text-chalk-dim">IQR {stats ? `${fmt(stats.q1)} · ${fmt(stats.q3)}` : '—'}</p>
	</div>

	<div class="border-2 border-border-term bg-ink p-5 term-card-hover">
		<div class="flex items-center gap-2 text-chalk-dim">
			<span class="font-mono text-xs font-bold uppercase tracking-wider">[typical]</span>
		</div>
		<p class="mt-2 font-mono text-2xl font-bold text-chalk">{stats ? fmt(stats.median) : '—'}</p>
		<p class="mt-1 font-mono text-[11px] text-chalk-dim">middle of the pack</p>
	</div>
</div>