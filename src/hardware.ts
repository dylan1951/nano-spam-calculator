export const hardwareOptions = [
    {name: "GTX 1080", cost: 115, power: 150, txPerSec: 3.32},
    {name: "RTX 2080 Ti", cost: 350, power: 250, txPerSec: 5.48},
    {name: "Tesla V100", cost: 700, power: 300, txPerSec: 7.25},
    {name: "Tesla P100", cost: 350, power: 140, txPerSec: 3.63},
    {name: "200W ASIC (theoretical)", cost: 500, power: 200, txPerSec: 1200},
];

export interface Hardware {
    name: string;
    cost: number;
    power: number;
    txPerSec: number;
}
