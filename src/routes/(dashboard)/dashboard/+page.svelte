<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "$convex/_generated/api";

	const userQuery = useQuery(api.auth.loggedInUser, {});
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold text-white">
			Welcome{#if userQuery.data?.name}, {userQuery.data.name}{/if}!
		</h1>
		<p class="mt-2 text-secondary">
			Track and manage your subscriptions in one place.
		</p>
	</div>

	<!-- Quick stats placeholder -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
			<div class="text-sm text-secondary">Total Monthly</div>
			<div class="mt-2 text-2xl font-bold text-white">$0.00</div>
		</div>

		<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
			<div class="text-sm text-secondary">Active Subscriptions</div>
			<div class="mt-2 text-2xl font-bold text-white">0</div>
		</div>

		<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
			<div class="text-sm text-secondary">Next Payment</div>
			<div class="mt-2 text-2xl font-bold text-white">--</div>
		</div>
	</div>

	<!-- Recent activity placeholder -->
	<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
		<h2 class="text-lg font-semibold text-white mb-4">Recent Activity</h2>
		<p class="text-secondary text-sm">No recent activity to show.</p>
	</div>
</div>
