<script lang="ts">
  import { page } from '$app/state';
  import { localizeHref, setLocale, getLocale } from '$lib/paraglide/runtime';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import '@fontsource-variable/space-grotesk';

  import { m } from "$lib/paraglide/messages"
  import { ModeWatcher } from 'mode-watcher';
  import NavUserIcon from '$lib/components/NavUserIcon.svelte';
  import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
  import { fadeIn, staggerChildren } from '$lib/motion';

  let { children } = $props();

  const pathname = $derived(page.url.pathname);
  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  }

  // Navigation links – update as routes are created
  const navLinks = [
    { href: '/dashboard', label: m.nav_home() },
    { href: '/tasks', label: m.nav_tasks() },
    { href: '/workshops', label: m.nav_workshops() },
    // { href: '/todo', label: m.nav_todo() },
    { href: '/settings', label: m.nav_settings() }
 // add admin later if needed: { href: '/admin', label: 'Admin' }
  ];


    const params = page.url.searchParams;
    // @ts-ignore
    setLocale(params.get('locale') || 'en');


</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>fojo</title>
</svelte:head>
<ModeWatcher/>
<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="border-b" use:fadeIn={{ duration: 0.5, y: -12 }}>
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo -->
      <a href={localizeHref('/', { locale: getLocale() })} class="font-bold text-xl">
          fojo
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-4" use:staggerChildren={{ staggerDelay: 0.05, duration: 0.35, y: -8 }}>
        {#each navLinks as link}
          <a
            href={localizeHref(link.href, { locale: getLocale() })}
            class="text-sm font-medium hover:underline underline-offset-4 {isActive(link.href) ? 'text-primary underline' : 'text-muted-foreground'}"
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <!-- Right side: Language + Mobile Menu -->
      <div class="flex items-center space-x-2">

        <!-- Mobile menu button -->
        <NavUserIcon />
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6" use:fadeIn={{ duration: 0.5, delay: 0.1, y: 16 }}>
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="border-t py-6 mb-14 md:mb-0" use:fadeIn={{ duration: 0.5, delay: 0.2, y: 12 }}>
    <div class="container mx-auto px-4 text-center text-sm text-muted-foreground">
      <p>{m.footer_copyright({ year: new Date().getFullYear().toString() })}</p>
      <p class="mt-1">
        <a href="mailto:vss@pgcc.edu" class="hover:underline">vss@pgcc.edu</a> | (301) 546-0263
      </p>
    </div>
  </footer>

  <MobileBottomNav />
</div>

<style>
    :global(h1, h2, h3, h4, h5, h6, nav, .font-grotesk) {
        font-family: "Space Grotesk Variable", sans-serif
    }
</style>
