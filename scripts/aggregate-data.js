#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../public/api/v2');
const OUTPUT_DIR = path.join(__dirname, '../public/api/v2/aggregated');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Starting data aggregation...');

// Function to read all JSON files from a directory
function readJsonFiles(dirPath) {
  const files = fs.readdirSync(dirPath);
  const data = {};

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(dirPath, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const key = file.replace('.json', '');
      data[key] = content;
    }
  }

  return data;
}

// Function to get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

// Helper function to extract generation number
function extractGenerationNumber(generationName) {
  const match = /generation-([ivx]+)/.exec(generationName);
  if (!match) return 1;

  const romanToNumber = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
  };

  return romanToNumber[match[1]] || 1;
}

// Aggregate Pokemon data
console.log('📦 Aggregating Pokemon data...');
const pokemonDir = path.join(DATA_DIR, 'pokemon');
const allPokemon = readJsonFiles(pokemonDir);
const pokemonOutputPath = path.join(OUTPUT_DIR, 'all-pokemon.json');
fs.writeFileSync(pokemonOutputPath, JSON.stringify(allPokemon));
console.log(
  `✅ Created all-pokemon.json (${getFileSizeMB(pokemonOutputPath)}MB, ${Object.keys(allPokemon).length} Pokemon)`
);

// Aggregate Pokemon Species data
console.log('📦 Aggregating Pokemon Species data...');
const speciesDir = path.join(DATA_DIR, 'pokemon-species');
const allSpecies = readJsonFiles(speciesDir);
const speciesOutputPath = path.join(OUTPUT_DIR, 'all-species.json');
fs.writeFileSync(speciesOutputPath, JSON.stringify(allSpecies));
console.log(
  `✅ Created all-species.json (${getFileSizeMB(speciesOutputPath)}MB, ${Object.keys(allSpecies).length} species)`
);

// Aggregate Evolution Chain data
console.log('📦 Aggregating Evolution Chain data...');
const evolutionDir = path.join(DATA_DIR, 'evolution-chain');
const allEvolutions = readJsonFiles(evolutionDir);
const evolutionOutputPath = path.join(OUTPUT_DIR, 'all-evolution-chains.json');
fs.writeFileSync(evolutionOutputPath, JSON.stringify(allEvolutions));
console.log(
  `✅ Created all-evolution-chains.json (${getFileSizeMB(evolutionOutputPath)}MB, ${Object.keys(allEvolutions).length} chains)`
);

// Aggregate Type data
console.log('📦 Aggregating Type data...');
const typeDir = path.join(DATA_DIR, 'type');
const allTypes = readJsonFiles(typeDir);
const typeOutputPath = path.join(OUTPUT_DIR, 'all-types.json');
fs.writeFileSync(typeOutputPath, JSON.stringify(allTypes));
console.log(
  `✅ Created all-types.json (${getFileSizeMB(typeOutputPath)}MB, ${Object.keys(allTypes).length} types)`
);

// Create a minimal dataset for faster initial loading
console.log('📦 Creating minimal dataset...');
const minimalPokemon = {};

Object.entries(allPokemon).forEach(([key, pokemon]) => {
  const speciesKey = pokemon.id.toString();
  const species = allSpecies[speciesKey];

  // Extract only essential data for the game
  minimalPokemon[key] = {
    id: pokemon.id,
    name: pokemon.name,
    weight: pokemon.weight,
    height: pokemon.height,
    types: pokemon.types.map(t => t.type.name),
    generation: species ? extractGenerationNumber(species.generation.name) : 1,
    isLegendary: species?.is_legendary ?? false,
    isMythical: species?.is_mythical ?? false,
    isBaby: species?.is_baby ?? false,
    color: species?.color.name ?? 'unknown',
    evolves_from_species: species?.evolves_from_species?.name ?? null,
    evolution_chain_id: species?.evolution_chain.url
      ? parseInt(species.evolution_chain.url.split('/').slice(-2, -1)[0], 10)
      : null,
  };
});

const minimalOutputPath = path.join(OUTPUT_DIR, 'minimal-pokemon.json');
fs.writeFileSync(minimalOutputPath, JSON.stringify(minimalPokemon));
console.log(
  `✅ Created minimal-pokemon.json (${getFileSizeMB(minimalOutputPath)}MB, ${Object.keys(minimalPokemon).length} Pokemon)`
);

console.log('🎉 Data aggregation complete!');
console.log(`📁 Aggregated files saved to: ${OUTPUT_DIR}`);

// Calculate total size reduction
const originalSize =
  parseFloat(getFileSizeMB(pokemonOutputPath)) +
  parseFloat(getFileSizeMB(speciesOutputPath)) +
  parseFloat(getFileSizeMB(evolutionOutputPath)) +
  parseFloat(getFileSizeMB(typeOutputPath));

console.log(`📊 Total aggregated size: ${originalSize.toFixed(2)}MB`);
console.log(`📊 Minimal dataset size: ${getFileSizeMB(minimalOutputPath)}MB`);
console.log(
  `🚀 Reduced from 2600+ requests to 4 requests (or 1 with minimal dataset)!`
);
