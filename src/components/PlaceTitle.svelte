<script>
    import { CLASSES } from '../constants.js';
    export let item;
</script>

{item.title}&nbsp;{#if item.class}
    {#if CLASSES[item.class]?.emoji}
        {CLASSES[item.class]?.emoji}
    {:else}
        <span class="text-xs">{item.class}</span>
    {/if}
{/if}