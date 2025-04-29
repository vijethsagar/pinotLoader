import http from 'k6/http';
import { check, sleep } from 'k6';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Load addresses from CSV
const csvData = open('top_addresses_by_transaction_count.csv');
const parsedCSV = papaparse.parse(csvData, { header: true }).data;
const addresses = parsedCSV.map(row => row['address']).filter(Boolean);

if (!addresses.length) {
    throw new Error("❌ No addresses loaded from CSV. Please check your input file.");
}

// Load SQL template
const sqlTemplate = open('query_template.sql');

// Configurable options via env vars
export let options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS) : 50,
    duration: __ENV.DURATION || '1m',
    rps: __ENV.RPS ? parseInt(__ENV.RPS) : 200,
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function buildQuery() {
    const randomAddress = addresses[getRandomInt(0, addresses.length)];
    const currentTime = Date.now();
    const startTime = currentTime - getRandomInt(720 * 24 * 60 * 60 * 1000, 1095 * 24 * 60 * 60 * 1000);
    const endTime = startTime + getRandomInt(0, 12 * 60 * 60 * 1000);

    let query = sqlTemplate;
    query = query.replace(/%\(address\)s/g, randomAddress);
    query = query.replace(/%\(start_ms\)s/g, startTime.toString());
    query = query.replace(/%\(end_ms\)s/g, endTime.toString());
    query = query.replace(/%\(limit\)s/g, "100");

    return query;
}

function getHeaders() {
    return {
        'Authorization': __ENV.AUTH || 'Bearer st-o5jhxqCo5Oqd2kXy-QECPeZgzIa62aLVp8v4S9pND7RnSgJvB',
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
    };
}

export function setup() {
    const firstQuery = buildQuery();
    console.log(`\n🚀 Pinot Load Test Starting`);
    console.log(`🔢 VUs: ${options.vus}`);
    console.log(`⏱️ Duration: ${options.duration}`);
    console.log(`🎯 RPS: ${options.rps}`);
    console.log(`📍 Endpoint: ${__ENV.HOST || 'https://pinot.txu6se.cp.s7e.startree.cloud'}`);
    console.log(`\n🧪 First generated query:\n${firstQuery}\n`);
    return {}; // could pass data if needed
}

export default function () {
    const query = buildQuery();
    const payload = JSON.stringify({ sql: query });
    const headers = getHeaders();

    const res = http.post(__ENV.HOST || 'https://pinot.txu6se.cp.s7e.startree.cloud/sql', payload, { headers });

    check(res, {
        '✅ status is 200': (r) => r.status === 200,
    });

    sleep(0.1);
}
