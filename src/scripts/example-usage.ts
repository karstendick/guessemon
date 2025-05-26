import { promises as fs } from 'fs';
import path from 'path';
import { PokemonDataFetcher } from './fetch-pokemon-data';

const DATA_DIR = path.join(process.cwd(), 'data');

// Example 1: Load the complete Pokémon list
async function loadPokemonList() {
  try {
    const listPath = path.join(DATA_DIR, 'api', 'v2', 'pokemon-list.json');
    const data = await fs.readFile(listPath, 'utf-8');
    const pokemonList = JSON.parse(data);
    
    console.log(`Total Pokémon available: ${pokemonList.length}`);
    console.log('First 10 Pokémon:', pokemonList.slice(0, 10).map((p: any) => p.name));
    
    return pokemonList;
  } catch (error) {
    console.error('Pokemon list not found. Run "npm run fetch-pokemon:list" first.');
    return [];
  }
}

// Example 2: Load a specific Pokémon by ID
async function loadPokemonById(id: number) {
  try {
    // Look for file with id-name format
    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
    const files = await fs.readdir(pokemonDir);
    const pokemonFile = files.find(file => file.startsWith(`${id}-`) && file.endsWith('.json'));
    
    if (!pokemonFile) {
      console.error(`Pokemon #${id} not found. Run "npm run fetch-pokemon:pokemon" first.`);
      return null;
    }
    
    const pokemonPath = path.join(pokemonDir, pokemonFile);
    const data = await fs.readFile(pokemonPath, 'utf-8');
    const pokemon = JSON.parse(data);
    
    console.log(`\n=== ${pokemon.name.toUpperCase()} ===`);
    console.log(`ID: ${pokemon.id}`);
    console.log(`Height: ${pokemon.height / 10}m`);
    console.log(`Weight: ${pokemon.weight / 10}kg`);
    console.log(`Types: ${pokemon.types.map((t: any) => t.type.name).join(', ')}`);
    console.log(`Base Experience: ${pokemon.base_experience}`);
    
    // Stats
    console.log('\nBase Stats:');
    pokemon.stats.forEach((stat: any) => {
      console.log(`  ${stat.stat.name}: ${stat.base_stat}`);
    });
    
    // Abilities
    console.log('\nAbilities:');
    pokemon.abilities.forEach((ability: any) => {
      const hidden = ability.is_hidden ? ' (Hidden)' : '';
      console.log(`  ${ability.ability.name}${hidden}`);
    });
    
    return pokemon;
  } catch (error) {
    console.error(`Pokemon #${id} not found. Run "npm run fetch-pokemon:pokemon" first.`);
    return null;
  }
}

// Example 3: Find Pokémon by type
async function findPokemonByType(typeName: string) {
  try {
    const pokemonList = await loadPokemonList();
    const matchingPokemon = [];
    
    // Check first 50 for demo
    for (const pokemon of pokemonList.slice(0, 50)) {
      try {
        // Extract ID from URL
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
        
        // Look for file with id-name format
        const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
        const files = await fs.readdir(pokemonDir);
        const pokemonFile = files.find(file => file.startsWith(`${pokemonId}-`) && file.endsWith('.json'));
        
        if (pokemonFile) {
          const pokemonPath = path.join(pokemonDir, pokemonFile);
          const data = await fs.readFile(pokemonPath, 'utf-8');
          const pokemonData = JSON.parse(data);
          
          const hasType = pokemonData.types.some((t: any) => t.type.name === typeName);
          if (hasType) {
            matchingPokemon.push({
              name: pokemonData.name,
              id: pokemonData.id,
              types: pokemonData.types.map((t: any) => t.type.name)
            });
          }
        }
      } catch (error) {
        // Skip if pokemon data not cached yet
      }
    }
    
    console.log(`\n=== ${typeName.toUpperCase()} TYPE POKÉMON ===`);
    matchingPokemon.forEach(pokemon => {
      console.log(`#${pokemon.id} ${pokemon.name} (${pokemon.types.join('/')})`);
    });
    
    return matchingPokemon;
  } catch (error) {
    console.error('Error finding Pokémon by type:', error);
    return [];
  }
}

// Example 4: Using the fetcher class for programmatic access
async function fetchSpecificPokemon(id: number) {
  const fetcher = new PokemonDataFetcher();
  
  try {
    console.log(`\n=== FETCHING POKÉMON #${id} ===`);
    const pokemon = await fetcher.fetchPokemon(id);
    
    console.log(`${pokemon.name} (#${pokemon.id})`);
    console.log(`Types: ${pokemon.types.map((t: any) => t.type.name).join(', ')}`);
    console.log(`Base Experience: ${pokemon.base_experience}`);
    
    return pokemon;
  } catch (error) {
    console.error(`Error fetching Pokémon #${id}:`, error);
    return null;
  }
}

// Main demo function
async function main() {
  console.log('🔍 Pokémon Data Usage Examples\n');
  
  // Example 1: Load list
  await loadPokemonList();
  
  // Example 2: Load specific Pokémon
  await loadPokemonById(25); // Pikachu
  
  // Example 3: Find by type
  await findPokemonByType('electric');
  
  // Example 4: Fetch new data (will use cache if available)
  await fetchSpecificPokemon(6); // Charizard
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  loadPokemonList,
  loadPokemonById,
  findPokemonByType,
  fetchSpecificPokemon
}; 