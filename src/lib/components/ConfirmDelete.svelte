<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Trash2Icon, TriangleAlertIcon } from "@lucide/svelte";

    let {
        open = $bindable(false),
        title = "Delete task",
        description = "This action cannot be undone. Are you sure you want to permanently delete this?",
        confirmLabel = "Delete",
        cancelLabel = "Cancel",
        onconfirm,
    }: {
        open: boolean;
        title?: string;
        description?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onconfirm: () => void;
    } = $props();

    function handleConfirm() {
        onconfirm();
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[400px]">
        <Dialog.Header>
            <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
                <TriangleAlertIcon class="size-6 text-destructive" />
            </div>
            <Dialog.Title class="text-center">{title}</Dialog.Title>
            <Dialog.Description class="text-center">
                {description}
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-4">
            <Button variant="outline" onclick={() => (open = false)}>
                {cancelLabel}
            </Button>
            <Button variant="destructive" onclick={handleConfirm} class="gap-1.5">
                <Trash2Icon class="size-4" />
                {confirmLabel}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
