<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Calendar, Day } from "$lib/components/ui/calendar";
    import * as Empty from "$lib/components/ui/empty";
    import * as Item from "$lib/components/ui/item";
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        ArrowRightIcon,
        ArrowUpRightIcon,
        ListTodoIcon,
        Trash2Icon,
    } from "@lucide/svelte";
    import { fadeIn, slideIn, staggerChildren, popIn, fadeInScale } from "$lib/motion";
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
    import { ChevronDownIcon } from "@lucide/svelte";

    let { data }: PageProps = $props();
    let tasks = $state(data.tasks);

    // Keep tasks in sync when data changes (e.g. after form action invalidation)
    $effect(() => {
        tasks = data.tasks;
    });

    let taskDates = $derived(new Set(tasks.map((task) => task.dueAt)));

    let isCreateDialogOpen = $state(false);
    let isDatePickerOpen = $state(false);
    let newTaskTitle = $state("");
    let newTaskDate = $state<CalendarDate>(today(getLocalTimeZone()));
</script>

<div class="mx-auto text-center">
    <h1 class="font-bold text-xl" use:fadeIn={{ duration: 0.5, y: 14 }}>{m.hello_world({ name: data.user?.name ?? "Student" })}</h1>
    <p use:fadeIn={{ duration: 0.45, delay: 0.1, y: 10 }}>
        {m.due_assignments({ count: tasks?.length || 0 })}
    </p>
    <div class="grid grid-cols-3 justify-center">
        <div class="flex justify-end w-full px-4" use:slideIn={{ from: "left", duration: 0.5, delay: 0.15, distance: 24 }}>
            <Calendar type="single" locale={getLocale()}>
                {#snippet day({ day, outsideMonth })}
                    {@const dayIsWeekend = isWeekend(day, "en-US")}
                    <Day
                        class="flex flex-col items-center p-4 group data-selected:text-accent-foreground!"
                    >
                        {day.day}
                        {#if taskDates.has(day.toString())}
                            <div
                                class="rounded-full bg-primary group-hover:bg-primary! group-data-focused:bg-accent-foreground h-1 w-1"
                            >
                                {"​"}
                            </div>
                        {:else}
                            <div class="rounded-full bg-none h-1 w-1">
                                {"​"}
                            </div>
                        {/if}
                    </Day>
                {/snippet}
            </Calendar>
        </div>
        <div class="text-left" use:slideIn={{ from: "right", duration: 0.5, delay: 0.15, distance: 24 }}>
            {#if (tasks || []).length > 0}
                {#each tasks as task, i}
                    <div use:fadeIn={{ duration: 0.35, delay: 0.2 + i * 0.06, y: 10 }}>
                    <Item.Root class="mb-2" variant="outline">
                        <Item.Content>
                            <Item.Title class="font-medium"
                                >{task.title}</Item.Title
                            >
                            <Item.Description class="text-sm text-gray-500"
                                >{task.dueAt}</Item.Description
                            >
                        </Item.Content>
                        <Item.Actions>
                            <form
                                method="POST"
                                action="/tasks?/delete"
                                use:enhance={() => {
                                    // Optimistically remove from local state
                                    tasks = tasks.filter((t) => t.id !== task.id);
                                    return async ({ update }) => {
                                        await update();
                                    };
                                }}
                            >
                                <input type="hidden" name="id" value={task.id} />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon />
                                </Button>
                            </form>
                            <Button variant="ghost">
                                <ArrowRightIcon />
                            </Button>
                        </Item.Actions>
                    </Item.Root>
                    </div>
                {/each}
            {:else}
                <div use:fadeInScale={{ duration: 0.45, delay: 0.2, scale: 0.95 }}>
                <Empty.Root>
                    <Empty.Header>
                        <div use:popIn={{ delay: 0.3 }}>
                        <Empty.Media variant="icon">
                            <ListTodoIcon />
                        </Empty.Media>
                        </div>
                        <Empty.Title>no tasks yet</Empty.Title>
                        <Empty.Description>
                            you haven't created any tasks yet. get started by
                            creating your first task.
                        </Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <div class="flex gap-2">
                            <Button onclick={() => (isCreateDialogOpen = true)}
                                >create task</Button
                            >
                            <Button variant="outline">link Canvas</Button>
                        </div>
                    </Empty.Content>
                    <Button
                        variant="link"
                        class="text-muted-foreground"
                        size="sm"
                    >
                        <a href="#/">
                            learn more <ArrowUpRightIcon class="inline" />
                        </a>
                    </Button>
                </Empty.Root>
                </div>
            {/if}
        </div>
        <div></div>
    </div>
</div>

<Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <form
            method="POST"
            action="/tasks?/create"
            use:enhance={() => {
                return async ({ update }) => {
                    await update();
                    isCreateDialogOpen = false;
                    newTaskTitle = "";
                    newTaskDate = today(getLocalTimeZone());
                };
            }}
        >
            <Dialog.Header>
                <Dialog.Title>Create Task</Dialog.Title>
                <Dialog.Description>
                    Add a new task to your list.
                </Dialog.Description>
            </Dialog.Header>
            <div class="grid gap-4 py-4">
                <div class="grid gap-3">
                    <Label for="title">Title</Label>
                    <Input
                        id="title"
                        name="title"
                        bind:value={newTaskTitle}
                        placeholder="What needs to be done?"
                        required
                    />
                </div>
                <div class="grid gap-3">
                    <Label for="dueDate">Due Date</Label>
                    <input
                        type="hidden"
                        name="due_at"
                        value={newTaskDate
                            ? newTaskDate
                                  .toDate(getLocalTimeZone())
                                  .toISOString()
                                  .split("T")[0]
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
                                        ? newTaskDate
                                              .toDate(getLocalTimeZone())
                                              .toLocaleDateString()
                                        : "Select a date"}
                                    <ChevronDownIcon class="opacity-50" />
                                </Button>
                            {/snippet}
                        </Popover.Trigger>
                        <Popover.Content
                            class="w-auto overflow-hidden p-0"
                            align="start"
                        >
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
                        <Button {...props} variant="outline" type="button"
                            >Cancel</Button
                        >
                    {/snippet}
                </Dialog.Close>
                <Button type="submit">Save</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
