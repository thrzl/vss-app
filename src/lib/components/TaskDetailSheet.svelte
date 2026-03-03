<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { tick } from "svelte";
    import * as Sheet from "$lib/components/ui/sheet";
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        CalendarIcon,
        GraduationCapIcon,
        ExternalLinkIcon,
        PencilIcon,
        ClockIcon,
    } from "@lucide/svelte";
    import type { Task } from "$lib/schema";

    let {
        task = $bindable<Task | null>(null),
        open = $bindable(false),
        onEdit,
        formatDue,
    }: {
        task: Task | null;
        open: boolean;
        onEdit: (task: Task) => void;
        formatDue: (due: string | null) => string;
    } = $props();

    let contentEl = $state<HTMLElement | null>(null);

    $effect(() => {
        if (task) {
            tick().then(() =>
                requestAnimationFrame(() => contentEl?.scrollTo({ top: 0 })),
            );
        }
    });

    $effect(() => {
        if (!open) {
            task = null;
        }
    });

    function handleEdit() {
        if (task) {
            open = false;
            onEdit(task);
        }
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content
        side="right"
        class="sm:max-w-md overflow-y-auto"
        bind:ref={contentEl}
    >
        {#if task}
            <Sheet.Header class="text-left">
                <Sheet.Title class="text-lg font-semibold leading-snug pr-6">
                    {task.title}
                </Sheet.Title>
                <Sheet.Description class="sr-only">
                    {m.task_detail_description()}
                </Sheet.Description>
            </Sheet.Header>

            <div class="flex flex-col gap-5 px-4 pb-4">
                <!-- Badges row -->
                <div class="flex flex-wrap items-center gap-2">
                    {#if task.source === "canvas"}
                        <span
                            class="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400"
                        >
                            <GraduationCapIcon class="size-3" />
                            {m.task_source_canvas()}
                        </span>
                    {:else}
                        <span
                            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                            {m.task_source_manual()}
                        </span>
                    {/if}

                    {#if (task.status ?? 0) === 1}
                        <span
                            class="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
                        >
                            ✓ {m.tab_completed()}
                        </span>
                    {/if}
                </div>

                <!-- Canvas sync notice -->
                {#if task.source === "canvas" && task.canvasDescription}
                    <div
                        class="rounded-md border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-600 dark:text-orange-400 flex items-start gap-2"
                    >
                        <GraduationCapIcon class="size-3.5 mt-0.5 shrink-0" />
                        <span>{m.task_detail_synced_from_canvas()}</span>
                    </div>
                {/if}

                <!-- Description -->
                <div class="space-y-1.5">
                    <h3
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                        {m.description_label()}
                    </h3>
                    {#if task.description}
                        <div
                            class="text-sm leading-relaxed whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3"
                        >
                            {task.description}
                        </div>
                    {:else}
                        <p class="text-sm text-muted-foreground italic">
                            {m.no_description()}
                        </p>
                    {/if}
                </div>

                <!-- Metadata -->
                <div class="space-y-2">
                    {#if task.dueAt}
                        <div
                            class="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                            <CalendarIcon class="size-3.5" />
                            <span
                                >{m.due_date_label()}: {formatDue(
                                    task.dueAt,
                                )}</span
                            >
                        </div>
                    {/if}
                    {#if task.createdAt}
                        <div
                            class="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                            <ClockIcon class="size-3.5" />
                            <span
                                >{m.task_detail_created({
                                    date: formatDue(task.createdAt),
                                })}</span
                            >
                        </div>
                    {/if}
                </div>

                <!-- Canvas link -->
                {#if task.source === "canvas" && task.url}
                    <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLinkIcon class="size-3.5" />
                        {m.task_detail_view_on_canvas()}
                    </a>
                {/if}
            </div>

            <Sheet.Footer>
                {#if (task.status ?? 0) === 0}
                    <Button onclick={handleEdit} class="w-full gap-1.5">
                        <PencilIcon class="size-4" />
                        {m.task_detail_edit()}
                    </Button>
                {/if}
            </Sheet.Footer>
        {/if}
    </Sheet.Content>
</Sheet.Root>
