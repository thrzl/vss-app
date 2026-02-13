<script lang="ts">
  import { page } from '$app/state';
  import { locales, localizeHref, setLocale, getLocale } from '$lib/paraglide/runtime';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Select from '$lib/components/ui/select';
  import Separator from '$lib/components/ui/separator/separator.svelte';
  import { buttonVariants } from '$lib/components/ui/button/button.svelte';
  import { Menu, Globe } from '@lucide/svelte';
  import { m } from "$lib/paraglide/messages"

  let { children } = $props();

  // Mobile menu state
  let mobileMenuOpen = $state(false);

  // Navigation links – update as routes are created
  const navLinks = [
    { href: '/', label: m.nav_home() },
    { href: '/calendar', label: m.nav_calendar() },
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
  <title>VSS Time Management</title>
</svelte:head>

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
        <Sheet.Root>
          <Sheet.Trigger class={buttonVariants({variant: "ghost"})}>
              <Menu class="h-5 w-5"/>
          </Sheet.Trigger>
          <Sheet.Content side="left" class="px-4 pt-4">
            <h1 class="font-bold text-lg">Menu</h1>
            <nav class="flex flex-col space-y-4 mt-4">
              {#each navLinks as link}
                <a
                  href={localizeHref(link.href, { locale: getLocale() })}
                  onclick={() => mobileMenuOpen = false}
                  class="text-normal"
                >
                  {link.label}
                </a>
              {/each}
            </nav>
            <Separator class="my-4" />
            <div class="space-y-2">
              <p class="text-sm font-medium">{m.language()}</p>
              <Select.Root
                  type="single"
                value={getLocale()}
                onValueChange={(value) => { setLocale(value); const url = new URL(window.location.href); url.searchParams.set('locale', value); window.location.href = url.toString();}}
              >
                  <Select.Trigger>
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
          </Sheet.Content>
        </Sheet.Root>
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
