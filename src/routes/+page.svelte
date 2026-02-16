<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Calendar, Day } from "$lib/components/ui/calendar";
    import * as Item from "$lib/components/ui/item";
    import { cn } from "tailwind-variants";
    import Button from "$lib/components/ui/button/button.svelte";
    import { ArrowRightIcon } from "@lucide/svelte";
    import { getLocale } from "$lib/paraglide/runtime";
    import { CalendarDate, isWeekend } from "@internationalized/date";

    const tasks = [
        {
            id: 1,
            title: "Design system",
            date: "2026-02-15",
            status: "in progress",
        },
        { id: 2, title: "API integration", date: "2026-02-17", status: "todo" },
        { id: 3, title: "Write docs", date: "2026-02-14", status: "complete" },
        { id: 4, title: "Testing", date: "2026-02-18", status: "in progress" },
        { id: 5, title: "Deploy", date: "2026-02-20", status: "todo" },
        { id: 6, title: "User acceptance", date: "2026-02-15", status: "todo" },
    ];

    const taskDates = new Set(tasks.map(task => task.date));
</script>

<div class="mx-auto text-center">
    <h1 class="font-bold text-xl">{m.hello_world({ name: "John PGCC" })}</h1>
    <p>
        {m.due_assignments({ count: tasks.length })}
    </p>
    <div class="grid grid-cols-3 justify-center">
        <div class="flex justify-end w-full px-4">
            <Calendar type="single" locale={getLocale()} >
                {#snippet day({ day, outsideMonth })}
                    {@const dayIsWeekend = isWeekend(day, "en-US")}
                    <Day class="flex flex-col items-center p-4 group data-selected:text-accent-foreground!">
                      {day.day}
                            {#if taskDates.has(day.toString())}
                        <div class="rounded-full bg-primary group-hover:bg-primary! group-data-focused:bg-accent-foreground h-1 w-1">
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
        <div class="text-left">
            {#each tasks as task}
                <Item.Root class="mb-2" variant="outline">
                    <Item.Content>
                        <Item.Title class="font-medium">{task.title}</Item.Title
                        >
                        <Item.Description class="text-sm text-gray-500"
                            >{task.date}</Item.Description
                        >
                    </Item.Content>
                    <Item.Actions>
                        <Button variant="ghost">
                            <ArrowRightIcon />
                        </Button>
                    </Item.Actions>
                </Item.Root>
            {/each}
        </div>
        <div></div>
    </div>
</div>
