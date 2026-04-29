<script lang="ts">
    import { page } from "$app/state";
    import { localizeHref, getLocale } from "$lib/paraglide/runtime";
    import { m } from "$lib/paraglide/messages";
    import {
        fadeIn,
        fadeInScale,
        staggerChildren,
        inViewFade,
        popIn,
        slideIn,
    } from "$lib/motion";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card";
    import {
        CheckCheckIcon,
        CalendarIcon,
        ShieldCheckIcon,
        UsersIcon,
        ArrowRightIcon,
        SparklesIcon,
        BookOpenIcon,
        ClipboardListIcon,
        StarIcon,
    } from "@lucide/svelte";

    let { data } = $props();
    const user = $derived(data.user);
</script>

<svelte:head>
    <title>Fojo — Vocational Support Services</title>
    <meta
        name="description"
        content="Fojo helps PGCC students stay on top of their tasks, workshops, and academic journey — all in one place."
    />
</svelte:head>

<!-- ── Hero ────────────────────────────────────────────────────── -->
<section
    class="relative overflow-hidden -mx-4 -mt-6 px-4 pt-20 pb-24 flex flex-col items-center text-center h-[95vh] justify-center"
>
    <!-- Soft radial glow behind text -->
    <div
        class="pointer-events-none absolute inset-0 -z-10"
        style="background: radial-gradient(ellipse 70% 55% at 50% 10%, oklch(0.55 0.12 240 / 0.13) 0%, transparent 70%);"
    ></div>

    <div use:popIn={{ duration: 0.45, delay: 0.05 }}>
        <span
            class="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-widest mb-6 select-none"
        >
            <SparklesIcon class="size-3" />
            {m.home_badge()}
        </span>
    </div>

    <div use:fadeIn={{ duration: 0.55, delay: 0.1, y: 20 }}>
        <h1
            class="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.08] tracking-tight max-w-3xl mx-auto"
        >
            {m.home_hero_title_top()}<br />
            <span class="text-primary">{m.home_hero_title_highlight()}</span>
        </h1>
    </div>

    <div use:fadeIn={{ duration: 0.5, delay: 0.22, y: 16 }}>
        <p
            class="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
        >
            {m.home_hero_description()}
        </p>
    </div>

    <div
        use:fadeIn={{ duration: 0.45, delay: 0.34, y: 12 }}
        class="mt-10 flex flex-col sm:flex-row items-center gap-3"
    >
        {#if user}
            <Button
                size="lg"
                href={localizeHref("/dashboard", { locale: getLocale() })}
                class="gap-2 px-8"
            >
                {m.home_go_to_dashboard()}
                <ArrowRightIcon class="size-4" />
            </Button>
        {:else}
            <Button
                size="lg"
                href={localizeHref("/login", { locale: getLocale() })}
                class="gap-2 px-8"
            >
                {m.home_get_started()}
                <ArrowRightIcon class="size-4" />
            </Button>
            <Button size="lg" variant="outline" href="#features" class="px-8">
                {m.home_learn_more()}
            </Button>
        {/if}
    </div>

    <!-- Floating stat pills -->
    <div
        use:staggerChildren={{ staggerDelay: 0.08, duration: 0.4, y: 10 }}
        class="mt-14 flex flex-wrap justify-center gap-3"
    >
        {#each [{ icon: CheckCheckIcon, label: m.home_pill_task_tracking(), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" }, { icon: CalendarIcon, label: m.home_pill_due_date_reminders(), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" }, { icon: BookOpenIcon, label: m.home_pill_workshop_access(), color: "text-primary", bg: "bg-primary/10" }, { icon: ShieldCheckIcon, label: m.home_pill_secure_sign_in(), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" }] as pill}
            <span
                class="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm"
            >
                <span
                    class={`inline-flex items-center justify-center rounded-full p-1 ${pill.bg}`}
                >
                    <pill.icon class={`size-3.5 ${pill.color}`} />
                </span>
                {pill.label}
            </span>
        {/each}
    </div>
</section>

<!-- ── About ───────────────────────────────────────────────────── -->
<section class="relative py-20">
    <div
        class="pointer-events-none absolute inset-0 -z-10"
        style="background: radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.82 0.1 160 / 0.18) 0%, transparent 65%);"
    ></div>
    <div
        use:inViewFade={{ duration: 0.5, y: 20 }}
        class="mx-auto max-w-3xl text-center"
    >
        <p class="text-xs font-semibold text-primary uppercase tracking-widest">
            {m.home_about_eyebrow()}
        </p>
        <h2 class="mt-3 text-3xl sm:text-4xl font-bold">
            {m.home_about_title()}
        </h2>
        <p class="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {m.home_about_body()}
        </p>
    </div>
</section>

<!-- ── Divider ───────────────────────────────────────────────────── -->
<div class="border-t -mx-4 my-0"></div>

<!-- ── Features ─────────────────────────────────────────────────── -->
<section id="features" class="py-20">
    <div use:inViewFade={{ duration: 0.5, y: 20 }} class="text-center mb-14">
        <p
            class="text-xs font-semibold text-primary uppercase tracking-widest mb-2"
        >
            {m.home_features_eyebrow()}
        </p>
        <h2 class="text-3xl sm:text-4xl font-bold">
            {m.home_features_title()}
        </h2>
        <p class="mt-3 text-muted-foreground max-w-lg mx-auto">
            {m.home_features_subtitle()}
        </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each [{ icon: ClipboardListIcon, color: "text-primary", bg: "bg-primary/10", title: m.home_feature_task_management_title(), body: m.home_feature_task_management_body() }, { icon: CalendarIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", title: m.home_feature_calendar_title(), body: m.home_feature_calendar_body() }, { icon: BookOpenIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", title: m.home_feature_workshops_title(), body: m.home_feature_workshops_body() }, { icon: ShieldCheckIcon, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", title: m.home_feature_secure_title(), body: m.home_feature_secure_body() }, { icon: UsersIcon, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", title: m.home_feature_pgcc_title(), body: m.home_feature_pgcc_body() }, { icon: StarIcon, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", title: m.home_feature_improving_title(), body: m.home_feature_improving_body() }] as feature, i}
            <div use:inViewFade={{ duration: 0.45, y: 18 }}>
                <Card.Root
                    class="h-full shadow-none hover:shadow-md transition-shadow duration-200 group"
                >
                    <Card.Header class="pb-2">
                        <div
                            class={`inline-flex items-center justify-center rounded-xl p-2.5 w-max ${feature.bg} mb-1 group-hover:scale-110 transition-transform duration-200`}
                        >
                            <feature.icon class={`size-5 ${feature.color}`} />
                        </div>
                        <Card.Title class="text-base"
                            >{feature.title}</Card.Title
                        >
                    </Card.Header>
                    <Card.Content>
                        <p
                            class="text-sm text-muted-foreground leading-relaxed"
                        >
                            {feature.body}
                        </p>
                    </Card.Content>
                </Card.Root>
            </div>
        {/each}
    </div>
</section>

<!-- ── Divider ───────────────────────────────────────────────────── -->
<div class="border-t -mx-4"></div>

<!-- ── How it works ──────────────────────────────────────────────── -->
<section class="py-20">
    <div use:inViewFade={{ duration: 0.5, y: 20 }} class="text-center mb-14">
        <p
            class="text-xs font-semibold text-primary uppercase tracking-widest mb-2"
        >
            {m.home_how_eyebrow()}
        </p>
        <h2 class="text-3xl sm:text-4xl font-bold">
            {m.home_how_title()}
        </h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
        {#each [{ step: "1", title: m.home_how_step1_title(), body: m.home_how_step1_body() }, { step: "2", title: m.home_how_step2_title(), body: m.home_how_step2_body() }, { step: "3", title: m.home_how_step3_title(), body: m.home_how_step3_body() }] as item}
            <div
                use:inViewFade={{ duration: 0.45, y: 16 }}
                class="flex flex-col items-center text-center gap-3"
            >
                <div
                    class="flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md select-none"
                >
                    {item.step}
                </div>
                <h3 class="font-semibold text-base">{item.title}</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                </p>
            </div>
        {/each}
    </div>
</section>

<!-- ── Divider ───────────────────────────────────────────────────── -->
<div class="border-t -mx-4"></div>

<!-- ── CTA banner ────────────────────────────────────────────────── -->
<section class="py-20">
    <div use:inViewFade={{ duration: 0.55, y: 24 }}>
        <Card.Root
            class="shadow-none border-primary/20 bg-primary/5 overflow-hidden relative"
        >
            <!-- Decorative glow -->
            <div
                class="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full opacity-20"
                style="background: radial-gradient(circle, oklch(0.55 0.12 240) 0%, transparent 70%);"
            ></div>
            <Card.Content
                class="px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left"
            >
                <div class="space-y-2 max-w-lg">
                    <h2 class="text-2xl sm:text-3xl font-bold">
                        {m.home_cta_title()}
                    </h2>
                    <p class="text-muted-foreground leading-relaxed">
                        {m.home_cta_body()}
                    </p>
                </div>
                <div class="flex-shrink-0">
                    {#if user}
                        <Button
                            size="lg"
                            href={localizeHref("/dashboard", {
                                locale: getLocale(),
                            })}
                            class="gap-2 px-8"
                        >
                            {m.home_cta_dashboard()}
                            <ArrowRightIcon class="size-4" />
                        </Button>
                    {:else}
                        <Button
                            size="lg"
                            href={localizeHref("/login", {
                                locale: getLocale(),
                            })}
                            class="gap-2 px-8"
                        >
                            {m.home_cta_sign_in()}
                            <ArrowRightIcon class="size-4" />
                        </Button>
                    {/if}
                </div>
            </Card.Content>
        </Card.Root>
    </div>
</section>
