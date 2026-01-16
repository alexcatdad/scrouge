<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";

	let searchQuery = $state("");
	let selectedCategory = $state<string | null>(null);

	const categories = [
		{ id: null, label: "All" },
		{ id: "streaming", label: "Streaming" },
		{ id: "music", label: "Music" },
		{ id: "gaming", label: "Gaming" },
		{ id: "productivity", label: "Productivity" },
		{ id: "news", label: "News" },
		{ id: "fitness", label: "Fitness" },
		{ id: "cloud", label: "Cloud" },
		{ id: "other", label: "Other" },
	];

	// Use search when there's a query, otherwise list by category
	const templatesQuery = useQuery(
		api.templates.search,
		{ query: searchQuery || "" }
	);

	// Filter by category on client side when listing all
	const filteredTemplates = $derived(() => {
		if (!templatesQuery.data) return [];
		if (!selectedCategory) return templatesQuery.data;
		return templatesQuery.data.filter((t) => t.category === selectedCategory);
	});

	function getIconUrl(website: string | undefined): string {
		if (!website) return "";
		return `https://logo.clearbit.com/${website}`;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<button onclick={() => goto("/dashboard/subscriptions")} class="p-2 -ml-2 hover:bg-surface rounded-lg transition-colors">
			<svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="text-2xl font-bold text-white">Add Subscription</h1>
	</div>

	<!-- Search -->
	<div class="relative">
		<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search services..."
			class="w-full pl-12 pr-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
		/>
	</div>

	<!-- Category Tabs -->
	<div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
		{#each categories as category}
			<button
				onclick={() => {
					selectedCategory = category.id;
					searchQuery = "";
				}}
				class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors {selectedCategory === category.id ? 'bg-primary text-black' : 'bg-surface text-secondary hover:text-white'}"
			>
				{category.label}
			</button>
		{/each}
	</div>

	<!-- Template Grid -->
	{#if templatesQuery.isLoading}
		<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
			{#each Array(12) as _}
				<div class="aspect-square bg-surface rounded-xl animate-pulse"></div>
			{/each}
		</div>
	{:else if filteredTemplates().length > 0}
		<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
			{#each filteredTemplates() as template}
				<button
					onclick={() => goto(`/dashboard/subscriptions/new/${template._id}`)}
					class="aspect-square bg-surface hover:bg-surface-elevated rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-colors group"
				>
					<div class="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
						{#if template.website}
							<img
								src={getIconUrl(template.website)}
								alt=""
								class="w-10 h-10 object-contain"
								onerror={(e) => {
									const target = e.target as HTMLImageElement;
									target.style.display = "none";
								}}
							/>
						{/if}
						<span class="text-xl font-bold text-primary">
							{template.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<span class="text-xs text-center text-secondary group-hover:text-white transition-colors line-clamp-2">
						{template.name}
					</span>
				</button>
			{/each}
		</div>
	{:else if searchQuery}
		<div class="text-center py-12">
			<p class="text-secondary mb-4">No services found for "{searchQuery}"</p>
			<button
				onclick={() => goto("/dashboard/subscriptions/new/manual")}
				class="px-6 py-3 bg-surface hover:bg-surface-elevated text-white font-medium rounded-lg transition-colors"
			>
				Add Manually
			</button>
		</div>
	{:else}
		<div class="text-center py-12">
			<p class="text-secondary">No templates available</p>
		</div>
	{/if}

	<!-- Manual Add Option -->
	<div class="border-t border-zinc-800 pt-6">
		<button
			onclick={() => goto("/dashboard/subscriptions/new/manual")}
			class="w-full py-4 bg-surface hover:bg-surface-elevated rounded-xl text-secondary hover:text-white transition-colors flex items-center justify-center gap-2"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
			</svg>
			Add manually
		</button>
	</div>
</div>
