<script lang="ts">
    import { m } from "$lib/paraglide/messages";
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
    import { fadeInScale, fadeIn } from "$lib/motion";
    import type { HTMLAttributes } from "svelte/elements";
    import { LoaderCircleIcon, KeyRoundIcon } from "@lucide/svelte";
    import type {
        AuthenticationResponseJSON,
        PublicKeyCredentialCreationOptionsJSON,
        PublicKeyCredentialRequestOptionsJSON,
        RegistrationResponseJSON,
    } from "@simplewebauthn/server";

    let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
        $props();

    let email = $state("");
    let loading = $state(false);
    let authError = $state<string | null>(null);

    async function startPasskeyAuth(event: SubmitEvent): Promise<void> {
        event.preventDefault();

        authError = null;
        loading = true;

        try {
            const optionsResponse = await fetch("/auth/passkey/options", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const optionsPayload = (await optionsResponse.json()) as {
                mode?: "register" | "login";
                options?:
                    | PublicKeyCredentialCreationOptionsJSON
                    | PublicKeyCredentialRequestOptionsJSON;
                message?: string;
            };

            if (
                !optionsResponse.ok ||
                !optionsPayload.mode ||
                !optionsPayload.options
            ) {
                authError = m.login_passkey_start_failed();
                return;
            }

            const { startAuthentication, startRegistration } = await import(
                "@simplewebauthn/browser"
            );

            let credential:
                | RegistrationResponseJSON
                | AuthenticationResponseJSON;
            if (optionsPayload.mode === "register") {
                credential = await startRegistration({
                    optionsJSON:
                        optionsPayload.options as PublicKeyCredentialCreationOptionsJSON,
                });
            } else {
                credential = await startAuthentication({
                    optionsJSON:
                        optionsPayload.options as PublicKeyCredentialRequestOptionsJSON,
                });
            }

            const verifyResponse = await fetch("/auth/passkey/verify", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mode: optionsPayload.mode,
                    response: credential,
                }),
            });

            if (!verifyResponse.ok) {
                authError = m.login_passkey_verify_failed();
                return;
            }

            window.location.assign("/dashboard");
        } catch {
            authError = m.login_passkey_cancelled_or_failed();
        } finally {
            loading = false;
        }
    }
</script>

<div class={cn("flex flex-col gap-6 content-center", className)} {...restProps}>
    <div use:fadeInScale={{ duration: 0.5, scale: 0.94 }}>
        <Card.Root class="overflow-hidden p-0 w-full md:w-lg mx-auto">
            <Card.Content class="p-6 md:p-8">
                <form
                    onsubmit={startPasskeyAuth}
                    use:fadeIn={{ duration: 0.4, delay: 0.15, y: 10 }}
                >
                    <FieldGroup>
                        <div
                            class="flex flex-col items-center gap-2 text-center"
                        >
                            <div class="rounded-full bg-primary/10 p-3">
                                <KeyRoundIcon class="h-6 w-6 text-primary" />
                            </div>
                            <h1 class="text-2xl font-bold">
                                {m.login_welcome()}
                            </h1>
                            <p class="text-muted-foreground text-balance">
                                {m.login_passkey_intro()}
                            </p>
                        </div>

                        {#if authError}
                            <p class="text-sm text-destructive text-center">
                                {authError}
                            </p>
                        {/if}

                        <Field>
                            <FieldLabel for="email"
                                >{m.email_label()}</FieldLabel
                            >
                            <Input
                                id="email"
                                type="email"
                                required
                                autocomplete="username webauthn"
                                placeholder={m.email_placeholder()}
                                bind:value={email}
                            />
                        </Field>

                        <Field>
                            <Button
                                type="submit"
                                class="w-full"
                                disabled={loading}
                            >
                                {#if loading}
                                    <LoaderCircleIcon class="animate-spin" />
                                    {m.checking()}
                                {:else}
                                    {m.login_passkey_continue()}
                                {/if}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </Card.Content>
        </Card.Root>
    </div>

    <div use:fadeIn={{ duration: 0.4, delay: 0.3, y: 8 }}>
        <FieldDescription class="px-6 text-center">
            {m.terms_agreement()}
            <a href="##" class="underline hover:text-foreground"
                >{m.terms_of_service()}</a
            >
            {m.terms_and()}
            <a href="##" class="underline hover:text-foreground"
                >{m.privacy_policy()}</a
            >.
        </FieldDescription>
    </div>
</div>
