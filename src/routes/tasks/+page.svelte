<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { enhance } from "$app/forms";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Item from "$lib/components/ui/item";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Empty from "$lib/components/ui/empty";
    import * as Popover from "$lib/components/ui/popover";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Calendar } from "$lib/components/ui/calendar";
    import ConfirmDelete from "$lib/components/ConfirmDelete.svelte";
    import TaskDetailSheet from "$lib/components/TaskDetailSheet.svelte";
    import {
        PlusIcon,
        Trash2Icon,
        PencilIcon,
        ListTodoIcon,
        ChevronDownIcon,
        CalendarIcon,
        CheckCheck,
        GraduationCapIcon,
        AlignLeftIcon,
    } from "@lucide/svelte";
    import { fadeIn, fadeInScale, popIn, staggerChildren } from "$lib/motion";
    import { ArrowUpDownIcon } from "@lucide/svelte";
    import {
        today,
        getLocalTimeZone,
        parseDate,
        parseAbsolute,
        toCalendarDate,
        type CalendarDate,
    } from "@internationalized/date";
    import type { PageProps } from "./$types";
    import type { Task } from "$lib/schema";

    let { data, form }: PageProps = $props();

    // ── local reactive copy of the server data ──────────────────────────────
    let tasks = $state<Task[]>(data.tasks as Task[]);

    // keep in sync when SvelteKit invalidates and re-runs the load
    $effect(() => {
        tasks = data.tasks;
    });

    // ── sort control ────────────────────────────────────────────────────────
    type SortMode = "created" | "due";
    let sortMode = $state<SortMode>("created");

    function sortedByMode(list: Task[]): Task[] {
        if (sortMode === "created") return list;
        return [...list].sort((a, b) => {
            if (!a.dueAt && !b.dueAt) return 0;
            if (!a.dueAt) return 1;
            if (!b.dueAt) return -1;
            return a.dueAt.localeCompare(b.dueAt);
        });
    }

    // ── derived tab lists ───────────────────────────────────────────────────
    let activeTasks = $derived(sortedByMode(tasks.filter((t) => (t.status ?? 0) === 0)));
    let completedTasks = $derived(sortedByMode(tasks.filter((t) => (t.status ?? 0) === 1)));

    // ── create dialog ───────────────────────────────────────────────────────
    let isCreateOpen = $state(false);
    let createTitle = $state("");
    let createDescription = $state("");
    let createDate = $state<CalendarDate>(today(getLocalTimeZone()));
    let isCreateDateOpen = $state(false);

    // ── edit dialog ─────────────────────────────────────────────────────────
    let editingTask = $state<Task | null>(null);
    let editTitle = $state("");
    let editDescription = $state("");
    let editDate = $state<CalendarDate>(today(getLocalTimeZone()));
    let isEditDateOpen = $state(false);

    // ── detail sheet ────────────────────────────────────────────────────────

    let previewTask = $state<Task | null>(null);
    let isDetailOpen = $state(false);

    function openDetail(task: Task) {
        previewTask = task;
        isDetailOpen = true;
    }

    function openEdit(task: Task) {
        editingTask = task;
        editTitle = task.title ?? "";
        editDescription = task.description ?? "";
        editDate = task.dueAt
            ? parseDate(task.dueAt.split("T")[0])
            : today(getLocalTimeZone());
    }

    function closeEdit() {
        editingTask = null;
    }

    // ── optimistic helpers ──────────────────────────────────────────────────
    function optimisticToggle(id: number) {
        tasks = tasks.map((t) =>
            t.id === id
                ? {
                      ...t,
                      status: (t.status ?? 0) === 1 ? 0 : 1,
                      completedAt:
                          (t.status ?? 0) === 0 ? new Date().toISOString() : null,
                  }
                : t,
        );
    }

    function optimisticDelete(id: number) {
        tasks = tasks.filter((t) => t.id !== id);
    }

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
            optimisticDelete(pendingDeleteId);
            // Submit the hidden form
            deleteFormRef?.requestSubmit();
        }
        pendingDeleteId = null;
    }

    // ── date display helper ──────────────────────────────────────────────────
    // dueAt may be a full ISO timestamp or a plain YYYY-MM-DD string.
    // We convert it into the user's local timezone via parseAbsolute, then
    // extract the plain CalendarDate for timezone-safe comparison and display.
    function dueAsCalendarDate(due_at: string): CalendarDate {
        // Handle plain YYYY-MM-DD form values.
        if (due_at.length === 10) {
            return parseDate(due_at);
        }
        // SQLite current_timestamp produces "YYYY-MM-DD HH:MM:SS" (space, no T, no Z).
        // Normalise to a valid ISO 8601 string before parsing.
        const iso = due_at.includes("T") ? due_at : due_at.replace(" ", "T") + "Z";
        return toCalendarDate(parseAbsolute(iso, getLocalTimeZone()));
    }

    function formatDue(due_at: string | null): string {
        if (!due_at) return "";
        const cd = dueAsCalendarDate(due_at);
        return cd.toDate(getLocalTimeZone()).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function isOverdue(due_at: string | null, status: number | null): boolean {
        if (!due_at || status === 1) return false;
        return dueAsCalendarDate(due_at).compare(today(getLocalTimeZone())) < 0;
    }
</script>

<svelte:head>
    <title>Tasks — fojo</title>
</svelte:head>

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

<div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between" use:fadeIn={{ duration: 0.45, y: 14 }}>
        <div>
            <h1 class="text-2xl font-bold">{m.tasks_page_title()}</h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {m.remaining_completed({ remaining: activeTasks.length.toString(), completed: completedTasks.length.toString() })}
            </p>
        </div>
        <div class="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onclick={() => { sortMode = sortMode === "created" ? "due" : "created"; }}
                class="gap-1.5 text-xs"
            >
                <ArrowUpDownIcon class="size-3.5" />
                {sortMode === "created" ? "Sort by due date" : "Sort by created"}
            </Button>
            <Button onclick={() => (isCreateOpen = true)}>
                <PlusIcon class="mr-1" />
                {m.new_task()}
            </Button>
        </div>
    </div>

    {#if form?.message}
        <div class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {form.message}
        </div>
    {/if}

    <!-- Tabs -->
    <Tabs.Root value="active">
    <div use:fadeIn={{ duration: 0.4, delay: 0.1, y: 8 }}>
        <Tabs.List class="w-full grid grid-cols-3" >
            <Tabs.Trigger value="active">
                {m.tab_active()}
                {#if activeTasks.length > 0}
                    <span class="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {activeTasks.length}
                    </span>
                {/if}
            </Tabs.Trigger>
            <Tabs.Trigger value="completed">
                {m.tab_completed()}
                {#if completedTasks.length > 0}
                    <span class="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {completedTasks.length}
                    </span>
                {/if}
            </Tabs.Trigger>
            <Tabs.Trigger value="all">{m.tab_all()}</Tabs.Trigger>
        </Tabs.List>
    </div>

        <!-- Active Tasks -->
        <Tabs.Content value="active" class="mt-4 space-y-2">
            {#if activeTasks.length === 0}
                <div use:fadeInScale={{ duration: 0.45, delay: 0.15, scale: 0.95 }}>
                <Empty.Root>
                    <Empty.Header>
                        <div use:popIn={{ delay: 0.25 }}><Empty.Media variant="icon"><ListTodoIcon /></Empty.Media></div>
                        <Empty.Title>{m.all_caught_up()}</Empty.Title>
                        <Empty.Description>{m.no_active_tasks()}</Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <Button onclick={() => (isCreateOpen = true)}>
                            <PlusIcon class="mr-1" /> {m.new_task()}
                        </Button>
                    </Empty.Content>
                </Empty.Root>
                </div>
            {:else}
                {#each activeTasks as task, i (task.id)}
                    <div use:fadeIn={{ duration: 0.35, delay: 0.05 + i * 0.04, y: 10 }}>
                    <Item.Root variant="outline">
                        <form
                            method="POST"
                            action="?/toggle"
                            use:enhance={() => {
                                optimisticToggle(task.id);
                                return async ({ update }) => update({ reset: false });
                            }}
                            class="flex items-center"
                        >
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value={task.status ?? 0} />
                            <button type="submit" class="flex items-center justify-center p-4 cursor-pointer">
                                <Checkbox checked={(task.status ?? 0) === 1} class="pointer-events-none" />
                            </button>
                        </form>

                        <Item.Content class="flex-1 min-w-0 py-3">
                            <button type="button" class="text-left w-full cursor-pointer" onclick={() => openDetail(task)}>
                            <Item.Title class="font-medium truncate w-full text-wrap">{task.title}</Item.Title>
                            <div class="flex items-center gap-2 mt-0.5">
                                {#if task.source === "canvas"}
                                    <span class="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                        <GraduationCapIcon class="size-2.5" />
                                        {m.task_source_canvas()}
                                    </span>
                                {/if}
                                {#if task.description}
                                    <span class="inline-flex items-center gap-1 text-muted-foreground" title={m.task_has_description()}>
                                        <AlignLeftIcon class="size-3" />
                                    </span>
                                {/if}
                                {#if task.dueAt}
                                    <Item.Description
                                        class={[
                                            "text-xs flex items-center gap-1",
                                            isOverdue(task.dueAt, task.status)
                                                ? "text-destructive"
                                                : "text-muted-foreground",
                                        ].join(" ")}
                                    >
                                        <CalendarIcon class="size-3" />
                                        {isOverdue(task.dueAt, task.status) ? m.overdue_prefix() : ""}{formatDue(task.dueAt)}
                                    </Item.Description>
                                {/if}
                            </div>
                            </button>
                        </Item.Content>

                        <Item.Actions class="gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => openEdit(task)}
                                class="text-muted-foreground hover:text-foreground"
                            >
                                <PencilIcon class="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => requestDelete(task.id)}
                                class="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2Icon class="size-4" />
                            </Button>
                        </Item.Actions>
                    </Item.Root>
                    </div>
                {/each}
            {/if}
        </Tabs.Content>

        <!-- Completed Tasks -->
        <Tabs.Content value="completed" class="mt-4 space-y-2">
            {#if completedTasks.length === 0}
                <div use:fadeInScale={{ duration: 0.45, delay: 0.15, scale: 0.95 }}>
                <Empty.Root>
                    <Empty.Header>
                        <div use:popIn={{ delay: 0.25 }}>
                            <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 mb-1">
                                <span class="text-2xl">🏆</span>
                            </div>
                        </div>
                        <Empty.Title>No completed tasks yet</Empty.Title>
                        <Empty.Description>Complete your first task and it'll show up here. You got this!</Empty.Description>
                    </Empty.Header>
                </Empty.Root>
                </div>
            {:else}
                {#each completedTasks as task, i (task.id)}
                    <div use:fadeIn={{ duration: 0.35, delay: 0.05 + i * 0.04, y: 10 }}>
                    <Item.Root variant="outline" class="opacity-60">
                        <form
                            method="POST"
                            action="?/toggle"
                            use:enhance={() => {
                                optimisticToggle(task.id);
                                return async ({ update }) => update({ reset: false });
                            }}
                            class="flex items-center"
                        >
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value={task.status ?? 0} />
                            <button type="submit" class="flex items-center justify-center p-4 cursor-pointer">
                                <Checkbox checked={true} class="pointer-events-none" />
                            </button>
                        </form>

                        <Item.Content class="flex-1 min-w-0 py-3">
                            <button type="button" class="text-left w-full cursor-pointer" onclick={() => openDetail(task)}>
                            <Item.Title class="font-medium line-through text-muted-foreground truncate">
                                {task.title}
                            </Item.Title>
                            <div class="flex items-center gap-2 mt-0.5">
                                {#if task.source === "canvas"}
                                    <span class="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600/60 dark:text-orange-400/60">
                                        <GraduationCapIcon class="size-2.5" />
                                        {m.task_source_canvas()}
                                    </span>
                                {/if}
                                {#if task.description}
                                    <span class="inline-flex items-center gap-1 text-muted-foreground/60" title={m.task_has_description()}>
                                        <AlignLeftIcon class="size-3" />
                                    </span>
                                {/if}
                            {#if task.completedAt}
                                <Item.Description class="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCheck class="size-3" />
                                    {m.completed_on({ date: formatDue(task.completedAt) })}
                                </Item.Description>
                            {/if}
                            </div>
                            </button>
                        </Item.Content>

                        <Item.Actions>
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => requestDelete(task.id)}
                                class="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2Icon class="size-4" />
                            </Button>
                        </Item.Actions>
                    </Item.Root>
                    </div>
                {/each}
            {/if}
        </Tabs.Content>

        <!-- All Tasks -->
        <Tabs.Content value="all" class="mt-4 space-y-2">
            {#if tasks.length === 0}
                <div use:fadeInScale={{ duration: 0.45, delay: 0.15, scale: 0.95 }}>
                <Empty.Root>
                    <Empty.Header>
                        <div use:popIn={{ delay: 0.25 }}><Empty.Media variant="icon"><ListTodoIcon /></Empty.Media></div>
                        <Empty.Title>{m.no_tasks_yet_title()}</Empty.Title>
                        <Empty.Description>{m.create_first_task_description()}</Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <Button onclick={() => (isCreateOpen = true)}>
                            <PlusIcon class="mr-1" /> {m.new_task()}
                        </Button>
                    </Empty.Content>
                </Empty.Root>
                </div>
            {:else}
                {#each tasks as task, i (task.id)}
                    <div use:fadeIn={{ duration: 0.35, delay: 0.05 + i * 0.04, y: 10 }}>
                    <Item.Root
                        variant="outline"
                        class={(task.status ?? 0) === 1 ? "opacity-60" : ""}
                    >
                        <form
                            method="POST"
                            action="?/toggle"
                            use:enhance={() => {
                                optimisticToggle(task.id);
                                return async ({ update }) => update({ reset: false });
                            }}
                            class="flex items-center"
                        >
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value={task.status ?? 0} />
                            <button type="submit" class="flex items-center justify-center p-4 cursor-pointer">
                                <Checkbox checked={(task.status ?? 0) === 1} class="pointer-events-none" />
                            </button>
                        </form>

                        <Item.Content class="flex-1 min-w-0 py-3">
                            <button type="button" class="text-left w-full cursor-pointer" onclick={() => openDetail(task)}>
                            <Item.Title
                                class={[
                                    "font-medium truncate",
                                    (task.status ?? 0) === 1
                                        ? "line-through text-muted-foreground"
                                        : "",
                                ].join(" ")}
                            >
                                {task.title}
                            </Item.Title>
                            <div class="flex items-center gap-2 mt-0.5">
                                {#if task.source === "canvas"}
                                    <span class="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                        <GraduationCapIcon class="size-2.5" />
                                        {m.task_source_canvas()}
                                    </span>
                                {/if}
                                {#if task.description}
                                    <span class="inline-flex items-center gap-1 text-muted-foreground" title={m.task_has_description()}>
                                        <AlignLeftIcon class="size-3" />
                                    </span>
                                {/if}
                                {#if task.dueAt}
                                    <Item.Description
                                        class={[
                                            "text-xs flex items-center gap-1",
                                            isOverdue(task.dueAt, task.status)
                                                ? "text-destructive"
                                                : "text-muted-foreground",
                                        ].join(" ")}
                                    >
                                        <CalendarIcon class="size-3" />
                                        {isOverdue(task.dueAt, task.status) ? m.overdue_prefix() : ""}{formatDue(task.dueAt)}
                                    </Item.Description>
                                {/if}
                            </div>
                            </button>
                        </Item.Content>

                        <Item.Actions class="gap-1">
                            {#if (task.status ?? 0) === 0}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onclick={() => openEdit(task)}
                                    class="text-muted-foreground hover:text-foreground"
                                >
                                    <PencilIcon class="size-4" />
                                </Button>
                            {/if}
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => requestDelete(task.id)}
                                class="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2Icon class="size-4" />
                            </Button>
                        </Item.Actions>
                    </Item.Root>
                    </div>
                {/each}
            {/if}
        </Tabs.Content>
    </Tabs.Root>
</div>

<!-- ── Create Task Dialog ──────────────────────────────────────────────── -->
<Dialog.Root bind:open={isCreateOpen}>
    <Dialog.Content class="sm:max-w-[420px]">
        <form
            method="POST"
            action="?/create"
            use:enhance={({ formData }) => {
                const title = formData.get("title") as string;
                const due_at = formData.get("due_at") as string;
                // optimistic insert
                const description = formData.get("description") as string;
                const optimistic: Task = {
                    id: -Date.now(),
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    title,
                    description: description || null,
                    canvasDescription: null,
                    dueAt: due_at || null,
                    owner: "",
                    status: 0,
                    url: null,
                    canvasId: null,
                    canvasCourseId: null,
                    source: "manual",
                    syncedAt: null,
                    lastLocalEdit: null,
                };
                tasks = [optimistic, ...tasks];
                isCreateOpen = false;
                createTitle = "";
                createDescription = "";
                createDate = today(getLocalTimeZone());
                return async ({ update }) => update({ reset: false });
            }}
        >
            <Dialog.Header>
                <Dialog.Title>{m.new_task_dialog_title()}</Dialog.Title>
                <Dialog.Description>{m.new_task_dialog_description()}</Dialog.Description>
            </Dialog.Header>

            <div class="grid gap-4 py-4">
                <div class="grid gap-2">
                    <Label for="create-title">{m.title_label()}</Label>
                    <Input
                        id="create-title"
                        name="title"
                        bind:value={createTitle}
                        placeholder={m.title_placeholder()}
                        required
                        autofocus
                    />
                </div>

                <div class="grid gap-2">
                    <Label for="create-description">{m.description_label()}</Label>
                    <Textarea
                        id="create-description"
                        name="description"
                        bind:value={createDescription}
                        placeholder={m.description_placeholder()}
                        rows={3}
                    />
                </div>

                <div class="grid gap-2">
                    <Label for="create-due">{m.due_date_label()}</Label>
                    <input
                        type="hidden"
                        name="due_at"
                        value={createDate ? createDate.toString() : ""}
                    />
                    <Popover.Root bind:open={isCreateDateOpen}>
                        <Popover.Trigger id="create-due">
                            {#snippet child({ props })}
                                <Button
                                    {...props}
                                    type="button"
                                    variant="outline"
                                    class="w-full justify-between font-normal"
                                >
                                    {createDate
                                        ? createDate
                                              .toDate(getLocalTimeZone())
                                              .toLocaleDateString(undefined, {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                              })
                                        : m.pick_a_date()}
                                    <ChevronDownIcon class="opacity-50" />
                                </Button>
                            {/snippet}
                        </Popover.Trigger>
                        <Popover.Content class="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                                type="single"
                                bind:value={createDate}
                                onValueChange={() => (isCreateDateOpen = false)}
                            />
                        </Popover.Content>
                    </Popover.Root>
                </div>
            </div>

            <Dialog.Footer>
                <Dialog.Close>
                    {#snippet child({ props })}
                        <Button {...props} type="button" variant="outline">{m.cancel()}</Button>
                    {/snippet}
                </Dialog.Close>
                <Button type="submit">{m.create_task_submit()}</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<!-- ── Task Detail Sheet ──────────────────────────────────────────────── -->
<TaskDetailSheet
    bind:task={previewTask}
    bind:open={isDetailOpen}
    onEdit={openEdit}
    {formatDue}
/>

<!-- ── Edit Task Dialog ───────────────────────────────────────────────── -->
<Dialog.Root open={!!editingTask} onOpenChange={(open) => { if (!open) closeEdit(); }}>
    <Dialog.Content class="sm:max-w-[420px]">
        {#if editingTask}
            <form
                method="POST"
                action="?/update"
                use:enhance={() => {
                    // optimistic update
                    const id = editingTask!.id;
                    const title = editTitle;
                    const description = editDescription || null;
                    const dueAt = editDate ? editDate.toString() : null;
                    tasks = tasks.map((t) =>
                        t.id === id ? { ...t, title, description, dueAt } : t,
                    );
                    closeEdit();
                    return async ({ update }) => update({ reset: false });
                }}
            >
                <input type="hidden" name="id" value={editingTask.id} />
                <input
                    type="hidden"
                    name="due_at"
                    value={editDate ? editDate.toString() : ""}
                />
                <input
                    type="hidden"
                    name="description"
                    value={editDescription}
                />

                <Dialog.Header>
                    <Dialog.Title>{m.edit_task_dialog_title()}</Dialog.Title>
                    <Dialog.Description>{m.edit_task_dialog_description()}</Dialog.Description>
                </Dialog.Header>

                <div class="grid gap-4 py-4">
                    <div class="grid gap-2">
                        <Label for="edit-title">{m.title_label()}</Label>
                        <Input
                            id="edit-title"
                            name="title"
                            bind:value={editTitle}
                            placeholder={m.task_title_placeholder()}
                            required
                            autofocus
                        />
                    </div>

                    <div class="grid gap-2">
                        <Label for="edit-description">{m.description_label()}</Label>
                        <Textarea
                            id="edit-description"
                            class="max-h-[25vh]"
                            bind:value={editDescription}
                            placeholder={m.description_placeholder()}
                            rows={3}
                        />
                    </div>

                    <div class="grid gap-2">
                        <Label for="edit-due">{m.due_date_label()}</Label>
                        <Popover.Root bind:open={isEditDateOpen}>
                            <Popover.Trigger id="edit-due">
                                {#snippet child({ props })}
                                    <Button
                                        {...props}
                                        type="button"
                                        variant="outline"
                                        class="w-full justify-between font-normal"
                                    >
                                        {editDate
                                            ? editDate
                                                  .toDate(getLocalTimeZone())
                                                  .toLocaleDateString(undefined, {
                                                      month: "short",
                                                      day: "numeric",
                                                      year: "numeric",
                                                  })
                                            : m.pick_a_date()}
                                        <ChevronDownIcon class="opacity-50" />
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content class="w-auto overflow-hidden p-0" align="start">
                                <Calendar
                                    type="single"
                                    bind:value={editDate}
                                    onValueChange={() => (isEditDateOpen = false)}
                                />
                            </Popover.Content>
                        </Popover.Root>
                    </div>
                </div>

                <Dialog.Footer>
                    <Dialog.Close>
                        {#snippet child({ props })}
                            <Button {...props} type="button" variant="outline">{m.cancel()}</Button>
                        {/snippet}
                    </Dialog.Close>
                    <Button type="submit">{m.save_changes()}</Button>
                </Dialog.Footer>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>
