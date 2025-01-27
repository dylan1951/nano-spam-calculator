<script lang="ts">
    import {tick} from "svelte";
    import {formatCooldown} from "../utils/format";
    import {hardwareOptions} from "../hardware";

    let selectedHardwareIndex = 0; // Default hardware selection

    export let totalCPS = 100;
    export let cooldownSecs = 10;

    export let hardware = hardwareOptions[0];

    $: numHardware = Math.ceil(totalCPS / hardware.txPerSec);

    let editingCPS = false;
    let editingCooldown = false;

    // We'll capture a reference to the CPS input using bind:this
    let inputElement: HTMLInputElement | null = null;
    let cooldownInputElement: HTMLInputElement | null = null;

    async function enterEditMode() {
        editingCPS = true;      // Switch to editing mode
        await tick();           // Wait for the DOM to update
        if (inputElement) {
            inputElement.focus(); // Focus the newly rendered input
            inputElement.select(); // (Optional) Select its text
        }
    }

    function exitEditMode() {
        editingCPS = false;     // Return to button mode
    }

    async function enterCooldownEditMode() {
        editingCooldown = true;
        await tick();
        if (cooldownInputElement) {
            cooldownInputElement.focus();
            cooldownInputElement.select();
        }
    }

    function exitCooldownEditMode() {
        editingCooldown = false;
    }
</script>

<style>
    .slider-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
    }

    .slider-label {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        font-weight: 500;
        color: #343a40;
        justify-content: center; /* Center-aligns everything */
        padding: 0;
        margin: 0;
    }

    .edit-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        font: inherit;
        text-align: center;
    }

    .info-panel {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #dee2e6;
    }

    .info-panel h3 {
        font-size: 1.1rem;
        margin: 0 0 0.75rem 0;
        color: #343a40;
    }

    .info-panel p {
        font-size: 0.85rem;
        margin: 0 0 0.5rem 0;
        color: #6c757d;
        line-height: 1.4;
    }

    .tip {
        margin-top: 1rem;
        padding: 0.5rem;
        background: #e9ecef;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #495057;
    }

    .controls {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 12px;
    }

    .slider-label {
        display: block;
        font-weight: 500;
        color: #343a40;
        font-size: 0.9rem;
    }
</style>

<div class="controls">
    <div class="info-panel">
        <h3>Nano Spammer Calculator</h3>
        <p>This calculator is for exploring the affects of different network parameters on a spammers ability to
            stall transactions and bloat the ledger.</p>

        <div class="tip">
            <strong>Tip:</strong> Use shift-click to select multiple buckets at once.
        </div>
    </div>

    <div class="slider-group">
        <!-- Label + Editable CPS + Tooltip -->
        <label class="slider-label">
            Network CPS:
            {#if editingCPS}
                <input
                        type="number"
                        bind:value={totalCPS}
                        bind:this={inputElement}
                        on:blur={exitEditMode}
                        on:keydown={(e) => e.key === 'Enter' && exitEditMode()}
                        style="width: 50px; text-align: center;"
                />
            {:else}
                <button
                        class="edit-button"
                        type="button"
                        on:click={enterEditMode}
                >
                    {totalCPS}
                </button>
            {/if}

            <!-- Tooltip Trigger -->
            <span class="tooltip-trigger">
      <span class="info-icon">?</span>
      <span class="tooltip">
        Transaction confirmations/second capacity of the network
      </span>
    </span>
        </label>

        <!-- Slider -->
        <input
                bind:value={totalCPS}
                max="1000"
                min="1"
                type="range"
        />
    </div>

    <div class="slider-group">
        <!-- Label + Editable Cooldown + Tooltip -->
        <label class="slider-label">
            Cooldown Period:
            {#if editingCooldown}
                <input
                        type="number"
                        bind:value={cooldownSecs}
                        bind:this={cooldownInputElement}
                        on:blur={exitCooldownEditMode}
                        on:keydown={(e) => e.key === 'Enter' && exitCooldownEditMode()}
                        style="width: 50px; text-align: center;"
                />
            {:else}
                <button
                        class="edit-button"
                        type="button"
                        on:click={enterCooldownEditMode}
                >
                    {formatCooldown(cooldownSecs)}
                </button>
            {/if}

            <!-- Tooltip -->
            <span class="tooltip-trigger">
      <span class="info-icon">?</span>
      <span class="tooltip">
        The minimum wait period between transactions caused by the attack for all accounts.
      </span>
    </span>
        </label>

        <!-- Slider below the label -->
        <input
                bind:value={cooldownSecs}
                max="3600"
                min="1"
                step="1"
                type="range"
        />
    </div>

    <div class="slider-group">
        <label class="slider-label" for="hardware-slider">
          <span class="tooltip-trigger">
            {numHardware} x {hardware.name}
              <span class="info-icon">?</span>
            <span class="tooltip">
              Some hardware is more efficient than others.
            </span>
          </span>
        </label>
        <input
                bind:value={selectedHardwareIndex}
                id="hardware-slider"
                max={hardwareOptions.length - 1}
                min="0"
                step="1"
                type="range"
        />
    </div>

</div>
