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
}

// 4. CLICK TO INSPECT LOGIC
map.on('click', 'walkability-layer', (e) => {
    // e.features[0] gets the topmost feature clicked
    const props = e.features[0].properties;

    document.getElementById('click-details').innerHTML = `
        <h3>Block Group: ${props.GEOID}</h3>
        <p><b>Final NWI Score:</b> ${props.NatWalkInd}</p>
        <p>Population/Employment Density (D2a): ${props.D2A_Ranked}/20</p>
        <p>Land Use Mix (D2b): ${props.D2B_Ranked}/20</p>
        <p>Intersection Density (D3b): ${props.Rank_D3b}/20</p>
        <p>Transit Proximity (D4a): ${props.Rank_D4a}/20</p>
    `;
});

// Optional: Change the cursor to a pointer when hovering over the walkability layer to indicate it's clickable
map.on('mouseenter', 'walkability-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'walkability-layer', () => {
    map.getCanvas().style.cursor = '';
});