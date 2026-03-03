<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import * as Card from "$lib/components/ui/card";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import {
        fadeIn,
        fadeInScale,
        slideIn,
    } from "$lib/motion";
    import {
        UserIcon,
        MailIcon,
        ShieldCheckIcon,
        LoaderCircleIcon,
        SmartphoneIcon,
        CheckCircle2Icon,
        KeyRoundIcon,
        GraduationCapIcon,
        RefreshCwIcon,
        LinkIcon,
        UnlinkIcon,
        CheckIcon,
        AlertCircleIcon,
    } from "@lucide/svelte";
    import QRCode from "qrcode";

    let { data } = $props();
    const user = $derived(data.user);
    const canvas = $derived(data.canvas);

    // Form state
    const form = $derived(page.form);

    // Name editing
    let nameValue = $state("");
    let nameLoading = $state(false);
    const nameSuccess = $derived(
        form?.action === "update_name" && form?.success === true,
    );
    const nameError = $derived(
        form?.action === "update_name" && form?.message ? form.message : null,
    );

    // TOTP rotation
    let totpDialogOpen = $state(false);
    let totpCode = $state("");
    let totpLoading = $state(false);
    let qrDataUrl = $state<string | null>(null);

    const totpStep = $derived<"idle" | "confirm" | "done">(
        form?.action === "rotate_totp" && form?.step === "confirm"
            ? "confirm"
            : form?.action === "rotate_totp" && form?.step === "done"
              ? "done"
              : "idle",
    );
    const totpUri = $derived(
        form?.action === "rotate_totp" ? form?.totpUri ?? null : null,
    );
    const totpSecret = $derived(
        form?.action === "rotate_totp" ? form?.totpSecret ?? null : null,
    );
    const totpError = $derived(
        form?.action === "rotate_totp" && form?.message ? form.message : null,
    );

    // Keep name in sync when user changes
    $effect(() => {
        if (user?.name) {
            nameValue = user.name;
        }
    });

    // Canvas integration
    let canvasUrl = $state("");
    let canvasToken = $state("");
    let canvasConnecting = $state(false);
    let canvasSyncing = $state(false);
    let canvasDisconnecting = $state(false);

    const canvasConnectSuccess = $derived(
        form?.action === "canvas_connect" && form?.success === true,
    );
    const canvasDisconnectSuccess = $derived(
        form?.action === "canvas_disconnect" && form?.success === true,
    );
    const canvasSyncSuccess = $derived(
        form?.action === "canvas_sync" && form?.success === true,
    );
    const canvasSyncResult = $derived(
        form?.action === "canvas_sync" && form?.success ? form?.result : null,
    );
    const canvasError = $derived(
        (form?.action === "canvas_connect" ||
            form?.action === "canvas_disconnect" ||
            form?.action === "canvas_sync") &&
            form?.message
            ? form.message
            : null,
    );

    // Reset loading states when form response arrives
    $effect(() => {
        if (form !== undefined) {
            nameLoading = false;
            totpLoading = false;
            canvasConnecting = false;
            canvasSyncing = false;
            canvasDisconnecting = false;
        }
    });

    // Clear Canvas form fields on successful connect
    $effect(() => {
        if (canvasConnectSuccess) {
            canvasUrl = "";
            canvasToken = "";
        }
    });

    // Generate QR code when TOTP URI is received
    $effect(() => {
        if (totpUri) {
            QRCode.toDataURL(totpUri, { width: 200, margin: 2 }).then(
                (url: string) => {
                    qrDataUrl = url;
                },
            );
        } else {
            qrDataUrl = null;
        }
    });

    // Open dialog when TOTP step becomes confirm
    $effect(() => {
        if (totpStep === "confirm") {
            totpDialogOpen = true;
        }
    });

    // Close dialog on success and reset
    $effect(() => {
        if (totpStep === "done") {
            setTimeout(() => {
                totpDialogOpen = false;
                totpCode = "";
                qrDataUrl = null;
            }, 1500);
        }
    });

    function formatSyncDate(iso: string | null): string {
        if (!iso) return m.settings_canvas_never_synced();
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }
</script>

<svelte:head>
    <title>{m.settings_page_title()} — fojo</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-8">
    <!-- Header -->
    <div use:fadeIn={{ duration: 0.5, y: 14 }}>
        <h1 class="text-3xl font-bold leading-tight">
            {m.settings_page_title()}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
            {m.settings_subtitle()}
        </p>
    </div>

    <!-- Profile section -->
    <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.1, distance: 20 }}>
        <Card.Root class="shadow-none">
            <Card.Header>
                <div class="flex items-center gap-2">
                    <div class="inline-flex items-center justify-center rounded-lg p-1.5 bg-primary/10">
                        <UserIcon class="size-4 text-primary" />
                    </div>
                    <Card.Title class="text-base">{m.settings_profile_heading()}</Card.Title>
                </div>
            </Card.Header>
            <Card.Content class="space-y-6">
                <!-- Email (read-only) -->
                <div class="grid gap-2">
                    <Label class="flex items-center gap-1.5">
                        <MailIcon class="size-3.5 text-muted-foreground" />
                        {m.settings_email_label()}
                    </Label>
                    <Input
                        value={user?.email ?? ""}
                        disabled
                        class="bg-muted/50 cursor-not-allowed"
                    />
                    <p class="text-xs text-muted-foreground">
                        {m.settings_email_hint()}
                    </p>
                </div>

                <!-- Name (editable) -->
                <form
                    method="POST"
                    action="?/update_name"
                    use:enhance={() => {
                        nameLoading = true;
                        return async ({ update }) => {
                            await update();
                        };
                    }}
                    class="grid gap-2"
                >
                    <Label for="settings-name" class="flex items-center gap-1.5">
                        <UserIcon class="size-3.5 text-muted-foreground" />
                        {m.settings_name_label()}
                    </Label>
                    <div class="flex gap-2">
                        <Input
                            id="settings-name"
                            name="name"
                            bind:value={nameValue}
                            placeholder={m.settings_name_placeholder()}
                            class="flex-1"
                            required
                            maxlength={100}
                        />
                        <Button
                            type="submit"
                            disabled={nameLoading || nameValue.trim() === user?.name}
                            class="shrink-0"
                        >
                            {#if nameLoading}
                                <LoaderCircleIcon class="size-4 animate-spin" />
                            {:else}
                                {m.save()}
                            {/if}
                        </Button>
                    </div>
                    {#if nameSuccess}
                        <p class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2Icon class="size-3" />
                            {m.settings_name_updated()}
                        </p>
                    {/if}
                    {#if nameError}
                        <p class="text-xs text-destructive">{nameError}</p>
                    {/if}
                </form>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Security section -->
    <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.2, distance: 20 }}>
        <Card.Root class="shadow-none">
            <Card.Header>
                <div class="flex items-center gap-2">
                    <div class="inline-flex items-center justify-center rounded-lg p-1.5 bg-violet-500/10">
                        <ShieldCheckIcon class="size-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <Card.Title class="text-base">{m.settings_security_heading()}</Card.Title>
                </div>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div class="space-y-1">
                        <p class="text-sm font-medium">
                            {m.settings_totp_title()}
                        </p>
                        <p class="text-xs text-muted-foreground leading-relaxed max-w-sm">
                            {m.settings_totp_description()}
                        </p>
                    </div>
                    <form
                        method="POST"
                        action="?/rotate_totp_start"
                        use:enhance={() => {
                            totpLoading = true;
                            totpCode = "";
                            return async ({ update }) => {
                                await update();
                            };
                        }}
                    >
                        <Button variant="outline" type="submit" class="gap-2 shrink-0">
                            {#if totpLoading && totpStep === "idle"}
                                <LoaderCircleIcon class="size-4 animate-spin" />
                            {:else}
                                <KeyRoundIcon class="size-4" />
                            {/if}
                            {m.settings_totp_rotate()}
                        </Button>
                    </form>
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Canvas LMS section -->
    <div use:slideIn={{ from: "left", duration: 0.45, delay: 0.3, distance: 20 }}>
        <Card.Root class="shadow-none">
            <Card.Header>
                <div class="flex items-center gap-2">
                    <div class="inline-flex items-center justify-center rounded-lg p-1.5 bg-orange-500/10">
                        <GraduationCapIcon class="size-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <Card.Title class="text-base">{m.settings_canvas_heading()}</Card.Title>
                    {#if canvas.connected}
                        <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckIcon class="size-3" />
                            {m.settings_canvas_connected()}
                        </span>
                    {/if}
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                    {m.settings_canvas_description()}
                </p>
            </Card.Header>
            <Card.Content class="space-y-4">
                {#if canvas.connected}
                    <!-- Connected state -->
                    <div class="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="space-y-0.5">
                                <p class="text-sm font-medium">
                                    {m.settings_canvas_connected_to({ url: canvas.canvasUrl ?? "" })}
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    {m.settings_canvas_last_sync({ date: formatSyncDate(canvas.lastSyncAt) })}
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <form
                                method="POST"
                                action="?/canvas_sync"
                                use:enhance={() => {
                                    canvasSyncing = true;
                                    return async ({ update }) => {
                                        await update();
                                    };
                                }}
                            >
                                <Button variant="outline" type="submit" disabled={canvasSyncing} class="gap-2">
                                    {#if canvasSyncing}
                                        <LoaderCircleIcon class="size-4 animate-spin" />
                                        {m.settings_canvas_syncing()}
                                    {:else}
                                        <RefreshCwIcon class="size-4" />
                                        {m.settings_canvas_sync_now()}
                                    {/if}
                                </Button>
                            </form>
                            <form
                                method="POST"
                                action="?/canvas_disconnect"
                                use:enhance={() => {
                                    canvasDisconnecting = true;
                                    return async ({ update }) => {
                                        await update();
                                    };
                                }}
                            >
                                <Button variant="ghost" type="submit" disabled={canvasDisconnecting} class="gap-2 text-destructive hover:text-destructive">
                                    {#if canvasDisconnecting}
                                        <LoaderCircleIcon class="size-4 animate-spin" />
                                    {:else}
                                        <UnlinkIcon class="size-4" />
                                    {/if}
                                    {m.settings_canvas_disconnect()}
                                </Button>
                            </form>
                        </div>

                        {#if canvasSyncSuccess && canvasSyncResult}
                            <p class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2Icon class="size-3" />
                                {m.settings_canvas_sync_success({
                                    created: String(canvasSyncResult.created),
                                    updated: String(canvasSyncResult.updated),
                                    completed: String(canvasSyncResult.completed),
                                })}
                            </p>
                        {/if}
                        {#if canvasDisconnectSuccess}
                            <p class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2Icon class="size-3" />
                                {m.settings_canvas_disconnect_success()}
                            </p>
                        {/if}
                    </div>
                {:else}
                    <!-- Not connected — show connect form -->
                    <form
                        method="POST"
                        action="?/canvas_connect"
                        use:enhance={() => {
                            canvasConnecting = true;
                            return async ({ update }) => {
                                await update();
                            };
                        }}
                        class="space-y-4"
                    >
                        <div class="grid gap-2">
                            <Label for="canvas-url" class="flex items-center gap-1.5">
                                <LinkIcon class="size-3.5 text-muted-foreground" />
                                {m.settings_canvas_url_label()}
                            </Label>
                            <Input
                                id="canvas-url"
                                name="canvas_url"
                                bind:value={canvasUrl}
                                placeholder={m.settings_canvas_url_placeholder()}
                                required
                            />
                            <p class="text-xs text-muted-foreground">
                                {m.settings_canvas_url_hint()}
                            </p>
                        </div>

                        <div class="grid gap-2">
                            <Label for="canvas-token" class="flex items-center gap-1.5">
                                <KeyRoundIcon class="size-3.5 text-muted-foreground" />
                                {m.settings_canvas_token_label()}
                            </Label>
                            <Input
                                id="canvas-token"
                                name="api_token"
                                type="password"
                                bind:value={canvasToken}
                                placeholder={m.settings_canvas_token_placeholder()}
                                required
                            />
                            <p class="text-xs text-muted-foreground">
                                {m.settings_canvas_token_hint()}
                            </p>
                        </div>

                        {#if canvasConnectSuccess}
                            <p class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2Icon class="size-3" />
                                {m.settings_canvas_connect_success()}
                            </p>
                        {/if}

                        <Button type="submit" disabled={canvasConnecting || !canvasUrl || !canvasToken} class="gap-2">
                            {#if canvasConnecting}
                                <LoaderCircleIcon class="size-4 animate-spin" />
                                {m.settings_canvas_connecting()}
                            {:else}
                                <GraduationCapIcon class="size-4" />
                                {m.settings_canvas_connect()}
                            {/if}
                        </Button>
                    </form>
                {/if}

                {#if canvasError}
                    <div class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircleIcon class="size-3.5 shrink-0" />
                        {canvasError}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>
</div>

<!-- TOTP rotation dialog -->
<Dialog.Root bind:open={totpDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        {#if totpStep === "done"}
            <div
                class="flex flex-col items-center justify-center py-8 gap-3 text-center"
                use:fadeInScale={{ duration: 0.4, scale: 0.95 }}
            >
                <div class="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-3">
                    <CheckCircle2Icon class="size-8 text-emerald-500" />
                </div>
                <p class="font-semibold">{m.settings_totp_success_title()}</p>
                <p class="text-sm text-muted-foreground">
                    {m.settings_totp_success_body()}
                </p>
            </div>
        {:else}
            <form
                method="POST"
                action="?/rotate_totp_confirm"
                use:enhance={() => {
                    totpLoading = true;
                    return async ({ update }) => {
                        await update();
                    };
                }}
            >
                <input type="hidden" name="totp_secret" value={totpSecret ?? ""} />

                <Dialog.Header>
                    <Dialog.Title>{m.settings_totp_dialog_title()}</Dialog.Title>
                    <Dialog.Description>
                        {m.settings_totp_dialog_description()}
                    </Dialog.Description>
                </Dialog.Header>

                <div class="grid gap-4 py-4">
                    <!-- QR Code -->
                    {#if qrDataUrl}
                        <div class="flex justify-center" use:fadeInScale={{ duration: 0.4, scale: 0.9 }}>
                            <img
                                src={qrDataUrl}
                                alt={m.totp_qr_alt()}
                                class="rounded-lg border shadow-sm"
                                width="200"
                                height="200"
                            />
                        </div>
                    {/if}

                    <!-- Manual key -->
                    {#if totpSecret}
                        <div class="text-center">
                            <p class="text-xs text-muted-foreground mb-1">
                                {m.login_manual_key()}
                            </p>
                            <code
                                class="text-xs font-mono bg-muted px-2 py-1 rounded select-all break-all"
                            >
                                {totpSecret}
                            </code>
                        </div>
                    {/if}

                    <!-- Code input -->
                    <div class="grid gap-2">
                        <Label for="totp-rotate-code">{m.verification_code()}</Label>
                        <Input
                            id="totp-rotate-code"
                            name="code"
                            bind:value={totpCode}
                            placeholder="000000"
                            maxlength={6}
                            inputmode="numeric"
                            pattern="[0-9]*"
                            autocomplete="one-time-code"
                            class="text-center text-lg tracking-widest font-mono"
                            required
                        />
                    </div>

                    {#if totpError}
                        <p class="text-sm text-destructive text-center">{totpError}</p>
                    {/if}
                </div>

                <Dialog.Footer>
                    <Dialog.Close>
                        {#snippet child({ props })}
                            <Button {...props} variant="outline" type="button">
                                {m.cancel()}
                            </Button>
                        {/snippet}
                    </Dialog.Close>
                    <Button type="submit" disabled={totpLoading || totpCode.length < 6}>
                        {#if totpLoading}
                            <LoaderCircleIcon class="size-4 animate-spin mr-1.5" />
                            {m.verifying()}
                        {:else}
                            <SmartphoneIcon class="size-4 mr-1.5" />
                            {m.settings_totp_confirm_button()}
                        {/if}
                    </Button>
                </Dialog.Footer>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>
