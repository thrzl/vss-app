<script lang="ts">
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
    import { Calendar } from "$lib/components/ui/calendar";
    import {
        PlusIcon,
        Trash2Icon,
        PencilIcon,
        ListTodoIcon,
        ChevronDownIcon,
        CalendarIcon,
        CheckCheck,
    } from "@lucide/svelte";
    import { fadeIn, fadeInScale, popIn, staggerChildren } from "$lib/motion";
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

    // ── derived tab lists ───────────────────────────────────────────────────
    let activeTasks = $derived(tasks.filter((t) => (t.status ?? 0) === 0));
    let completedTasks = $derived(tasks.filter((t) => (t.status ?? 0) === 1));

    // ── create dialog ───────────────────────────────────────────────────────
    let isCreateOpen = $state(false);
    let createTitle = $state("");
    let createDate = $state<CalendarDate>(today(getLocalTimeZone()));
    let isCreateDateOpen = $state(false);

    // ── edit dialog ─────────────────────────────────────────────────────────
    let editingTask = $state<Task | null>(null);
    let editTitle = $state("");
    let editDate = $state<CalendarDate>(today(getLocalTimeZone()));
    let isEditDateOpen = $state(false);

    function openEdit(task: Task) {
        editingTask = task;
        editTitle = task.title ?? "";
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

    // ── date display helper ──────────────────────────────────────────────────
    // dueAt may be a full ISO timestamp or a plain YYYY-MM-DD string.
    // We convert it into the user's local timezone via parseAbsolute, then
    // extract the plain CalendarDate for timezone-safe comparison and display.
    function dueAsCalendarDate(due_at: string): CalendarDate {
        // Handle both full ISO timestamps and plain YYYY-MM-DD form values.
        if (due_at.length === 10) {
            return parseDate(due_at);
        }
        return toCalendarDate(parseAbsolute(due_at, getLocalTimeZone()));
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

<div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between" use:fadeIn={{ duration: 0.45, y: 14 }}>
        <div>
            <h1 class="text-2xl font-bold">Tasks</h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {activeTasks.length} remaining · {completedTasks.length} completed
            </p>
        </div>
        <Button onclick={() => (isCreateOpen = true)}>
            <PlusIcon class="mr-1" />
            New Task
        </Button>
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
                Active
                {#if activeTasks.length > 0}
                    <span class="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {activeTasks.length}
                    </span>
                {/if}
            </Tabs.Trigger>
            <Tabs.Trigger value="completed">
                Completed
                {#if completedTasks.length > 0}
                    <span class="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {completedTasks.length}
                    </span>
                {/if}
            </Tabs.Trigger>
            <Tabs.Trigger value="all">All</Tabs.Trigger>
        </Tabs.List>
    </div>

        <!-- Active Tasks -->
        <Tabs.Content value="active" class="mt-4 space-y-2">
            {#if activeTasks.length === 0}
                <div use:fadeInScale={{ duration: 0.45, delay: 0.15, scale: 0.95 }}>
                <Empty.Root>
                    <Empty.Header>
                        <div use:popIn={{ delay: 0.25 }}><Empty.Media variant="icon"><ListTodoIcon /></Empty.Media></div>
                        <Empty.Title>All caught up!</Empty.Title>
                        <Empty.Description>No active tasks. Create one to get started.</Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <Button onclick={() => (isCreateOpen = true)}>
                            <PlusIcon class="mr-1" /> New Task
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
                            <Item.Title class="font-medium truncate">{task.title}</Item.Title>
                            {#if task.dueAt}
                                <Item.Description
                                    class={[
                                        "text-xs flex items-center gap-1 mt-0.5",
                                        isOverdue(task.dueAt, task.status)
                                            ? "text-destructive"
                                            : "text-muted-foreground",
                                    ].join(" ")}
                                >
                                    <CalendarIcon class="size-3" />
                                    {isOverdue(task.dueAt, task.status) ? "Overdue · " : ""}{formatDue(task.dueAt)}
                                </Item.Description>
                            {/if}
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
                            <form
                                method="POST"
                                action="?/delete"
                                use:enhance={() => {
                                    optimisticDelete(task.id);
                                    return async ({ update }) => update({ reset: false });
                                }}
                            >
                                <input type="hidden" name="id" value={task.id} />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon class="size-4" />
                                </Button>
                            </form>
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
                        <div use:popIn={{ delay: 0.25 }}><Empty.Media variant="icon"><CheckCheck /></Empty.Media></div>
                        <Empty.Title>No completed tasks</Empty.Title>
                        <Empty.Description>Tasks you complete will appear here.</Empty.Description>
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
                            <Item.Title class="font-medium line-through text-muted-foreground truncate">
                                {task.title}
                            </Item.Title>
                            {#if task.completedAt}
                                <Item.Description class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <CheckCheck class="size-3" />
                                    Completed {formatDue(task.completedAt)}
                                </Item.Description>
                            {/if}
                        </Item.Content>

                        <Item.Actions>
                            <form
                                method="POST"
                                action="?/delete"
                                use:enhance={() => {
                                    optimisticDelete(task.id);
                                    return async ({ update }) => update({ reset: false });
                                }}
                            >
                                <input type="hidden" name="id" value={task.id} />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon class="size-4" />
                                </Button>
                            </form>
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
                        <Empty.Title>No tasks yet</Empty.Title>
                        <Empty.Description>Create your first task to get started.</Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <Button onclick={() => (isCreateOpen = true)}>
                            <PlusIcon class="mr-1" /> New Task
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
                            {#if task.dueAt}
                                <Item.Description
                                    class={[
                                        "text-xs flex items-center gap-1 mt-0.5",
                                        isOverdue(task.dueAt, task.status)
                                            ? "text-destructive"
                                            : "text-muted-foreground",
                                    ].join(" ")}
                                >
                                    <CalendarIcon class="size-3" />
                                    {formatDue(task.dueAt)}
                                </Item.Description>
                            {/if}
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
                            <form
                                method="POST"
                                action="?/delete"
                                use:enhance={() => {
                                    optimisticDelete(task.id);
                                    return async ({ update }) => update({ reset: false });
                                }}
                            >
                                <input type="hidden" name="id" value={task.id} />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon class="size-4" />
                                </Button>
                            </form>
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
                const optimistic: Task = {
                    id: -Date.now(),
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    title,
                    dueAt: due_at || null,
                    owner: "",
                    status: 0,
                    url: null,
                };
                tasks = [optimistic, ...tasks];
                isCreateOpen = false;
                createTitle = "";
                createDate = today(getLocalTimeZone());
                return async ({ update }) => update({ reset: false });
            }}
        >
            <Dialog.Header>
                <Dialog.Title>New Task</Dialog.Title>
                <Dialog.Description>Add a task to your list.</Dialog.Description>
            </Dialog.Header>

            <div class="grid gap-4 py-4">
                <div class="grid gap-2">
                    <Label for="create-title">Title</Label>
                    <Input
                        id="create-title"
                        name="title"
                        bind:value={createTitle}
                        placeholder="What needs to be done?"
                        required
                        autofocus
                    />
                </div>

                <div class="grid gap-2">
                    <Label for="create-due">Due Date</Label>
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
                                        : "Pick a date"}
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
                        <Button {...props} type="button" variant="outline">Cancel</Button>
                    {/snippet}
                </Dialog.Close>
                <Button type="submit">Create Task</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

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
                    const dueAt = editDate ? editDate.toString() : null;
                    tasks = tasks.map((t) =>
                        t.id === id ? { ...t, title, dueAt } : t,
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

                <Dialog.Header>
                    <Dialog.Title>Edit Task</Dialog.Title>
                    <Dialog.Description>Update the task details.</Dialog.Description>
                </Dialog.Header>

                <div class="grid gap-4 py-4">
                    <div class="grid gap-2">
                        <Label for="edit-title">Title</Label>
                        <Input
                            id="edit-title"
                            name="title"
                            bind:value={editTitle}
                            placeholder="Task title"
                            required
                            autofocus
                        />
                    </div>

                    <div class="grid gap-2">
                        <Label for="edit-due">Due Date</Label>
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
                                            : "Pick a date"}
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
                            <Button {...props} type="button" variant="outline">Cancel</Button>
                        {/snippet}
                    </Dialog.Close>
                    <Button type="submit">Save Changes</Button>
                </Dialog.Footer>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>
