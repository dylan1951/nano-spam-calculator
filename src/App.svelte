<script lang="ts">
    import {tick} from "svelte";

    let minimums_list: bigint[] = [];
    let maximums_list: bigint[] = [];

    function buildRegion(begin: number, end: number, count: number): void {
        const regionMin = BigInt(1) << BigInt(begin);
        const regionMax = BigInt(1) << BigInt(end);
        const width = (regionMax - regionMin) / BigInt(count);

        for (let i = 0; i < count; i++) {
            const bucketMin = regionMin + width * BigInt(i);
            const bucketMax = regionMin + width * BigInt(i + 1);

            minimums_list.push(bucketMin);
            maximums_list.push(bucketMax);
        }
    }

    // Initialize the first big bucket 0 -> (1<<79)
    minimums_list.push(BigInt(0));
    maximums_list.push(BigInt(1) << BigInt(79));

    buildRegion(79, 88, 1);
    buildRegion(88, 92, 2);
    buildRegion(92, 96, 4);
    buildRegion(96, 100, 8);
    buildRegion(100, 104, 16);
    buildRegion(104, 108, 16);
    buildRegion(108, 112, 8);
    buildRegion(112, 116, 4);
    buildRegion(116, 120, 2);
    buildRegion(120, 128, 1);

    interface Bucket {
        index: number;
        minNano: number;
        maxNano: number;
        toggled: boolean;
    }

    let buckets: Bucket[] = minimums_list.map((minVal, i) => {
        const maxVal = maximums_list[i];
        const minNano = Number(minVal.toString()) / 1e30;
        const maxNano = Number(maxVal.toString()) / 1e30;

        return {
            index: i,
            minNano,
            maxNano,
            toggled: false,
        };
    });

    let totalCPS = 100;
    let cooldownSecs = 10;
    let lastToggledIndex = -1;

    const hardwareOptions = [
        {name: "GTX 1080", cost: 115, power: 150, txPerSec: 3.32},
        {name: "RTX 2080 Ti", cost: 350, power: 250, txPerSec: 5.48},
        {name: "Tesla V100", cost: 700, power: 300, txPerSec: 7.25},
        {name: "Tesla P100", cost: 350, power: 140, txPerSec: 3.63},
        {name: "200W ASIC (theoretical)", cost: 500, power: 200, txPerSec: 1200},
    ];

    let selectedHardwareIndex = 0; // Default hardware selection
    const electricityCostPerKWh = 0.14;

    function formatNano(nano: number): string {
        if (nano === 0) {
            return nano.toString();
        } else if (nano < 0.000001) {
            return `${(nano * 1e6).toFixed(4)}µ`;
        } else if (nano >= 1_000_000) {
            return `${(nano / 1_000_000).toFixed(2)}M`;
        } else if (nano >= 1000) {
            return `${(nano / 1000).toFixed(2)}k`;
        } else {
            return nano.toFixed(3);
        }
    }

    function formatNumber(num: number): string {
        if (num >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}k`;
        } else {
            return num.toFixed(2);
        }
    }

    function formatCooldown(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const remainingMinutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${remainingMinutes}m`;
        }
    }

    function handleBucketClick(index: number, event: MouseEvent): void {
        if (event.shiftKey && lastToggledIndex !== -1) {
            const start = Math.min(lastToggledIndex, index);
            const end = Math.max(lastToggledIndex, index);
            const newValue = !buckets[index].toggled;

            for (let i = start; i <= end; i++) {
                buckets[i].toggled = newValue;
            }
            buckets = [...buckets]; // Trigger reactivity
        } else {
            buckets[index].toggled = !buckets[index].toggled;
            lastToggledIndex = index;
            buckets = [...buckets];
        }
    }

    $: formattedCooldown = formatCooldown(cooldownSecs);

    $: selectedBuckets = buckets.filter((b) => b.toggled);
    $: accountsPerBucket = selectedBuckets.length
        ? (totalCPS / selectedBuckets.length) * cooldownSecs
        : 0;

    function getBucketInvestment(bucket: Bucket): number {
        return accountsPerBucket * bucket.minNano;
    }

    $: totalInvestment = selectedBuckets.reduce(
        (sum, bucket) => sum + accountsPerBucket * bucket.minNano,
        0
    );

    $: blocksPerDay = totalCPS * 24 * 60 * 60;
    $: gbPerDay = (blocksPerDay * 300) / (1024 * 1024 * 1024);

    const storageCostPerGB = 0.005;

    function calculateCumulativeCost(gbPerDay: number, months: number): number {
        let cumulativeCost = 0;
        let totalStoredGB = 0;

        for (let month = 1; month <= months; month++) {
            totalStoredGB += gbPerDay * 30; // Add data generated in a month
            cumulativeCost += totalStoredGB * storageCostPerGB; // Cost for storing all accumulated data
        }

        return cumulativeCost;
    }

    $: cost1Year = calculateCumulativeCost(gbPerDay, 12);
    $: cost2Years = calculateCumulativeCost(gbPerDay, 24);
    $: cost5Years = calculateCumulativeCost(gbPerDay, 60);

    $: hardware = hardwareOptions[selectedHardwareIndex];
    $: powCostPerDay = (totalCPS / hardware.txPerSec) * ((hardware.power / 1000) * electricityCostPerKWh * 24);
    $: numHardware = Math.ceil(totalCPS / hardware.txPerSec);
    $: upfrontHardwareCost = numHardware * hardware.cost;

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
    /* Mobile */
    .calculator {
        display: flex;
        flex-direction: column;
        row-gap: 0.5rem;
    }

    /* Tablet, desktop */
    @media (min-width: 768px) {
        .calculator {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 0.5fr));
            gap: 0.5rem;
            height: 75vh;
        }
    }

    .left-column, .right-column {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 0.5rem;
    }

    .right-column {
        overflow: hidden;
    }

    .buckets-table {
        background: white;
        border-radius: 12px;
        border: 1px solid #e9ecef;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .table-container {
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    .controls {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 12px;
    }

    .slider-group {
        margin-bottom: 1rem;
    }

    .slider-label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
        color: #343a40;
        font-size: 0.9rem;
    }

    th {
        position: sticky;
        top: 0;
        background: #f8f9fa;
        padding: 0.5rem;
        text-align: left;
        font-weight: 500;
        color: #495057;
        z-index: 1;
    }

    td {
        padding: 0.5rem;
        border-top: 1px solid #e9ecef;
        color: #495057;
    }

    tr:hover {
        background: #f8f9fa;
    }

    td.range, th.range {
        font-family: monospace;
        text-align: right;
        white-space: nowrap;
    }

    .bucket-row {
        cursor: pointer;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -o-user-select: none;
        user-select: none;
    }

    .bucket-row.selected {
        background: #edf2ff;
    }

    .stats-panel {
        background: #4c6ef5;
        color: white;
        padding: 0.75rem;
        border-radius: 8px;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }

    .stat-item {
        text-align: center;
    }

    .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
    }

    .stat-label {
        font-size: 0.8rem;
        opacity: 0.9;
    }

    .cost-panel {
        background: #f1f3f5;
        color: #212529;
        padding: 0.75rem;
        border-radius: 8px;
        width: 100%;
        box-sizing: border-box;
        flex: 1;
    }

    .cost-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 0.5rem;
        text-align: center;
    }

    .cost-item {
        padding: 0.5rem;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        width: 100%;
        box-sizing: border-box;
    }

    .cost-value {
        font-size: 1rem;
        font-weight: bold;
        color: #495057;
    }

    .cost-label {
        font-size: 0.8rem;
        color: #868e96;
    }

    .cost-panel h3 {
        margin: 0.5rem 0;
        font-size: 1rem;
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

    .tooltip-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }

    .info-icon {
        cursor: help;
        color: #6c757d;
        font-size: 0.8rem;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid currentColor;
        border-radius: 50%;
    }

    .tooltip {
        position: absolute;
        top: 100%;
        left: 50%;
        margin-top: 0.5rem;
        background: #fff;
        color: #495057;
        padding: 0.5rem;
        font-size: 0.85rem;
        font-weight: normal;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        opacity: 0;
        visibility: hidden;
        z-index: 1000;
        transition: opacity 0.2s, visibility 0.2s;
        width: 150px;
    }

    .tooltip-trigger:hover .tooltip {
        visibility: visible;
        opacity: 1;
    }

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

    .tooltip-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        cursor: help;
    }

    .tooltip-trigger .info-icon {
        width: 16px;
        height: 16px;
        font-size: 0.8rem;
        color: #6c757d;
        border: 1px solid currentColor;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .tooltip-trigger:hover .tooltip {
        opacity: 1;
        visibility: visible;
    }
</style>

<div class="calculator">
    <div class="left-column">
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

        <div class="cost-panel">
            <h3>
  <span class="tooltip-trigger">
    Storage Costs
    <span class="info-icon">?</span>
    <span class="tooltip">
      This represents the cost of storing data generated by the spam attack. Assumes $0.005/GB/month.
    </span>
  </span>
            </h3>
            <div class="cost-grid">
                <div class="cost-item">
                    <div class="cost-value">${cost1Year.toFixed(2)}</div>
                    <div class="cost-label">Cost for 1 Year</div>
                </div>
                <div class="cost-item">
                    <div class="cost-value">${cost2Years.toFixed(2)}</div>
                    <div class="cost-label">Cost for 2 Years</div>
                </div>
                <div class="cost-item">
                    <div class="cost-value">${cost5Years.toFixed(2)}</div>
                    <div class="cost-label">Cost for 5 Years</div>
                </div>
            </div>
            <h3>Data Generation</h3>
            <div class="cost-grid">
                <div class="cost-item">
                    <div class="cost-value">{formatNumber(blocksPerDay)}</div>
                    <div class="cost-label">Blocks/day</div>
                </div>
                <div class="cost-item">
                    <div class="cost-value">{gbPerDay.toFixed(2)} GB/day</div>
                    <div class="cost-label">Data Generated</div>
                </div>
            </div>
        </div>

    </div>

    <div class="right-column">
        <div class="stats-panel">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${powCostPerDay.toFixed(2)}</div>
                    <div class="stat-label">Energy Cost Per Day</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatNumber(upfrontHardwareCost)}</div>
                    <div class="stat-label">Upfront Hardware Cost</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{formatNano(totalInvestment)} Ӿ</div>
                    <div class="stat-label">Investment to Fill Buckets</div>
                </div>
            </div>
        </div>

        <div class="buckets-table">
            <div class="table-container">
                <table>
                    <thead>
                    <tr>
                        <th>Bucket</th>
                        <th class="range">Min Ӿ</th>
                        <th class="range">Max Ӿ</th>
                        <th>Accounts</th>
                        <th>Investment</th>
                    </tr>
                    </thead>
                    <tbody>
                    {#each buckets as bucket, i}
                        <tr
                                class="bucket-row {bucket.toggled ? 'selected' : ''}"
                                on:click={(e) => handleBucketClick(i, e)}
                        >
                            <td>{bucket.index}</td>
                            <td class="range">{formatNano(bucket.minNano)}</td>
                            <td class="range">{formatNano(bucket.maxNano)}</td>
                            <td>
                                {bucket.toggled ? Math.ceil(accountsPerBucket).toLocaleString() : '—'}
                            </td>
                            <td>
                                {bucket.toggled ? formatNano(getBucketInvestment(bucket)) : '—'} Ӿ
                            </td>
                        </tr>
                    {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
