<script lang="ts">
  import { setupConvex, useConvexClient } from "convex-svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import "../app.css";

  const { data, children } = $props();

  // Set up Convex client
  setupConvex(data.convexUrl);

  // Get client reference during initialization (required for context)
  const client = useConvexClient();

  // Get namespace for localStorage keys
  const namespace = data.convexUrl.replace(/[^a-zA-Z0-9]/g, "");

  // Set up auth after mount (when localStorage is available)
  onMount(() => {
    client.setAuth(
      async () => localStorage.getItem(`__convexAuthJWT_${namespace}`),
      () => {} // Auth state change callback
    );
  });
</script>

{@render children()}
