export const config = { runtime: 'edge' };

const UPSTREAM = 'https://github.com/vedant1100/Walkability-Index/releases/download/v1.0-data/CA_Walkability.geojson';

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            }
        });
    }

    const upstream = await fetch(UPSTREAM, { redirect: 'follow' });

    if (!upstream.ok) {
        return new Response('Failed to fetch GeoJSON', { status: 502 });
    }

    return new Response(upstream.body, {
        headers: {
            'Content-Type': 'application/geo+json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        }
    });
}
