<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import type { Task } from "$lib/schema";
    import { Calendar, Day } from "$lib/components/ui/calendar";
    import ConfirmDelete from "$lib/components/ConfirmDelete.svelte";
    import * as Empty from "$lib/components/ui/empty";
    import * as Item from "$lib/components/ui/item";
    import * as Card from "$lib/components/ui/card";
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        ArrowRightIcon,
        CalendarIcon,
        CheckCheckIcon,
        CircleAlertIcon,
        ClipboardListIcon,
        ListTodoIcon,
        PlusIcon,
        TrophyIcon,
    } from "@lucide/svelte";
    import {
        fadeIn,
        fadeInScale,
        popIn,
        slideIn,
        staggerChildren,
    } from "$lib/motion";
    import { getLocale } from "$lib/paraglide/runtime";
    import {
        isWeekend,
        getLocalTimeZone,
        today,
        type CalendarDate,
    } from "@internationalized/date";
    import { enhance } from "$app/forms";
    import type { PageProps } from "./$types";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { ChevronDownIcon, Trash2Icon } from "@lucide/svelte";

    let { data }: PageProps = $props();

    // Cast to access the new fields returned by +page.server.ts until
    // .svelte-kit regenerates the PageData types.
    type HomeData = typeof data & {
        todayTasks: Task[];
        overdueTasks: Task[];
        stats: { total: number; dueToday: number; overdue: number; completed: number };
        todayString: string;
    };
    const homeData = data as HomeData;

    let tasks = $state<Task[]>(homeData.tasks);
    let todayTasks = $state<Task[]>(homeData.todayTasks ?? []);
    let overdueTasks = $state<Task[]>(homeData.overdueTasks ?? []);
    let stats = $state(homeData.stats ?? { total: 0, dueToday: 0, overdue: 0, completed: 0 });
    let todayString = $state(homeData.todayString ?? new Date().toISOString().split("T")[0]);

    $effect(() => {
        tasks = homeData.tasks;
        todayTasks = homeData.todayTasks ?? [];
        overdueTasks = homeData.overdueTasks ?? [];
        stats = homeData.stats ?? { total: 0, dueToday: 0, overdue: 0, completed: 0 };
        todayString = homeData.todayString ?? new Date().toISOString().split("T")[0];
    });

    let taskDates = $derived(new Set(tasks.map((t) => t.dueAt?.split("T")[0]).filter(Boolean)));

    let isCreateDialogOpen = $state(false);
    let isDatePickerOpen = $state(false);
    let newTaskTitle = $state("");
    let newTaskDate = $state<CalendarDate>(today(getLocalTimeZone()));

    // ── delete confirmation ─────────────────────────────────────────────────
    let confirmDeleteOpen = $state(false);
    let pendingDeleteId = $state<number | null>(null);
    let deleteFormRef = $state<HTMLFormElement | null>(null);

    function requestDelete(id: number) {
        pendingDeleteId = id;
        confirmDeleteOpen = true;
    }

    function executeDelete() {
        if (pendingDeleteId !== null) {
            tasks = tasks.filter((t) => t.id !== pendingDeleteId);
            overdueTasks = overdueTasks.filter((t) => t.id !== pendingDeleteId);
            const wasOverdue = overdueTasks.some((t) => t.id === pendingDeleteId);
            stats = { ...stats, total: stats.total - 1, overdue: wasOverdue ? stats.overdue - 1 : stats.overdue };
            deleteFormRef?.requestSubmit();
        }
        pendingDeleteId = null;
    }

    function handleKeydown(e: KeyboardEvent) {
        // Don't trigger when typing in an input/textarea or when a dialog is open
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (isCreateDialogOpen) return;

        if (e.key === "n" || e.key === "N") {
            e.preventDefault();
            isCreateDialogOpen = true;
        }
    }

    const now = new Date();
    const greeting = (() => {
        const h = now.getHours();
        if (h < 12) return m.good_morning();
        if (h < 17) return m.good_afternoon();
        return m.good_evening();
    })();

    const longDate = now.toLocaleDateString(getLocale() === "fr" ? "fr-FR" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    function formatDue(dueAt: string | null) {
        if (!dueAt) return null;
        const d = new Date(dueAt);
        return d.toLocaleDateString(getLocale() === "fr" ? "fr-FR" : "en-US", {
            month: "short",
            day: "numeric",
        });
    }

    const upcomingTasks = $derived(
        tasks
            .filter((t) => (t.status ?? 0) === 0 && (!t.dueAt || t.dueAt.split("T")[0] > todayString))
            .slice(0, 5)
    );

    const statCards = $derived([
        {
            label: m.stat_active_tasks(),
            value: stats.total,
            icon: ClipboardListIcon,
            color: "text-primary",
            bg: "bg-primary/10",
        },
        {
            label: m.stat_due_today(),
            value: stats.dueToday,
            icon: CalendarIcon,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-500/10",
        },
        {
            label: m.stat_overdue(),
            value: stats.overdue,
            icon: CircleAlertIcon,
            color: stats.overdue > 0 ? "text-destructive" : "text-muted-foreground",
            bg: stats.overdue > 0 ? "bg-destructive/10" : "bg-muted",
        },
        {
            label: m.stat_completed(),
            value: stats.completed,
            icon: TrophyIcon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-500/10",
        },
    ]);
</script>

<svelte:head>
    <title>Dashboard — fojo</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- Hidden form for confirmed deletes -->
<form
    bind:this={deleteFormRef}
    method="POST"
    action="/tasks?/delete"
    use:enhance={() => {
        return async ({ update }) => { await update({ reset: false }); };
    }}
    class="hidden"
>
    <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDelete
    bind:open={confirmDeleteOpen}
    onconfirm={executeDelete}
/>

<div class="max-w-5xl mx-auto space-y-8">

    <!-- Greeting row -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div use:fadeIn={{ duration: 0.5, y: 14 }}>
            <p class="text-sm text-muted-foreground mb-0.5">{longDate}</p>
            <h1 class="text-3xl font-bold leading-tight">
                {greeting}, {homeData.user?.name?.split(" ")[0] ?? m.fallback_name()} 👋
            </h1>
        </div>
        <div use:fadeIn={{ duration: 0.45, delay: 0.1, y: 10 }}>
            <Button onclick={() => (isCreateDialogOpen = true)}>
                <PlusIcon class="mr-1.5 size-4" />
                {m.new_task()}
                <kbd class="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:inline-flex">N</kbd>
            </Button>
        </div>
    </div>

    <!-- Stat cards -->
    <div
        class="grid grid-cols-2 sm:grid-cols-4 gap-3"
        use:staggerChildren={{ staggerDelay: 0.07, duration: 0.4, y: 14 }}
    >
        {#each statCards as card}
            <Card.Root class="py-4 gap-3 shadow-none">
                <Card.Header class="px-4 pb-0 pt-0 flex-row items-center justify-between space-y-0">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {card.label}
                    </span>
                    <span class={`inline-flex items-center justify-center rounded-lg p-1.5 ${card.bg}`}>
                        <card.icon class={`size-4 ${card.color}`} />
                    </span>
                </Card.Header>
                <Card.Content class="px-4 pt-0 pb-0">
                    <p class={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </Card.Content>
            </Card.Root>
        {/each}
    </div>

    <!-- Main grid: task lists + calendar -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: task lists (takes 2/3) -->
        <div class="lg:col-span-2 space-y-6">

            <!-- Overdue -->
            {#if overdueTasks.length > 0}
                <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.15, distance: 20 }}>
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="font-semibold text-destructive flex items-center gap-1.5">
                            <CircleAlertIcon class="size-4" />
                            {m.overdue_heading()}
                        </h2>
                        <span class="text-xs text-muted-foreground">{overdueTasks.length !== 1 ? m.task_count_other({ count: overdueTasks.length.toString() }) : m.task_count_one({ count: overdueTasks.length.toString() })}</span>
                    </div>
                    <div class="space-y-2">
                        {#each overdueTasks as task, i (task.id)}
                            <div use:fadeIn={{ duration: 0.3, delay: 0.18 + i * 0.05, y: 8 }}>
                                <Item.Root variant="outline" class="border-destructive/30 bg-destructive/5">
                                    <Item.Content>
                                        <Item.Title class="font-medium">{task.title}</Item.Title>
                                        {#if task.dueAt}
                                            <Item.Description class="text-xs text-destructive flex items-center gap-1">
                                                <CalendarIcon class="size-3" />
                                                {m.was_due({ date: formatDue(task.dueAt) ?? "" })}
                                            </Item.Description>
                                        {/if}
                                    </Item.Content>
                                    <Item.Actions>
                                        <form
                                            method="POST"
                                            action="/tasks?/toggle"
                                            use:enhance={() => {
                                                tasks = tasks.map((t) => t.id === task.id ? { ...t, status: 1, completedAt: new Date().toISOString() } : t);
                                                overdueTasks = overdueTasks.filter((t) => t.id !== task.id);
                                                stats = { ...stats, total: stats.total - 1, overdue: stats.overdue - 1, completed: stats.completed + 1 };
                                                return async ({ update }) => { await update(); };
                                            }}
                                        >
                                            <input type="hidden" name="id" value={task.id} />
                                            <input type="hidden" name="status" value={task.status ?? 0} />
                                            <Button type="submit" variant="ghost" size="sm"
                                                class="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10">
                                                <CheckCheckIcon class="size-4" />
                                            </Button>
                                        </form>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => requestDelete(task.id)}
                                            class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2Icon class="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" href="/tasks">
                                            <ArrowRightIcon class="size-4" />
                                        </Button>
                                    </Item.Actions>
                                </Item.Root>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Due today -->
            <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.2, distance: 20 }}>
                <div class="flex items-center justify-between mb-3">
                    <h2 class="font-semibold flex items-center gap-1.5">
                        <CalendarIcon class="size-4 text-amber-500" />
                        {m.due_today_heading()}
                    </h2>
                    {#if todayTasks.length > 0}
                        <span class="text-xs text-muted-foreground">{todayTasks.length !== 1 ? m.task_count_other({ count: todayTasks.length.toString() }) : m.task_count_one({ count: todayTasks.length.toString() })}</span>
                    {/if}
                </div>

                {#if todayTasks.length === 0}
                    <div use:fadeInScale={{ duration: 0.4, delay: 0.25, scale: 0.97 }}>
                        <Card.Root class="shadow-none">
                            <Card.Content class="flex flex-col items-center justify-center py-8 gap-2 text-center">
                                <div use:popIn={{ delay: 0.35 }}>
                                    <CheckCheckIcon class="size-8 text-emerald-500 mb-1" />
                                </div>
                                <p class="text-sm font-medium">{m.nothing_due_today()}</p>
                                <p class="text-xs text-muted-foreground">{m.all_caught_up_today()}</p>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else}
                    <div class="space-y-2">
                        {#each todayTasks as task, i (task.id)}
                            <div use:fadeIn={{ duration: 0.3, delay: 0.25 + i * 0.05, y: 8 }}>
                                <Item.Root variant="outline">
                                    <Item.Content>
                                        <Item.Title class="font-medium">{task.title}</Item.Title>
                                        <Item.Description class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <CalendarIcon class="size-3" />
                                            {m.due_today_label()}
                                        </Item.Description>
                                    </Item.Content>
                                    <Item.Actions>
                                        <form
                                            method="POST"
                                            action="/tasks?/toggle"
                                            use:enhance={() => {
                                                tasks = tasks.map((t) => t.id === task.id ? { ...t, status: 1 } : t);
                                                todayTasks = todayTasks.filter((t) => t.id !== task.id);
                                                stats = { ...stats, total: stats.total - 1, dueToday: stats.dueToday - 1, completed: stats.completed + 1 };
                                                return async ({ update }) => { await update(); };
                                            }}
                                        >
                                            <input type="hidden" name="id" value={task.id} />
                                            <input type="hidden" name="status" value={task.status ?? 0} />
                                            <Button type="submit" variant="ghost" size="sm" class="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10">
                                                <CheckCheckIcon class="size-4" />
                                            </Button>
                                        </form>
                                        <Button variant="ghost" size="sm" href="/tasks">
                                            <ArrowRightIcon class="size-4" />
                                        </Button>
                                    </Item.Actions>
                                </Item.Root>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- All active tasks (up to 5, with link to full list) -->
            <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.25, distance: 20 }}>
                <div class="flex items-center justify-between mb-3">
                    <h2 class="font-semibold flex items-center gap-1.5">
                        <ListTodoIcon class="size-4 text-primary" />
                        {m.upcoming_heading()}
                    </h2>
                    <Button variant="ghost" size="sm" href="/tasks" class="text-xs text-muted-foreground h-7 px-2">
                        {m.view_all()} <ArrowRightIcon class="ml-1 size-3" />
                    </Button>
                </div>

                {#if upcomingTasks.length === 0 && stats.total === 0}
                    <div use:fadeInScale={{ duration: 0.4, delay: 0.3, scale: 0.97 }}>
                        <Empty.Root>
                            <Empty.Header>
                                <div use:popIn={{ delay: 0.4 }}>
                                    <Empty.Media variant="icon">
                                        <ListTodoIcon />
                                    </Empty.Media>
                                </div>
                                <Empty.Title>{m.no_tasks_yet()}</Empty.Title>
                                <Empty.Description>
                                    {m.create_first_task()}
                                </Empty.Description>
                            </Empty.Header>
                            <Empty.Content>
                                <Button onclick={() => (isCreateDialogOpen = true)}>
                                    <PlusIcon class="mr-1.5 size-4" />
                                    {m.create_task()}
                                </Button>
                            </Empty.Content>
                        </Empty.Root>
                    </div>
                {:else if upcomingTasks.length === 0}
                    <div use:fadeInScale={{ duration: 0.4, delay: 0.3, scale: 0.97 }}>
                        <Card.Root class="shadow-none">
                            <Card.Content class="flex flex-col items-center justify-center py-8 gap-2 text-center">
                                <CheckCheckIcon class="size-8 text-emerald-500 mb-1" />
                                <p class="text-sm font-medium">{m.nothing_upcoming()}</p>
                                <p class="text-xs text-muted-foreground">{m.no_tasks_beyond_today()}</p>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else}
                    <div class="space-y-2">
                        {#each upcomingTasks as task, i (task.id)}
                            <div use:fadeIn={{ duration: 0.3, delay: 0.3 + i * 0.05, y: 8 }}>
                                <Item.Root variant="outline">
                                    <Item.Content>
                                        <Item.Title class="font-medium">{task.title}</Item.Title>
                                        {#if task.dueAt}
                                            <Item.Description class="text-xs flex items-center gap-1">
                                                <CalendarIcon class="size-3" />
                                                {formatDue(task.dueAt)}
                                            </Item.Description>
                                        {/if}
                                    </Item.Content>
                                    <Item.Actions>
                                        <Button variant="ghost" size="sm" href="/tasks">
                                            <ArrowRightIcon class="size-4" />
                                        </Button>
                                    </Item.Actions>
                                </Item.Root>
                            </div>
                        {/each}
                        {#if stats.total > 5}
                            <div use:fadeIn={{ duration: 0.3, delay: 0.55, y: 6 }}>
                                <Button variant="outline" class="w-full text-sm" href="/tasks">
                                    {m.see_all_tasks({ count: stats.total.toString() })}
                                    <ArrowRightIcon class="ml-1.5 size-4" />
                                </Button>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right: calendar widget -->
        <div class="lg:col-span-1" use:slideIn={{ from: "right", duration: 0.5, delay: 0.2, distance: 24 }}>
            <h2 class="font-semibold flex items-center gap-1.5 mb-3">
                <CalendarIcon class="size-4 text-primary" />
                {m.calendar_heading()}
            </h2>
            <Card.Root class="shadow-none p-0 overflow-hidden gap-0">
                <Card.Content class="p-0">
                    <Calendar type="single" locale={getLocale()} class="w-full rounded-xl">
                        {#snippet day({ day, outsideMonth })}
                            <Day class="flex flex-col items-center p-4 group data-selected:text-accent-foreground!">
                                {day.day}
                                {#if taskDates.has(day.toString())}
                                    <div class="rounded-full bg-primary group-hover:bg-primary! group-data-focused:bg-accent-foreground h-1 w-1">
                                        {"​"}
                                    </div>
                                {:else}
                                    <div class="rounded-full bg-none h-1 w-1">{"​"}</div>
                                {/if}
                            </Day>
                        {/snippet}
                    </Calendar>
                </Card.Content>
            </Card.Root>

            <!-- Quick tip / promo block -->
            <div use:fadeIn={{ duration: 0.4, delay: 0.35, y: 10 }} class="mt-4">
                <Card.Root class="shadow-none bg-primary/5 border-primary/20 gap-3">
                    <Card.Content class="px-4 py-4">
                        <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{m.tip_heading()}</p>
                        <p class="text-sm text-foreground/80 leading-relaxed">
                            {m.tip_calendar()}
                        </p>
                    </Card.Content>
                </Card.Root>
            </div>
        </div>
    </div>
</div>

<!-- Create Task Dialog -->
<Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <form
            method="POST"
            action="/tasks?/create"
            use:enhance={({ formData }) => {
                const title = formData.get("title") as string;
                const dueAtRaw = formData.get("due_at") as string | null;
                const dueAt = dueAtRaw ? `${dueAtRaw}T12:00:00Z` : null;

                const optimistic: Task = {
                    id: -(Date.now()),
                    title,
                    dueAt,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    owner: "",
                    status: 0,
                    url: null,
                    description: null,
                    canvasDescription: null,
                    canvasId: null,
                    canvasCourseId: null,
                    source: "manual",
                    syncedAt: null,
                    lastLocalEdit: null,
                };

                tasks = [optimistic, ...tasks];
                stats = { ...stats, total: stats.total + 1 };

                if (dueAt && dueAt.split("T")[0] === todayString) {
                    todayTasks = [...todayTasks, optimistic];
                    stats = { ...stats, dueToday: stats.dueToday + 1 };
                }

                isCreateDialogOpen = false;
                newTaskTitle = "";
                newTaskDate = today(getLocalTimeZone());

                return async ({ update }) => {
                    await update();
                };
            }}
        >
            <Dialog.Header>
                <Dialog.Title>{m.create_task_dialog_title()}</Dialog.Title>
                <Dialog.Description>
                    {m.create_task_dialog_description()}
                </Dialog.Description>
            </Dialog.Header>
            <div class="grid gap-4 py-4">
                <div class="grid gap-3">
                    <Label for="title">{m.title_label()}</Label>
                    <Input
                        id="title"
                        name="title"
                        bind:value={newTaskTitle}
                        placeholder={m.title_placeholder()}
                        required
                    />
                </div>
                <div class="grid gap-3">
                    <Label for="dueDate">{m.due_date_label()}</Label>
                    <input
                        type="hidden"
                        name="due_at"
                        value={newTaskDate
                            ? newTaskDate.toDate(getLocalTimeZone()).toISOString().split("T")[0]
                            : ""}
                    />
                    <Popover.Root bind:open={isDatePickerOpen}>
                        <Popover.Trigger id="dueDate">
                            {#snippet child({ props })}
                                <Button
                                    {...props}
                                    variant="outline"
                                    class="w-full justify-between font-normal"
                                >
                                    {newTaskDate
                                        ? newTaskDate.toDate(getLocalTimeZone()).toLocaleDateString()
                                        : m.select_a_date()}
                                    <ChevronDownIcon class="opacity-50" />
                                </Button>
                            {/snippet}
                        </Popover.Trigger>
                        <Popover.Content class="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                                type="single"
                                bind:value={newTaskDate}
                                onValueChange={() => (isDatePickerOpen = false)}
                            />
                        </Popover.Content>
                    </Popover.Root>
                </div>
            </div>
            <Dialog.Footer>
                <Dialog.Close>
                    {#snippet child({ props })}
                        <Button {...props} variant="outline" type="button">{m.cancel()}</Button>
                    {/snippet}
                </Dialog.Close>
                <Button type="submit">{m.save()}</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
