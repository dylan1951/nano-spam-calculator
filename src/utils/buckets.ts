export interface Bucket {
    index: number;
    minNano: number;
    maxNano: number;
    toggled: boolean;
}

function buildRegion(
    begin: number,
    end: number,
    count: number,
    minimums: bigint[],
    maximums: bigint[]
): void {
    const regionMin = BigInt(1) << BigInt(begin);
    const regionMax = BigInt(1) << BigInt(end);
    const width = (regionMax - regionMin) / BigInt(count);

    for (let i = 0; i < count; i++) {
        const bucketMin = regionMin + width * BigInt(i);
        const bucketMax = regionMin + width * BigInt(i + 1);

        minimums.push(bucketMin);
        maximums.push(bucketMax);
    }
}

/**
 * Return an array of buckets with all the min/max values pre-populated.
 */
export function buildBuckets(): Bucket[] {
    const minimums: bigint[] = [];
    const maximums: bigint[] = [];

    // Initialize the first big bucket 0 -> (1<<79)
    minimums.push(BigInt(0));
    maximums.push(BigInt(1) << BigInt(79));

    // Define your regions in a small array for easy changes
    const regions = [
        { begin: 79, end: 88, count: 1 },
        { begin: 88, end: 92, count: 2 },
        { begin: 92, end: 96, count: 4 },
        { begin: 96, end: 100, count: 8 },
        { begin: 100, end: 104, count: 16 },
        { begin: 104, end: 108, count: 16 },
        { begin: 108, end: 112, count: 8 },
        { begin: 112, end: 116, count: 4 },
        { begin: 116, end: 120, count: 2 },
        { begin: 120, end: 128, count: 1 }
    ];

    // Build each region
    for (const r of regions) {
        buildRegion(r.begin, r.end, r.count, minimums, maximums);
    }

    // Map those values to Bucket objects
    return minimums.map((minVal, i) => {
        const maxVal = maximums[i];
        const minNano = Number(minVal.toString()) / 1e30;
        const maxNano = Number(maxVal.toString()) / 1e30;

        return {
            index: i,
            minNano,
            maxNano,
            toggled: false
        };
    });
}
