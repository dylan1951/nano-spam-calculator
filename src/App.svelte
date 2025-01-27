<script lang="ts">
    import {type Bucket, buildBuckets} from "./utils/buckets";
    import ControlPanel from "./components/ControlPanel.svelte";
    import {formatNano, formatNumber} from "./utils/format";
    import {type Hardware, hardwareOptions} from "./hardware";

    let buckets = buildBuckets();

    let totalCPS = 100;
    let cooldownSecs = 10;
    let lastToggledIndex = -1;

    let hardware = hardwareOptions[0];

    const electricityCostPerKWh = 0.14;

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
    $: powCostPerDay = (totalCPS / hardware.txPerSec) * ((hardware.power / 1000) * electricityCostPerKWh * 24);
    $: numHardware = Math.ceil(totalCPS / hardware.txPerSec);
    $: upfrontHardwareCost = numHardware * hardware.cost;
</script>

<style>
    .calculator {
        display: grid;
        grid-template-columns: 300px 410px;
        gap: 0.5rem;
        height: 680px;
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
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
    }

    table {
        border-collapse: collapse;
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
        -moz-user-select: none;
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

        <ControlPanel
        bind:totalCPS
        bind:cooldownSecs
        bind:hardware
        />

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
