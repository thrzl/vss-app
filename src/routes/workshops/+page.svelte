<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { localizeHref, getLocale } from "$lib/paraglide/runtime";
    import * as Card from "$lib/components/ui/card";
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        fadeIn,
        fadeInScale,
        staggerChildren,
        inViewFade,
    } from "$lib/motion";
    import {
        CalendarIcon,
        ClockIcon,
        MapPinIcon,
        UsersIcon,
        ArrowRightIcon,
        BookOpenIcon,
        SparklesIcon,
    } from "@lucide/svelte";

    let { data } = $props();
    const user = $derived(data.user);

    interface Workshop {
        id: string;
        title: string;
        description: string;
        date: string;
        time: string;
        location: string;
        spotsLeft: number;
        totalSpots: number;
        image: string;
        category: string;
        categoryColor: string;
        categoryBg: string;
    }

    const workshops: Workshop[] = [
        {
            id: "resume-writing",
            title: m.workshop_resume_title(),
            description: m.workshop_resume_description(),
            date: "2025-02-14",
            time: "10:00 AM – 12:00 PM",
            location: "Bladen Hall, Room 204",
            spotsLeft: 8,
            totalSpots: 20,
            image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_career(),
            categoryColor: "text-emerald-600 dark:text-emerald-400",
            categoryBg: "bg-emerald-500/10",
        },
        {
            id: "interview-skills",
            title: m.workshop_interview_title(),
            description: m.workshop_interview_description(),
            date: "2025-02-21",
            time: "1:00 PM – 3:00 PM",
            location: "Center for Advanced Technology, Room 101",
            spotsLeft: 12,
            totalSpots: 25,
            image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_career(),
            categoryColor: "text-emerald-600 dark:text-emerald-400",
            categoryBg: "bg-emerald-500/10",
        },
        {
            id: "study-strategies",
            title: m.workshop_study_title(),
            description: m.workshop_study_description(),
            date: "2025-02-28",
            time: "11:00 AM – 12:30 PM",
            location: "Accokeek Hall, Room 315",
            spotsLeft: 15,
            totalSpots: 30,
            image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_academic(),
            categoryColor: "text-primary",
            categoryBg: "bg-primary/10",
        },
        {
            id: "financial-literacy",
            title: m.workshop_financial_title(),
            description: m.workshop_financial_description(),
            date: "2025-03-07",
            time: "2:00 PM – 4:00 PM",
            location: "Marlboro Hall, Room 2060",
            spotsLeft: 20,
            totalSpots: 25,
            image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_life_skills(),
            categoryColor: "text-amber-600 dark:text-amber-400",
            categoryBg: "bg-amber-500/10",
        },
        {
            id: "self-advocacy",
            title: m.workshop_advocacy_title(),
            description: m.workshop_advocacy_description(),
            date: "2025-03-14",
            time: "10:00 AM – 11:30 AM",
            location: "Bladen Hall, Room 110",
            spotsLeft: 5,
            totalSpots: 15,
            image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_life_skills(),
            categoryColor: "text-amber-600 dark:text-amber-400",
            categoryBg: "bg-amber-500/10",
        },
        {
            id: "computer-basics",
            title: m.workshop_computer_title(),
            description: m.workshop_computer_description(),
            date: "2025-03-21",
            time: "9:00 AM – 11:00 AM",
            location: "Center for Advanced Technology, Room 205",
            spotsLeft: 18,
            totalSpots: 20,
            image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop&q=80",
            category: m.workshop_category_technology(),
            categoryColor: "text-violet-600 dark:text-violet-400",
            categoryBg: "bg-violet-500/10",
        },
    ];

    function formatWorkshopDate(dateStr: string): string {
        const d = new Date(dateStr + "T12:00:00");
        return d.toLocaleDateString(getLocale(), {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }

    function spotsClass(spotsLeft: number): string {
        if (spotsLeft <= 5) return "text-destructive";
        if (spotsLeft <= 10) return "text-amber-600 dark:text-amber-400";
        return "text-emerald-600 dark:text-emerald-400";
    }
</script>

<svelte:head>
    <title>{m.workshops_page_title()} — fojo</title>
    <meta name="description" content={m.workshops_page_meta()} />
</svelte:head>

<div class="max-w-5xl mx-auto space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div use:fadeIn={{ duration: 0.5, y: 14 }}>
            <p class="text-sm text-muted-foreground mb-0.5">
                {m.workshops_subtitle()}
            </p>
            <h1 class="text-3xl font-bold leading-tight">
                {m.workshops_page_title()}
            </h1>
        </div>
    </div>

    <!-- Category filter pills -->
    <div
        use:staggerChildren={{ staggerDelay: 0.06, duration: 0.35, y: 8 }}
        class="flex flex-wrap gap-2"
    >
        {#each [{ label: m.workshop_filter_all(), icon: SparklesIcon, color: "text-foreground", bg: "bg-muted" }, { label: m.workshop_category_career(), icon: BookOpenIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" }, { label: m.workshop_category_academic(), icon: BookOpenIcon, color: "text-primary", bg: "bg-primary/10" }, { label: m.workshop_category_life_skills(), icon: UsersIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" }, { label: m.workshop_category_technology(), icon: BookOpenIcon, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" }] as pill}
            <span
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-default select-none hover:shadow-sm transition-shadow"
            >
                <pill.icon class={`size-3 ${pill.color}`} />
                {pill.label}
            </span>
        {/each}
    </div>

    <!-- Workshop cards grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each workshops as workshop, i}
            <div use:inViewFade={{ duration: 0.45, y: 18 }}>
                <Card.Root
                    class="h-full shadow-none hover:shadow-md transition-shadow duration-200 overflow-hidden group"
                >
                    <!-- Workshop image -->
                    <div class="relative overflow-hidden">
                        <img
                            src={workshop.image}
                            alt={workshop.title}
                            class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                        />
                        <span
                            class={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm border border-white/20 bg-background/80 ${workshop.categoryColor}`}
                        >
                            {workshop.category}
                        </span>
                    </div>

                    <Card.Header class="pb-2">
                        <Card.Title class="text-lg leading-snug">
                            {workshop.title}
                        </Card.Title>
                    </Card.Header>

                    <Card.Content class="space-y-3">
                        <p class="text-sm text-muted-foreground leading-relaxed">
                            {workshop.description}
                        </p>

                        <div class="space-y-1.5 text-sm">
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <CalendarIcon class="size-3.5 shrink-0" />
                                <span>{formatWorkshopDate(workshop.date)}</span>
                            </div>
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <ClockIcon class="size-3.5 shrink-0" />
                                <span>{workshop.time}</span>
                            </div>
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <MapPinIcon class="size-3.5 shrink-0" />
                                <span>{workshop.location}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <UsersIcon class="size-3.5 shrink-0 text-muted-foreground" />
                                <span class={spotsClass(workshop.spotsLeft)}>
                                    {m.workshop_spots_left({
                                        spots: workshop.spotsLeft.toString(),
                                        total: workshop.totalSpots.toString(),
                                    })}
                                </span>
                            </div>
                        </div>
                    </Card.Content>

                    <Card.Footer class="pt-0">
                        <Button
                            href="https://example.com/register/{workshop.id}"
                            class="w-full gap-2"
                        >
                            {m.workshop_register()}
                            <ArrowRightIcon class="size-4" />
                        </Button>
                    </Card.Footer>
                </Card.Root>
            </div>
        {/each}
    </div>

    <!-- Info banner -->
    <div use:inViewFade={{ duration: 0.5, y: 20 }}>
        <Card.Root class="shadow-none border-primary/20 bg-primary/5">
            <Card.Content class="px-6 py-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div class="inline-flex items-center justify-center rounded-xl p-3 bg-primary/10 shrink-0">
                    <BookOpenIcon class="size-6 text-primary" />
                </div>
                <div class="space-y-1">
                    <p class="font-semibold text-sm">
                        {m.workshop_info_title()}
                    </p>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                        {m.workshop_info_body()}
                    </p>
                </div>
            </Card.Content>
        </Card.Root>
    </div>
</div>
