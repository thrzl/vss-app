<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Dropdown from "$lib/components/ui/dropdown-menu/index.js";
    import { m } from "$lib/paraglide/messages";
    import { Label } from "$lib/components/ui/label";
    import { buttonVariants } from "$lib/components/ui/button/button.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Menu, Globe, SunMoonIcon } from "@lucide/svelte";
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
    const navLinks = [
        { href: "/", label: m.nav_home() },
        { href: "/workshops", label: m.nav_workshops() },
        // { href: '/todo', label: m.nav_todo() },
        { href: "/settings", label: m.nav_settings() },
        // add admin later if needed: { href: '/admin', label: 'Admin' }
    ];
    const themeLabels = {
        en: {
            light: "light",
            dark: "dark",
            system: "system",
        },
        fr: {
            light: "clair",
            dark: "sombre",
            system: "système",
        },
    };
    const langMap = {
        en: "english",
        fr: "français",
    };
</script>

<div class="flex flex-row flex-wrap items-center gap-12">
    <Dropdown.Root>
        <Dropdown.Trigger class="cursor-pointer">
            <Avatar.Root class="border border-solid bg-secondary">
                <Avatar.Image src="https://github.com/thrzl.png" alt="@thrzl" />
                <Avatar.Fallback>TB</Avatar.Fallback>
            </Avatar.Root>
        </Dropdown.Trigger>
        <Dropdown.Content class={cn("pb-4 pt-2 px-2")}>
            <Dropdown.Label class="font-bold font-grotesk">Menu</Dropdown.Label>
            <Dropdown.Group>
                {#each navLinks as link}
                    <a
                        href={localizeHref(link.href, {
                            locale: getLocale(),
                        })}
                        class="text-normal cursor-pointer!"
                    >
                        <Dropdown.Item>
                            {link.label}
                        </Dropdown.Item>
                    </a>
                {/each}
            </Dropdown.Group>
            <Dropdown.Separator class="my-4" />
            <div class="space-y-2 px-2">
                <Label class="text-sm font-medium font-grotesk" for="language"
                    >{m.language()}</Label
                >
                <Select.Root
                    type="single"
                    value={getLocale()}
                    onValueChange={(value) => {
                        setLocale(value);
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
                    id="mode"
                    value={userPrefersMode.current}
                    onValueChange={(value) => {
                        console.log(value);
                        setMode(value);
                    }}
                >
                    <Select.Trigger class="w-full text-left">
                        <span class="flex flex-row items-center gap-x-2">
                            <SunMoonIcon />
                            {themeLabels[getLocale()][
                                userPrefersMode.current
                            ]}</span
                        >
                    </Select.Trigger>
                    <Select.Content>
                        {#each ["light", "dark", "system"] as mode}
                            <Select.Item value={mode} label={mode}>
                                {themeLabels[getLocale()][mode]}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
        </Dropdown.Content>
    </Dropdown.Root>
</div>
