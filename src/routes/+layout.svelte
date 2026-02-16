<script lang="ts">
  import { page } from '$app/state';
  import { locales, localizeHref, setLocale, getLocale } from '$lib/paraglide/runtime';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import '@fontsource-variable/space-grotesk';
  import * as Select from '$lib/components/ui/select';
  import { Globe } from '@lucide/svelte';
  import { m } from "$lib/paraglide/messages"
  import { ModeWatcher } from 'mode-watcher';
  import NavUserIcon from '$lib/components/NavUserIcon.svelte';

  let { children } = $props();

  // Navigation links – update as routes are created
  const navLinks = [
    { href: '/', label: m.nav_home() },
    { href: '/workshops', label: m.nav_workshops() },
    // { href: '/todo', label: m.nav_todo() },
    { href: '/settings', label: m.nav_settings() }
 // add admin later if needed: { href: '/admin', label: 'Admin' }
  ];


    const params = page.url.searchParams;
    // @ts-ignore
    setLocale(params.get('locale') || 'en');

    const langMap = {
      en: "english",
      fr: "français"
    }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>fojo</title>
</svelte:head>
<ModeWatcher/>
<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="border-b">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo -->
      <a href={localizeHref('/', { locale: getLocale() })} class="font-bold text-xl">
          fojo
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-4">
        {#each navLinks as link}
          <a
            href={localizeHref(link.href, { locale: getLocale() })}
            class="text-sm font-medium hover:underline"
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
  <main class="flex-1 container mx-auto px-4 py-6">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="border-t py-6">
    <div class="container mx-auto px-4 text-center text-sm text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} Prince George's Community College - Vocational Support Services</p>
      <p class="mt-1">
        <a href="mailto:vss@pgcc.edu" class="hover:underline">vss@pgcc.edu</a> | (301) 546-0263
      </p>
      <div class="mx-auto w-max mt-1">
      <Select.Root
          type="single"
        value={getLocale()}
        onValueChange={(value) => { setLocale(value); const url = new URL(window.location.href); url.searchParams.set('locale', value); window.location.href = url.toString();}}
      >
          <Select.Trigger class="border-none! shadow-none">
              <Globe /> {langMap[getLocale()]}
          </Select.Trigger>
          <Select.Content>
        {#each locales as locale}
          <Select.Item value={locale} label={langMap[locale]}>
            {langMap[locale]}
          </Select.Item>
        {/each}
          </Select.Content>
      </Select.Root>
      </div>
    </div>
  </footer>
</div>

<style>
    :global(h1, h2, h3, h4, h5, h6, nav, .font-grotesk) {
        font-family: "Space Grotesk Variable", sans-serif
    }
</style>
