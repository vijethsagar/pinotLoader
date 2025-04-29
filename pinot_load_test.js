import http from 'k6/http';
import { check, sleep } from 'k6';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Load addresses from CSV
const csvData = open('top_addresses_by_transaction_count.csv');
const parsedCSV = papaparse.parse(csvData, { header: true }).data;
const addresses = parsedCSV.map(row => row['address']);

// Load SQL template
const sqlTemplate = open('query_template.sql');

export let options = {
    vus: 50,
    duration: '1m',
    rps: 200,
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


// Runs once, before the load test
export function setup() {
    const firstQuery = buildQuery();
    console.log('First dynamically built SQL query (during setup):');
    console.log(firstQuery);
    // Pass it into the main test if you want
    return { firstQuery: firstQuery };
}

export default function (data) {
    const query = buildQuery();  // or reuse data.firstQuery if needed

    const payload = JSON.stringify({ sql: query });

    const headers = {
        'Authorization': '<insert token here>',
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
    };

    const res = http.post('<insert controller url here>/sql', payload, { headers: headers });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(0.1);
}
