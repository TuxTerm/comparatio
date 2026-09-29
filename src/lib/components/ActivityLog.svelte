<script>
	/** @typedef {{ type: 'info'|'success'|'error'|'step', message: string, ts?: string }} LogEntry */
	/** @typedef {{ id:string, name:string }} StoreBrief */
	/** @type {{ active: boolean, entries: Array<LogEntry>, query?: string, stores?: Array<StoreBrief>, scrollEl?: HTMLElement|null }} */
	let { active, entries, query, stores, scrollEl = $bindable() } = $props();
</script>

<div class="w-full max-w-4xl mx-auto overflow-hidden border-2 border-border-term bg-[#121010]">
	<div class="flex items-center gap-2 border-b-2 border-border-term bg-ink-soft px-4 py-2.5">
		<span class="h-3 w-3 rounded-none bg-bad/80"></span>
		<span class="h-3 w-3 rounded-none bg-signal-deep/80"></span>
		<span class="h-3 w-3 rounded-none bg-good/80"></span>
		{#if query}
			<span class="ml-3 inline-flex items-center gap-1.5 font-mono text-xs text-chalk">
				<span class="text-signal">$</span> scrape --query "<span class="text-signal">{query}</span>" {#each stores ?? [] as s}<span class="text-chalk-dim">--store {s.name.toLowerCase()}</span> {/each}
			</span>
		{:else}
			<span class="ml-3 font-mono text-xs text-chalk-dim">firecrawl-scraper — idle</span>
		{/if}
		<span class="ml-auto inline-flex items-center gap-1.5 text-xs">
			<span class="h-2 w-2 rounded-none {active ? 'bg-signal animate-pulse' : 'bg-chalk-dim'}"></span>
			<span class="font-mono text-chalk-dim">{active ? 'running' : 'ready'}</span>
		</span>
	</div>
	<div bind:this={scrollEl} class="max-h-64 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
		{#if !entries.length}
			<p class="text-chalk-dim">Waiting for a query… type a product name above and press <span class="text-signal">Enter</span>.</p>
		{:else}
			{#each entries as entry}
				<div class="flex flex-col gap-0.5 py-0.5">
					<div class="flex items-start gap-2">
						<span class="text-chalk-dim/60">{#if entry.ts}{entry.ts}{:else}───{/if}</span>
						<span class:logged-info={entry.type==='info'} class:logged-success={entry.type==='success'} class:logged-error={entry.type==='error'} class:logged-step={entry.type==='step'}>
							{#if entry.type === 'step'}<span class="text-signal">▸</span>{:else if entry.type === 'error'}<span class="text-bad">✗</span>{:else if entry.type === 'success'}<span class="text-good">✓</span>{:else}<span class="text-chalk-dim">•</span>{/if}
							{entry.message}
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.logged-info { color: var(--fg); }
	.logged-success { color: #7bd88f; }
	.logged-error { color: #f26d6d; }
	.logged-step { color: var(--fg); }
</style>