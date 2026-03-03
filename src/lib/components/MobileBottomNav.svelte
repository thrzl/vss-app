<script lang="ts">
    import { page } from "$app/state";
    import { localizeHref, getLocale } from "$lib/paraglide/runtime";
    import { m } from "$lib/paraglide/messages";
    import {
        HomeIcon,
        ListTodoIcon,
        BookOpenIcon,
        SettingsIcon,
    } from "@lucide/svelte";

    const pathname = $derived(page.url.pathname);

    function isActive(href: string) {
        if (href === "/dashboard")
            return pathname === "/dashboard" || pathname === "/";
        return pathname.startsWith(href);
    }

    const tabs = [
        { href: "/dashboard", label: m.nav_home(), icon: HomeIcon },
        { href: "/tasks", label: m.nav_tasks(), icon: ListTodoIcon },
        { href: "/workshops", label: m.nav_workshops(), icon: BookOpenIcon },
        { href: "/settings", label: m.nav_settings(), icon: SettingsIcon },
    ];
</script>

<nav
    class="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80 safe-bottom"
    aria-label="Mobile navigation"
>
    <div class="flex items-center justify-around h-14 px-1">
        {#each tabs as tab}
            {@const active = isActive(tab.href)}
            <a
                href={localizeHref(tab.href, { locale: getLocale() })}
                class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors select-none
                    {active
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'}"
                aria-current={active ? "page" : undefined}
            >
                <tab.icon
                    class="size-5 {active ? 'text-primary' : ''}"
                    strokeWidth={active ? 2.5 : 2}
                />
                <span class="truncate max-w-[4.5rem]">{tab.label}</span>
            </a>
        {/each}
    </div>
</nav>

<style>
    .safe-bottom {
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }
</style>
