<script lang="ts">
    import { startOfMonth, endOfMonth, startOfWeek } from "date-fns";
    import { Button } from "$lib/components/ui/button/index";
    import { cn } from "$lib/utils";
    import { getLocale } from "$lib/paraglide/runtime";

    // Mock tasks – replace with props later
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

    let view: "month" | "week" = $state("month");
    let selectedDate = $state<Date | null>(null);

    // Color map for status dots
    const statusColor: Record<string, string> = {
        todo: "bg-gray-500",
        "in progress": "bg-blue-500",
        complete: "bg-green-500",
    };

    // Get tasks for a specific date (expects CalendarDate)
    function getTasksForDate(date: CalendarDate) {
        const dateStr = date.toString();
        return tasks.filter((t) => t.date === dateStr);
    }

    // Build a month grid: array of weeks, each week =7 days (null for padding)
    function buildMonthGrid(month: CalendarDate) {
        const monthStart = startOfMonth(month);
        const startWeekday = getDayOfWeek(monthStart, getLocale()); // 1=Mon ... 7=Sun (ISO)
        const daysInMonth = endOfMonth(month).day;
        const grid: (CalendarDate | null)[][] = [];
        let week: (CalendarDate | null)[] = [];
        // pad days before first of month
        for (let i = 1; i < startWeekday; i++) {
            week.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            week.push(new CalendarDate(month.year, month.month, day));
            if (week.length === 7) {
                grid.push(week);
                week = [];
            }
        }
        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            grid.push(week);
        }
        return grid;
    }

    // Computed month grid based on selectedDate (or today)
    $: currentMonth = selectedDate || new CalendarDate(new Date());
    $: monthGrid = buildMonthGrid(currentMonth);

    // For week view: compute week starting Monday
    $: weekStart = startOfWeek(selectedDate || new CalendarDate(new Date()));
    $: weekDays = Array.from({ length: 7 }, (_, i) =>
        addDays(weekStart.add(), i),
    );
</script>

<div class="p-4 max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Project Calendar</h2>
        <div class="space-x-2">
            <Button
                variant={view === "month" ? "default" : "outline"}
                onclick={() => (view = "month")}
            >
                Month
            </Button>
            <Button
                variant={view === "week" ? "default" : "outline"}
                onclick={() => (view = "week")}
            >
                Week
            </Button>
        </div>
    </div>

    {#if view === "month"}
        <!-- weekday headers -->
        <div class="grid grid-cols-7 gap-2 mb-2">
            {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as name}
                <div class="text-center text-sm font-medium text-gray-500">
                    {name}
                </div>
            {/each}
        </div>
        <!-- month grid -->
        <div class="grid grid-cols-7 gap-2">
            {#each monthGrid as week}
                {#each week as day}
                    {@const dayTasks = day ? getTasksForDate(day) : []}
                    <div
                        class={cn(
                            "border rounded p-2 min-h-24",
                            day &&
                                selectedDate &&
                                day.compare(selectedDate) === 0 &&
                                "ring-2 ring-blue-500",
                        )}
                        onclick={() => day && (selectedDate = day)}
                    >
                        {#if day}
                            <div class="font-medium text-sm text-right">
                                {day.day}
                            </div>
                            <div
                                class="flex flex-wrap gap-0.5 mt-1 justify-end"
                            >
                                {#each dayTasks.slice(0, 3) as task}
                                    <span
                                        class={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            statusColor[task.status],
                                        )}
                                        title={task.title}
                                    ></span>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            {/each}
        </div>

        <!-- selected day's task list -->
        {#if selectedDate}
            {@const selectedTasks = getTasksForDate(selectedDate)}
            <div class="mt-6 border-t pt-4">
                <h3 class="font-medium mb-2">
                    Tasks for {selectedDate.toString()}
                </h3>
                {#if selectedTasks.length === 0}
                    <p class="text-gray-500 text-sm">No tasks scheduled.</p>
                {:else}
                    <ul class="space-y-2">
                        {#each selectedTasks as task (task.id)}
                            <li class="flex items-center gap-2">
                                <span
                                    class={cn(
                                        "w-2 h-2 rounded-full",
                                        statusColor[task.status],
                                    )}
                                ></span>
                                <span>{task.title}</span>
                                <span class="text-gray-500 text-sm ml-auto"
                                    >{task.date}</span
                                >
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/if}
    {:else}
        <!-- Week view -->
        <div class="grid grid-cols-7 gap-2">
            {#each weekDays as day}
                {@const dayTasks = getTasksForDate(day)}
                <div class="border rounded p-2 min-h-32">
                    <div class="font-medium text-sm mb-2 text-right">
                        {day.toLocaleString("en-US", { weekday: "short" })}
                        {day.day}
                    </div>
                    {#if dayTasks.length > 0}
                        <ul class="space-y-1">
                            {#each dayTasks as task}
                                <li
                                    class={cn(
                                        "text-xs p-1 rounded",
                                        task.status === "todo" && "bg-gray-100",
                                        task.status === "in progress" &&
                                            "bg-blue-50",
                                        task.status === "complete" &&
                                            "bg-green-50",
                                    )}
                                >
                                    <span
                                        class={cn(
                                            "w-1.5 h-1.5 rounded-full inline-block mr-1",
                                            statusColor[task.status],
                                        )}
                                    ></span>
                                    {task.title}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <div class="text-gray-400 text-xs">No tasks</div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>
