import { promises as fs } from 'fs';
import path from 'path';
import { PokemonDataFetcher } from './fetch-pokemon-data';
import type {
  NamedAPIResource,
  Pokemon,
  PokemonType,
  PokemonStat,
  PokemonAbility,
  MatchingPokemon,
  PokemonImages,
} from '../types/pokemon.js';

const DATA_DIR = path.join(process.cwd(), 'data');

// Example 1: Load the complete Pokémon list
async function loadPokemonList(): Promise<NamedAPIResource[]> {
  try {
    const listPath = path.join(DATA_DIR, 'api', 'v2', 'pokemon-list.json');
    const data = await fs.readFile(listPath, 'utf-8');
    const pokemonList = JSON.parse(data) as NamedAPIResource[];

    console.log(`Total Pokémon available: ${String(pokemonList.length)}`);
    console.log(
      'First 10 Pokémon:',
      pokemonList.slice(0, 10).map((p: NamedAPIResource) => p.name)
    );

    return pokemonList;
  } catch {
    console.error(
      'Pokemon list not found. Run "npm run fetch-pokemon:list" first.'
    );
    return [];
  }
}

// Example 2: Load a specific Pokémon by ID
async function loadPokemonById(id: number): Promise<Pokemon | null> {
  try {
    // Look for file with id-name format
    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
    const files = await fs.readdir(pokemonDir);
    const pokemonFile = files.find(
      file => file.startsWith(`${String(id)}-`) && file.endsWith('.json')
    );

    if (!pokemonFile) {
      console.error(
        `Pokemon #${String(id)} not found. Run "npm run fetch-pokemon:pokemon" first.`
      );
      return null;
    }

    const pokemonPath = path.join(pokemonDir, pokemonFile);
    const data = await fs.readFile(pokemonPath, 'utf-8');
    const pokemon = JSON.parse(data) as Pokemon;

    console.log(`\n=== ${pokemon.name.toUpperCase()} ===`);
    console.log(`ID: ${String(pokemon.id)}`);
    console.log(`Height: ${String(pokemon.height / 10)}m`);
    console.log(`Weight: ${String(pokemon.weight / 10)}kg`);
    console.log(
      `Types: ${pokemon.types.map((t: PokemonType) => t.type.name).join(', ')}`
    );
    console.log(`Base Experience: ${String(pokemon.base_experience)}`);

    // Stats
    console.log('\nBase Stats:');
    pokemon.stats.forEach((stat: PokemonStat) => {
      console.log(`  ${stat.stat.name}: ${String(stat.base_stat)}`);
    });

    // Abilities
    console.log('\nAbilities:');
    pokemon.abilities.forEach((ability: PokemonAbility) => {
      const hidden = ability.is_hidden ? ' (Hidden)' : '';
      console.log(`  ${ability.ability.name}${hidden}`);
    });

    return pokemon;
  } catch {
    console.error(
      `Pokemon #${String(id)} not found. Run "npm run fetch-pokemon:pokemon" first.`
    );
    return null;
  }
}

// Example 3: Find Pokémon by type
async function findPokemonByType(typeName: string): Promise<MatchingPokemon[]> {
  try {
    const pokemonList = await loadPokemonList();
    const matchingPokemon: MatchingPokemon[] = [];

    // Check first 50 for demo
    for (const pokemon of pokemonList.slice(0, 50)) {
      try {
        // Extract ID from URL
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0], 10);

        // Look for file with id-name format
        const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
        const files = await fs.readdir(pokemonDir);
        const pokemonFile = files.find(
          file =>
            file.startsWith(`${String(pokemonId)}-`) && file.endsWith('.json')
        );

        if (pokemonFile) {
          const pokemonPath = path.join(pokemonDir, pokemonFile);
          const data = await fs.readFile(pokemonPath, 'utf-8');
          const pokemonData = JSON.parse(data) as Pokemon;

          const hasType = pokemonData.types.some(
            (t: PokemonType) => t.type.name === typeName
          );
          if (hasType) {
            matchingPokemon.push({
              name: pokemonData.name,
              id: pokemonData.id,
              types: pokemonData.types.map((t: PokemonType) => t.type.name),
            });
          }
        }
      } catch {
        // Skip if pokemon data not cached yet
      }
    }

    console.log(`\n=== ${typeName.toUpperCase()} TYPE POKÉMON ===`);
    matchingPokemon.forEach(pokemon => {
      console.log(
        `#${String(pokemon.id)} ${pokemon.name} (${pokemon.types.join('/')})`
      );
    });

    return matchingPokemon;
  } catch {
    console.error('Error finding Pokémon by type');
    return [];
  }
}

// Example 4: Using the fetcher class for programmatic access
async function fetchSpecificPokemon(id: number): Promise<Pokemon | null> {
  const fetcher = new PokemonDataFetcher();

  try {
    console.log(`\n=== FETCHING POKÉMON #${String(id)} ===`);
    const pokemon = await fetcher.fetchPokemon(id);

    console.log(`${pokemon.name} (#${String(pokemon.id)})`);
    console.log(
      `Types: ${pokemon.types.map((t: PokemonType) => t.type.name).join(', ')}`
    );
    console.log(`Base Experience: ${String(pokemon.base_experience)}`);

    return pokemon;
  } catch {
    console.error(`Error fetching Pokémon #${String(id)}`);
    return null;
  }
}

// Example 5: Working with Pokemon images
async function loadPokemonImages(id: number): Promise<PokemonImages | null> {
  try {
    // Look for Pokemon data first
    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
    const files = await fs.readdir(pokemonDir);
    const pokemonFile = files.find(
      file => file.startsWith(`${String(id)}-`) && file.endsWith('.json')
    );

    if (!pokemonFile) {
      console.error(
        `Pokemon #${String(id)} not found. Run "npm run fetch-pokemon:pokemon" first.`
      );
      return null;
    }

    // Extract pokemon name from filename
    const pokemonName = pokemonFile
      .replace('.json', '')
      .split('-')
      .slice(1)
      .join('-');

    // Check for images directory
    const imagesDir = path.join(
      DATA_DIR,
      'images',
      'pokemon',
      `${String(id)}-${pokemonName}`
    );

    try {
      const imageFiles = await fs.readdir(imagesDir);

      console.log(`\n=== ${pokemonName.toUpperCase()} IMAGES ===`);
      console.log(`Images directory: ${imagesDir}`);
      console.log(`Available images (${String(imageFiles.length)}):`);

      imageFiles.forEach(file => {
        const imagePath = path.join(imagesDir, file);
        console.log(`  ${file} -> ${imagePath}`);
      });

      return {
        pokemonId: id,
        pokemonName,
        imagesDir,
        imageFiles: imageFiles.map(file => ({
          name: file,
          path: path.join(imagesDir, file),
          type: file.split('.')[0], // e.g., 'front-default', 'official-artwork'
        })),
      };
    } catch {
      console.log(`\n=== ${pokemonName.toUpperCase()} IMAGES ===`);
      console.log(
        'No images found. Run "npm run fetch-pokemon:images" to download images.'
      );
      return null;
    }
  } catch {
    console.error(`Error loading images for Pokemon #${String(id)}`);
    return null;
  }
}

// Main demo function
async function main(): Promise<void> {
  console.log('🔍 Pokémon Data Usage Examples\n');

  // Example 1: Load list
  await loadPokemonList();

  // Example 2: Load specific Pokémon
  await loadPokemonById(25); // Pikachu

  // Example 3: Find by type
  await findPokemonByType('electric');

  // Example 4: Fetch new data (will use cache if available)
  await fetchSpecificPokemon(6); // Charizard

  // Example 5: Load Pokemon images
  await loadPokemonImages(6); // Charizard images
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch(console.error);
}

export {
  loadPokemonList,
  loadPokemonById,
  findPokemonByType,
  fetchSpecificPokemon,
  loadPokemonImages,
};
