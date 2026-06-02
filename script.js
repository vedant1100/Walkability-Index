// MapLibre does not require an access token for the library itself.
// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    // Swapped to a free, open-source basemap style (you can use MapTiler, Stadia Maps, etc.)
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // clean, light background map
    center: [-119.4179, 36.7783], // Center of the US
    zoom: 6, // Ideal zoom level to see the entire state
    minZoom: 5,
    maxBounds: [[-126.0, 31.0], [-113.0, 43.0]] // Prevents panning too far away from CA
});

map.on('error', (e) => {
    if (e.source === 'walkability-data') {
        document.getElementById('avg-score').innerText = 'Error';
        document.getElementById('tier-most').innerText = '—';
        document.getElementById('tier-above').innerText = '—';
        document.getElementById('tier-below').innerText = '—';
        document.getElementById('tier-least').innerText = '—';
        console.error('Failed to load walkability data. Check that the server is rooted at Data_Viz_Proj/ so ../CA_Walkability.geojson is reachable.', e.error);
    }
});

map.on('load', () => {
    // 1. Add your converted block group data as a map source
    map.addSource('walkability-data', {
        type: 'geojson',
        data: '../CA_Walkability.geojson'
    });

    // Render the polygons color-coded by the official EPA Walkability Index Tiers
    map.addLayer({
        id: 'walkability-layer',
        type: 'fill',
        source: 'walkability-data',
        paint: {
            'fill-color': [
                'interpolate', ['linear'], ['get', 'NatWalkInd'],
                1, '#C99383',     // 1.00 - 5.75: Least Walkable (Red)
                5.75, '#fdae61',  // 5.76 - 10.50: Below Average (Orange)
                10.5, '#ffffbf',  // 10.51 - 15.25: Above Average (Yellow)
                15.25, '#a6d96a', // 15.26 - 20.00: Most Walkable (Light Green)
                20, '#1a9641'     // Peak Walkable (Dark Green)
            ],
            'fill-opacity': 0.65
        }
    });

    // Add thin borders between block groups so they are distinguishable
    map.addLayer({
        id: 'walkability-borders',
        type: 'line',
        source: 'walkability-data',
        paint: {
            'line-color': '#ffffff',
            'line-width': 0.5,
            'line-opacity': 0.5
        }
    });

    // 3. INTELLIGENT SUMMARY LOGIC: Trigger updates whenever the user pans or zooms
    map.on('idle', updateSidebarSummary);
});

function updateSidebarSummary() {
    // Get all features from 'walkability-layer' that are currently visible on screen
    const visibleFeatures = map.queryRenderedFeatures({ layers: ['walkability-layer'] });

    // If no features are on screen, reset or return
    if (visibleFeatures.length === 0) {
        document.getElementById('avg-score').innerText = '--';
        document.getElementById('tier-most').innerText = '--';
        document.getElementById('tier-above').innerText = '--';
        document.getElementById('tier-below').innerText = '--';
        document.getElementById('tier-least').innerText = '--';
        document.getElementById('histogram').innerHTML = '';
        return;
    }

    let totalScore = 0;
    let countMostWalkable = 0;
    let countAboveAverage = 0;
    let countBelowAverage = 0;
    let countLeastWalkable = 0;

    visibleFeatures.forEach(feature => {
        const score = feature.properties.NatWalkInd;
        totalScore += score;

        if (score >= 15.26) countMostWalkable++;
        else if (score >= 10.51) countAboveAverage++;
        else if (score >= 5.76) countBelowAverage++;
        else countLeastWalkable++;
    });

    const total = visibleFeatures.length;
    const average = (totalScore / total).toFixed(2);

    // Update the HTML text elements dynamically
    document.getElementById('avg-score').innerText = average;
    document.getElementById('tier-most').innerText = ((countMostWalkable / total) * 100).toFixed(1);
    document.getElementById('tier-above').innerText = ((countAboveAverage / total) * 100).toFixed(1);
    document.getElementById('tier-below').innerText = ((countBelowAverage / total) * 100).toFixed(1);
    document.getElementById('tier-least').innerText = ((countLeastWalkable / total) * 100).toFixed(1);

    updateHistogram(visibleFeatures);
}

function updateHistogram(features) {
    const NUM_BINS = 10;
    const MIN = 1, MAX = 20;
    const binSize = (MAX - MIN) / NUM_BINS;
    const total = features.length;

    const counts = new Array(NUM_BINS).fill(0);
    features.forEach(f => {
        const score = f.properties.NatWalkInd;
        if (score == null) return;
        const idx = Math.min(Math.floor((score - MIN) / binSize), NUM_BINS - 1);
        if (idx >= 0) counts[idx]++;
    });

    const pcts = counts.map(c => (c / total) * 100);
    const maxPct = Math.max(...pcts);
    const yMax = Math.ceil(maxPct / 5) * 5 || 5;

    const W = 275, H = 115;
    const pad = { top: 8, right: 6, bottom: 28, left: 32 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const barW = chartW / NUM_BINS;

    function binColor(i) {
        const mid = MIN + (i + 0.5) * binSize;
        if (mid < 5.75)  return '#C99383';
        if (mid < 10.5)  return '#fdae61';
        if (mid < 15.25) return '#ffffbf';
        return '#1a9641';
    }

    let markup = '';

    // Bars
    pcts.forEach((pct, i) => {
        const bh = (pct / yMax) * chartH;
        const x = (pad.left + i * barW).toFixed(1);
        const y = (pad.top + chartH - bh).toFixed(1);
        markup += `<rect x="${x}" y="${y}" width="${(barW - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="${binColor(i)}" stroke="#aaa" stroke-width="0.4"/>`;
    });

    // Y-axis line
    markup += `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" stroke="#ccc" stroke-width="0.5"/>`;

    // Y-axis ticks: 0, yMax/2, yMax
    [0, yMax / 2, yMax].forEach(val => {
        const y = (pad.top + chartH - (val / yMax) * chartH).toFixed(1);
        markup += `<line x1="${pad.left - 3}" y1="${y}" x2="${pad.left}" y2="${y}" stroke="#999" stroke-width="0.5"/>`;
        markup += `<text x="${pad.left - 5}" y="${(parseFloat(y) + 3).toFixed(1)}" font-size="8" fill="#666" text-anchor="end">${Math.round(val)}%</text>`;
    });

    // Y-axis title (rotated)
    const yMid = pad.top + chartH / 2;
    markup += `<text transform="translate(8,${yMid.toFixed(1)}) rotate(-90)" font-size="8" fill="#555" text-anchor="middle">% Share</text>`;

    // X-axis line
    const axY = pad.top + chartH;
    markup += `<line x1="${pad.left}" y1="${axY}" x2="${pad.left + chartW}" y2="${axY}" stroke="#ccc" stroke-width="0.5"/>`;

    // X-axis ticks at tier boundaries
    [1, 5.75, 10.5, 15.25, 20].forEach(val => {
        const x = (pad.left + ((val - MIN) / (MAX - MIN)) * chartW).toFixed(1);
        markup += `<line x1="${x}" y1="${axY}" x2="${x}" y2="${axY + 3}" stroke="#999" stroke-width="0.5"/>`;
        markup += `<text x="${x}" y="${axY + 11}" font-size="8" fill="#666" text-anchor="middle">${val}</text>`;
    });

    // X-axis title
    markup += `<text x="${(pad.left + chartW / 2).toFixed(1)}" y="${H - 1}" font-size="8" fill="#555" text-anchor="middle">NWI Score</text>`;

    document.getElementById('histogram').innerHTML = markup;
}

// 4. CLICK TO INSPECT LOGIC
map.on('click', 'walkability-layer', (e) => {
    // e.features[0] gets the topmost feature clicked
    const props = e.features[0].properties;

    document.getElementById('click-details').innerHTML = `
        <h3>Block Group: ${props.GEOID10}</h3>
        <p><b>Final NWI Score:</b> ${props.NatWalkInd}</p>
        <p>Population/Employment Density (D2a): ${props.D2A_Ranked}/20</p>
        <p>Land Use Mix (D2b): ${props.D2B_Ranked}/20</p>
        <p>Intersection Density (D3b): ${props.D3B_Ranked}/20</p>
        <p>Transit Proximity (D4a): ${props.D4A_Ranked}/20</p>
    `;
});

// Optional: Change the cursor to a pointer when hovering over the walkability layer to indicate it's clickable
map.on('mouseenter', 'walkability-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'walkability-layer', () => {
    map.getCanvas().style.cursor = '';
});