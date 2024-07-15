function clamp(x, low, high) {
    return Math.min(Math.max(x, low), high);
}

function remap01(x, low, high) {
    return clamp((x - low) / (high - low), 0, 1);
}

function remap(x, lowIn, highIn, lowOut, highOut) {
    return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
}

// inverse function of remap: input the result, output the original x value
function unremap(result, lowIn, highIn, lowOut, highOut) {
    return lowIn + (highIn - lowIn) * remap01(result, lowOut, highOut);
}

function mix(a, b, x) {
    return (1 - x) * a + x * b;
}

function smoothstep(a, b, x) {
    let l = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return l * l * (3 - 2 * l);
}