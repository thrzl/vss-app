<script lang="ts">
  import { page } from "$app/state";
  import {
    locales,
    localizeHref,
    setLocale,
    getLocale,
  } from "$lib/paraglide/runtime";
  import "../layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import "@fontsource-variable/space-grotesk";
  import { ModeWatcher } from "mode-watcher";
  import { fadeIn } from "$lib/motion";
  import { m } from "$lib/paraglide/messages";

  let { children } = $props();

  const params = page.url.searchParams;
  // @ts-ignore
  setLocale(params.get("locale") || "en");
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>fojo — sign in</title>
</svelte:head>
<ModeWatcher />

<div class="min-h-screen flex flex-col">
  <!-- Minimal header: just the logo -->
  <!-- <header class="border-b" use:fadeIn={{ duration: 0.5, y: -12 }}>
    <div class="container mx-auto px-4 py-3 flex items-center justify-center">
      <a href={localizeHref('/', { locale: getLocale() })} class="font-bold text-xl">
        fojo
      </a>
    </div>
  </header> -->

  <!-- Centered content -->
  <main
    class="flex-1 flex items-center justify-center px-4 py-12"
    use:fadeIn={{ duration: 0.5, delay: 0.1, y: 16 }}
  >
    {@render children()}
  </main>

  <!-- Minimal footer
  <footer class="border-t py-4" use:fadeIn={{ duration: 0.5, delay: 0.2, y: 12 }}>
    <div class="container mx-auto px-4 text-center text-xs text-muted-foreground">
      <p>{m.footer_copyright({ year: new Date().getFullYear().toString() })}</p>
    </div>
  </footer> -->
</div>

<style>
  :global(h1, h2, h3, h4, h5, h6, nav, .font-grotesk) {
    font-family: "Space Grotesk Variable", sans-serif;
  }
</style>
