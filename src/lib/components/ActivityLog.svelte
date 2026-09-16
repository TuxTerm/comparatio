<script>
	/** @typedef {{ type: 'info'|'success'|'error'|'step', message: string, ts?: string }} LogEntry */
	/** @typedef {{ id:string, name:string }} StoreBrief */
	/** @type {{ active: boolean, entries: Array<LogEntry>, query?: string, stores?: Array<StoreBrief>, scrollEl?: HTMLElement|null }} */
	let { active, entries, query, stores, scrollEl = $bindable() } = $props();
</script>

<div class="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-[#0a0f1a] shadow-2xl shadow-black/50">
	<div class="flex items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-4 py-2.5">
		<span class="h-3 w-3 rounded-full bg-red-500/80"></span>
		<span class="h-3 w-3 rounded-full bg-amber-500/80"></span>
		<span class="h-3 w-3 rounded-full bg-emerald-500/80"></span>
		{#if query}
			<span class="ml-3 inline-flex items-center gap-1.5 font-mono text-xs text-slate-300">
				<span class="text-violet-400">$</span> scrape --query "<span class="text-emerald-300">{query}</span>" {#each stores ?? [] as s}<span class="text-sky-300">--store {s.name.toLowerCase()}</span> {/each}
			</span>
		{:else}
			<span class="ml-3 font-mono text-xs text-slate-500">firecrawl-scraper — idle</span>
		{/if}
		<span class="ml-auto inline-flex items-center gap-1.5 text-xs">
			<span class="h-2 w-2 rounded-full {active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}"></span>
			<span class="font-mono text-slate-400">{active ? 'running' : 'ready'}</span>
		</span>
	</div>
	<div bind:this={scrollEl} class="max-h-64 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
		{#if !entries.length}
			<p class="text-slate-500">Waiting for a query… type a product name above and press <span class="text-violet-400">Enter</span>.</p>
		{:else}
			{#each entries as entry}
				<div class="flex flex-col gap-0.5 py-0.5">
					<div class="flex items-start gap-2">
						<span class="text-slate-600">{#if entry.ts}{entry.ts}{:else}───{/if}</span>
						<span class:logged-info={entry.type==='info'} class:logged-success={entry.type==='success'} class:logged-error={entry.type==='error'} class:logged-step={entry.type==='step'}>
							{#if entry.type === 'step'}<span class="text-violet-400">▸</span>{:else if entry.type === 'error'}<span class="text-red-400">✗</span>{:else if entry.type === 'success'}<span class="text-emerald-400">✓</span>{:else}<span class="text-slate-500">•</span>{/if}
							{entry.message}
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>