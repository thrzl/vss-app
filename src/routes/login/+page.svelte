<script lang="ts">
    import LoginForm from "$lib/components/LoginForm.svelte";
    import { fadeIn } from "$lib/motion";
</script>

<div
    class="flex flex-col items-center justify-center p-6 md:p-10"
    use:fadeIn={{ duration: 0.5, y: 20 }}
>
    <div class="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
    </div>
</div>
