export function formatNano(nano: number): string {
    if (nano === 0) {
        return "0";
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

export function formatNumber(num: number): string {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}k`;
    } else {
        return num.toFixed(2);
    }
}

export function formatCooldown(seconds: number): string {
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
