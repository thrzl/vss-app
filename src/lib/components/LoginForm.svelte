<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import {
        Field,
        FieldGroup,
        FieldLabel,
        FieldDescription,
    } from "$lib/components/ui/field/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { cn } from "$lib/utils.js";
    import { fadeInScale, fadeIn, popIn } from "$lib/motion";
    import type { HTMLAttributes } from "svelte/elements";
    import {
        ShieldCheckIcon,
        LoaderCircleIcon,
        KeyRoundIcon,
        SmartphoneIcon,
    } from "@lucide/svelte";
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import QRCode from "qrcode";

    let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
        $props();

    const PGCC_DOMAIN = "pgcc.edu";

    // Form state
    let email = $state("");
    let code = $state("");
    let loading = $state(false);
    let qrDataUrl = $state<string | null>(null);

    // Derive step and error from the form action response
    const form = $derived(page.form);
    const step = $derived<"email" | "totp" | "setup">(form?.step ?? "email");
    const formEmail = $derived(form?.email ?? "");
    const errorMessage = $derived(form?.message ?? null);
    const totpUri = $derived(form?.totpUri ?? null);
    const totpSecret = $derived(form?.totpSecret ?? null);

    // Keep email in sync when server sends it back
    $effect(() => {
        if (formEmail) {
            email = formEmail;
        }
    });

    // Generate QR code when we get a TOTP URI
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

    // Reset loading after form submission completes
    $effect(() => {
        // Whenever form data changes, the submission is done
        if (form !== undefined) {
            loading = false;
        }
    });

    // Validate email domain
    function isValidPGCCEmail(emailAddress: string): boolean {
        const trimmed = emailAddress.trim().toLowerCase();
        return trimmed.endsWith(PGCC_DOMAIN);
    }

    const isValidEmail = $derived(email.length > 0 && isValidPGCCEmail(email));

    function handleStartOver() {
        email = "";
        code = "";
        qrDataUrl = null;
        // Clear form state by navigating to the same page
        // We reset step by clearing the form result
    }
</script>

<div class={cn("flex flex-col gap-6 content-center", className)} {...restProps}>
    <div use:fadeInScale={{ duration: 0.5, scale: 0.94 }}>
        <Card.Root class="overflow-hidden p-0 w-full md:w-lg mx-auto">
            <Card.Content class="p-6 md:p-8">
                {#if step === "setup"}
                    <!-- TOTP Setup: show QR code + confirm code -->
                    <div use:fadeIn={{ duration: 0.45, y: 12 }}>
                        <form
                            method="POST"
                            action="?/verify_setup"
                            use:enhance={() => {
                                loading = true;
                                return async ({ update }) => {
                                    await update();
                                    loading = false;
                                };
                            }}
                        >
                            <input type="hidden" name="email" value={email} />
                            <input
                                type="hidden"
                                name="totp_secret"
                                value={totpSecret}
                            />

                            <FieldGroup>
                                <div
                                    class="flex flex-col items-center gap-2 text-center"
                                >
                                    <div
                                        class="rounded-full bg-primary/10 p-3"
                                        use:popIn={{ delay: 0.15 }}
                                    >
                                        <SmartphoneIcon
                                            class="h-6 w-6 text-primary"
                                        />
                                    </div>
                                    <h1 class="text-2xl font-bold">
                                        set up authenticator
                                    </h1>
                                    <p
                                        class="text-muted-foreground text-balance text-sm"
                                    >
                                        Scan this QR code with your
                                        authenticator app (Google Authenticator,
                                        Authy, etc.), then enter the 6-digit
                                        code to confirm.
                                    </p>
                                </div>

                                {#if qrDataUrl}
                                    <div
                                        class="flex justify-center py-2"
                                        use:popIn={{ delay: 0.2 }}
                                    >
                                        <img
                                            src={qrDataUrl}
                                            alt="TOTP QR Code"
                                            class="rounded-lg border"
                                            width="200"
                                            height="200"
                                        />
                                    </div>
                                {/if}

                                {#if totpSecret}
                                    <div class="text-center">
                                        <p
                                            class="text-xs text-muted-foreground"
                                        >
                                            Can't scan? Enter this key manually:
                                        </p>
                                        <code
                                            class="text-xs font-mono bg-muted px-2 py-1 rounded select-all"
                                        >
                                            {totpSecret}
                                        </code>
                                    </div>
                                {/if}

                                <Field>
                                    <FieldLabel for="setup-code"
                                        >verification code</FieldLabel
                                    >
                                    <Input
                                        id="setup-code"
                                        name="code"
                                        type="text"
                                        inputmode="numeric"
                                        autocomplete="one-time-code"
                                        placeholder="000000"
                                        maxlength={6}
                                        bind:value={code}
                                        required
                                        disabled={loading}
                                    />
                                </Field>

                                {#if errorMessage}
                                    <p
                                        class="text-sm text-destructive text-center"
                                    >
                                        {errorMessage}
                                    </p>
                                {/if}

                                <Field>
                                    <Button
                                        type="submit"
                                        class="w-full"
                                        disabled={loading || code.length < 6}
                                    >
                                        {#if loading}
                                            <LoaderCircleIcon
                                                class="animate-spin"
                                            />
                                            verifying…
                                        {:else}
                                            confirm & sign in
                                        {/if}
                                    </Button>
                                </Field>

                                <p
                                    class="text-sm text-muted-foreground text-center"
                                >
                                    <a
                                        href="/login"
                                        class="underline hover:text-foreground transition-colors"
                                        onclick={handleStartOver}
                                    >
                                        start over
                                    </a>
                                </p>
                            </FieldGroup>
                        </form>
                    </div>
                {:else if step === "totp"}
                    <!-- TOTP Verification: existing user enters code -->
                    <div use:fadeIn={{ duration: 0.45, y: 12 }}>
                        <form
                            method="POST"
                            action="?/login"
                            use:enhance={() => {
                                loading = true;
                                return async ({ update }) => {
                                    await update();
                                    loading = false;
                                };
                            }}
                        >
                            <input type="hidden" name="email" value={email} />

                            <FieldGroup>
                                <div
                                    class="flex flex-col items-center gap-2 text-center"
                                >
                                    <div
                                        class="rounded-full bg-primary/10 p-3"
                                        use:popIn={{ delay: 0.15 }}
                                    >
                                        <ShieldCheckIcon
                                            class="h-6 w-6 text-primary"
                                        />
                                    </div>
                                    <h1 class="text-2xl font-bold">
                                        enter your code
                                    </h1>
                                    <p
                                        class="text-muted-foreground text-balance text-sm"
                                    >
                                        Open your authenticator app and enter
                                        the 6-digit code for
                                        <span
                                            class="font-medium text-foreground"
                                            >{email}</span
                                        >.
                                    </p>
                                </div>

                                <Field>
                                    <FieldLabel for="totp-code"
                                        >verification code</FieldLabel
                                    >
                                    <Input
                                        id="totp-code"
                                        name="code"
                                        type="text"
                                        inputmode="numeric"
                                        autocomplete="one-time-code"
                                        placeholder="000000"
                                        maxlength={6}
                                        bind:value={code}
                                        required
                                        disabled={loading}
                                    />
                                </Field>

                                {#if errorMessage}
                                    <p
                                        class="text-sm text-destructive text-center"
                                    >
                                        {errorMessage}
                                    </p>
                                {/if}

                                <Field>
                                    <Button
                                        type="submit"
                                        class="w-full"
                                        disabled={loading || code.length < 6}
                                    >
                                        {#if loading}
                                            <LoaderCircleIcon
                                                class="animate-spin"
                                            />
                                            verifying…
                                        {:else}
                                            <KeyRoundIcon />
                                            sign in
                                        {/if}
                                    </Button>
                                </Field>

                                <p
                                    class="text-sm text-muted-foreground text-center"
                                >
                                    <a
                                        href="/login"
                                        class="underline hover:text-foreground transition-colors"
                                        onclick={handleStartOver}
                                    >
                                        use a different email
                                    </a>
                                </p>
                            </FieldGroup>
                        </form>
                    </div>
                {:else}
                    <!-- Email entry state -->
                    <form
                        method="POST"
                        action="?/lookup"
                        use:enhance={() => {
                            loading = true;
                            return async ({ update }) => {
                                await update();
                                loading = false;
                            };
                        }}
                        use:fadeIn={{ duration: 0.4, delay: 0.15, y: 10 }}
                    >
                        <FieldGroup>
                            <div
                                class="flex flex-col items-center gap-2 text-center"
                            >
                                <h1 class="text-2xl font-bold">
                                    welcome to fojo
                                </h1>
                                <p class="text-muted-foreground text-balance">
                                    enter your email to sign in or create an
                                    account
                                </p>
                            </div>

                            <Field>
                                <FieldLabel for="email">email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="rsurebrec1234@pgcc.edu"
                                    bind:value={email}
                                    required
                                    disabled={loading}
                                    autocomplete="email"
                                />
                            </Field>

                            {#if errorMessage}
                                <p class="text-sm text-destructive text-center">
                                    {errorMessage}
                                </p>
                            {/if}

                            <Field>
                                <Button
                                    type="submit"
                                    class="w-full"
                                    disabled={loading || !isValidEmail}
                                >
                                    {#if loading}
                                        <LoaderCircleIcon
                                            class="animate-spin"
                                        />
                                        checking…
                                    {:else}
                                        continue
                                    {/if}
                                </Button>
                            </Field>
                            {#if email.length > 0 && email.includes("@") && !isValidEmail}
                                <p
                                    class="text-sm text-muted-foreground text-center"
                                >
                                    must be a pgcc.edu email address
                                </p>
                            {/if}
                        </FieldGroup>
                    </form>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>

    <div use:fadeIn={{ duration: 0.4, delay: 0.3, y: 8 }}>
        <FieldDescription class="px-6 text-center">
            by continuing, you agree to our <a
                href="##"
                class="underline hover:text-foreground">terms of service</a
            >
            and
            <a href="##" class="underline hover:text-foreground"
                >privacy policy</a
            >.
        </FieldDescription>
    </div>
</div>
