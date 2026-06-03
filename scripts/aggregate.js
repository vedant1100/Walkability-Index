// Run once from VIZ/: node scripts/aggregate.js
// Reads data/CA_Walkability.geojson → data/county_walkability.json
const fs = require('fs');

const CA_COUNTIES = {
  '06001':'Alameda','06003':'Alpine','06005':'Amador','06007':'Butte',
  '06009':'Calaveras','06011':'Colusa','06013':'Contra Costa','06015':'Del Norte',
  '06017':'El Dorado','06019':'Fresno','06021':'Glenn','06023':'Humboldt',
  '06025':'Imperial','06027':'Inyo','06029':'Kern','06031':'Kings',
  '06033':'Lake','06035':'Lassen','06037':'Los Angeles','06039':'Madera',
  '06041':'Marin','06043':'Mariposa','06045':'Mendocino','06047':'Merced',
  '06049':'Modoc','06051':'Mono','06053':'Monterey','06055':'Napa',
  '06057':'Nevada','06059':'Orange','06061':'Placer','06063':'Plumas',
  '06065':'Riverside','06067':'Sacramento','06069':'San Benito','06071':'San Bernardino',
  '06073':'San Diego','06075':'San Francisco','06077':'San Joaquin','06079':'San Luis Obispo',
  '06081':'San Mateo','06083':'Santa Barbara','06085':'Santa Clara','06087':'Santa Cruz',
  '06089':'Shasta','06091':'Sierra','06093':'Siskiyou','06095':'Solano',
  '06097':'Sonoma','06099':'Stanislaus','06101':'Sutter','06103':'Tehama',
  '06105':'Trinity','06107':'Tulare','06109':'Tuolumne','06111':'Ventura',
  '06113':'Yolo','06115':'Yuba'
};

console.log('Reading GeoJSON...');
const geojson = JSON.parse(fs.readFileSync('data/CA_Walkability.geojson', 'utf8'));
console.log(`${geojson.features.length} features found`);

const counties = {};
geojson.features.forEach(f => {
  const { GEOID10, NatWalkInd } = f.properties;
  if (!GEOID10 || NatWalkInd == null) return;
  const fips = GEOID10.substring(0, 5);
  if (!counties[fips]) {
    counties[fips] = { name: CA_COUNTIES[fips] || fips, least:0, below:0, above:0, most:0, total:0, scoreSum:0 };
  }
  const c = counties[fips];
  c.total++;
  c.scoreSum += NatWalkInd;
  if      (NatWalkInd >= 15.26) c.most++;
  else if (NatWalkInd >= 10.51) c.above++;
  else if (NatWalkInd >= 5.76)  c.below++;
  else                           c.least++;
});

const result = Object.values(counties)
  .map(c => ({
    name:     c.name,
    avgScore: parseFloat((c.scoreSum / c.total).toFixed(2)),
    least:    parseFloat(((c.least  / c.total) * 100).toFixed(1)),
    below:    parseFloat(((c.below  / c.total) * 100).toFixed(1)),
    above:    parseFloat(((c.above  / c.total) * 100).toFixed(1)),
    most:     parseFloat(((c.most   / c.total) * 100).toFixed(1)),
    total:    c.total
  }))
  .sort((a, b) => b.avgScore - a.avgScore);

fs.writeFileSync('data/county_walkability.json', JSON.stringify(result));
console.log(`Done — ${result.length} counties written to data/county_walkability.json`);
