<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Dropdown from "$lib/components/ui/dropdown-menu/index.js";
    import { m } from "$lib/paraglide/messages";
    import { Label } from "$lib/components/ui/label";
    import { buttonVariants } from "$lib/components/ui/button/button.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Menu, Globe, SunMoonIcon, LogOutIcon } from "@lucide/svelte";
    import * as Select from "$lib/components/ui/select";
    import {
        userPrefersMode,
        setMode,
        toggleMode,
        ModeWatcher,
    } from "mode-watcher";
    import {
        locales,
        localizeHref,
        setLocale,
        getLocale,
    } from "$lib/paraglide/runtime";
    import { cn } from "$lib/utils";
    import SparkMD5 from "spark-md5";
    import { page } from "$app/state";

    const pathname = $derived(page.url.pathname);
    function isActive(href: string) {
        if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
        return pathname.startsWith(href);
    }

    const navLinks = [
        { href: "/dashboard", label: m.nav_home() },
        { href: "/workshops", label: m.nav_workshops() },
        // { href: '/todo', label: m.nav_todo() },
        { href: "/settings", label: m.nav_settings() },
        // add admin later if needed: { href: '/admin', label: 'Admin' }
    ];
    const themeLabels = $derived({
        light: m.theme_light(),
        dark: m.theme_dark(),
        system: m.theme_system(),
    });
    const langMap: Record<string, string> = {
        en: "english",
        fr: "français",
    };

    // Read user directly from server-provided page data
    const user = $derived(page.data.user);

    const avatarHash = $derived(
        user?.email ? SparkMD5.hash(user.email) : null,
    );
</script>

<div class="flex flex-row flex-wrap items-center gap-12">
    <Dropdown.Root>
        <Dropdown.Trigger class="cursor-pointer">
            <Avatar.Root class="border border-solid bg-secondary">
                {#if avatarHash}
                    <Avatar.Image
                        src={`https://gravatar.com/avatar/${avatarHash}`}
                        alt={user?.name || user?.email.split("@")[0]}
                    />
                {/if}
                <Avatar.Fallback>{user?.name?.slice(0, 2).toUpperCase() ?? "??"}</Avatar.Fallback>
            </Avatar.Root>
        </Dropdown.Trigger>
        <Dropdown.Content class={cn("pb-4 pt-2 px-2")}>
            <Dropdown.Label class="font-bold font-grotesk">{m.menu()}</Dropdown.Label>
            {#if user?.email}
                <Dropdown.Label
                    class="font-normal text-muted-foreground text-xs truncate max-w-48"
                >
                    {user.email}
                </Dropdown.Label>
            {/if}
            <Dropdown.Group>
                {#each navLinks as link}
                    <a
                        href={localizeHref(link.href, {
                            locale: getLocale(),
                        })}
                        class="text-normal cursor-pointer!"
                        aria-current={isActive(link.href) ? 'page' : undefined}
                    >
                        <Dropdown.Item class={isActive(link.href) ? 'text-primary font-semibold' : ''}>
                            {link.label}
                        </Dropdown.Item>
                    </a>
                {/each}
            </Dropdown.Group>
            <Dropdown.Separator class="my-2" />
            <div class="space-y-2 px-2">
                <Label class="text-sm font-medium font-grotesk" for="language"
                    >{m.language()}</Label
                >
                <Select.Root
                    type="single"
                    value={getLocale()}
                    onValueChange={(value) => {
                        setLocale(value as "en" | "fr");
                        const url = new URL(window.location.href);
                        url.searchParams.set("locale", value);
                        window.location.href = url.toString();
                    }}
                >
                    <Select.Trigger class="w-full text-left">
                        <Globe />
                        {langMap[getLocale()]}
                    </Select.Trigger>
                    <Select.Content>
                        {#each locales as locale}
                            <Select.Item value={locale} label={langMap[locale]}>
                                {langMap[locale]}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
                <Label class="text-sm font-medium font-grotesk" for="mode"
                    >{m.mode_switcher()}</Label
                >
                <Select.Root
                    type="single"
                    value={userPrefersMode.current}
                    onValueChange={(value) => {
                        setMode(value as "light" | "dark" | "system");
                    }}
                >
                    <Select.Trigger class="w-full text-left">
                        <span class="flex flex-row items-center gap-x-2">
                            <SunMoonIcon />
                            {themeLabels[
                                userPrefersMode.current
                            ]}</span
                        >
                    </Select.Trigger>
                    <Select.Content>
                        {#each ["light", "dark", "system"] as mode}
                            <Select.Item value={mode} label={mode}>
                                {themeLabels[mode as "light" | "dark" | "system"]}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
            {#if user}
                <Dropdown.Separator class="my-2" />
                <Dropdown.Group>
                    <form method="POST" action="/auth/logout">
                        <Dropdown.Item
                            class="text-destructive focus:text-destructive cursor-pointer"
                            onclick={(e) => {
                                e.currentTarget.closest("form")?.requestSubmit();
                            }}
                        >
                            <LogOutIcon class="mr-2 h-4 w-4" />
                            {m.sign_out()}
                        </Dropdown.Item>
                    </form>
                </Dropdown.Group>
            {/if}
        </Dropdown.Content>
    </Dropdown.Root>
</div>
