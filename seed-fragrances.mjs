import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const content = readFileSync('./public/fragrances.js', 'utf8');

const femaleMatch = content.match(/var femaleFragrances = (\[[\s\S]*?\]);/);
const maleMatch = content.match(/var maleFragrances = (\[[\s\S]*?\]);/);

const femaleFragrances = JSON.parse(femaleMatch[1]);
const maleFragrances = JSON.parse(maleMatch[1]);

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildInsert(fragrances, gender) {
  return fragrances.map(name => `('${escapeSQL(name)}','${gender}',1)`).join(',');
}

const femaleChunks = chunkArray(femaleFragrances, 50);
const maleChunks = chunkArray(maleFragrances, 50);

console.log('-- FEMALE FRAGRANCES --');
femaleChunks.forEach((chunk, i) => {
  const sql = `INSERT INTO fragrances (name, gender, active) VALUES ${buildInsert(chunk, 'female')};`;
  console.log(`\nChunk ${i + 1}:`);
  console.log(sql);
});

console.log('\n-- MALE FRAGRANCES --');
maleChunks.forEach((chunk, i) => {
  const sql = `INSERT INTO fragrances (name, gender, active) VALUES ${buildInsert(chunk, 'male')};`;
  console.log(`\nChunk ${i + 1}:`);
  console.log(sql);
});