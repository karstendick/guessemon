import type { Pokemon, PokemonListEntry, SimplePokemon } from './types/pokemon';

// Cache for loaded Pokemon data
let pokemonCache: Pokemon[] | null = null;
let simplePokemonCache: SimplePokemon[] | null = null;

// Load the pokemon list to get all available pokemon
export async function loadPokemonList(): Promise<PokemonListEntry[]> {
  try {
    const response = await fetch('/api/v2/pokemon-list.json');
    if (!response.ok) {
      throw new Error(`Failed to load pokemon list: ${response.statusText}`);
    }
    const data = (await response.json()) as PokemonListEntry[];
    return data;
  } catch (error) {
    console.error('Error loading pokemon list:', error);
    throw error;
  }
}

// Extract pokemon ID from the PokeAPI URL
function extractPokemonId(url: string): number {
  const matches = /\/pokemon\/(\d+)\//.exec(url);
  return matches ? parseInt(matches[1], 10) : 0;
}

// Load a single pokemon's complete data
export async function loadPokemon(id: number, name: string): Promise<Pokemon> {
  try {
    const response = await fetch(
      `/api/v2/pokemon/${id.toString()}-${name}.json`
    );
    if (!response.ok) {
      throw new Error(`Failed to load pokemon ${name}: ${response.statusText}`);
    }
    const data = (await response.json()) as Pokemon;
    return data;
  } catch (error) {
    console.error(`Error loading pokemon ${name}:`, error);
    throw error;
  }
}

// Load all pokemon data (this might take a while!)
export async function loadAllPokemon(): Promise<Pokemon[]> {
  if (pokemonCache) {
    return pokemonCache;
  }

  try {
    console.log('Loading all Pokemon data...');
    const pokemonList = await loadPokemonList();

    // Filter to only include Pokemon we have files for
    const availablePokemon = pokemonList.filter(entry => {
      const id = extractPokemonId(entry.url);
      return 1 <= id && id <= 10000;
    });

    console.log(
      `Filtered to ${availablePokemon.length.toString()} available Pokemon (out of ${pokemonList.length.toString()} total)`
    );

    // Load all pokemon in parallel (be careful with rate limiting)
    const batchSize = 50; // Load in batches to avoid overwhelming the browser
    const allPokemon: Pokemon[] = [];

    for (let i = 0; i < availablePokemon.length; i += batchSize) {
      const batch = availablePokemon.slice(i, i + batchSize);
      console.log(
        `Loading Pokemon batch ${(Math.floor(i / batchSize) + 1).toString()}/${Math.ceil(availablePokemon.length / batchSize).toString()}...`
      );

      const batchPromises = batch.map(async entry => {
        const id = extractPokemonId(entry.url);
        try {
          return await loadPokemon(id, entry.name);
        } catch (error) {
          console.warn(
            `Failed to load Pokemon ${entry.name} (ID: ${id.toString()}):`,
            error
          );
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      // Filter out null results (failed loads)
      const successfulLoads = batchResults.filter(
        (pokemon): pokemon is Pokemon => pokemon !== null
      );
      allPokemon.push(...successfulLoads);
    }

    pokemonCache = allPokemon;
    console.log(`Successfully loaded ${allPokemon.length.toString()} Pokemon!`);
    return allPokemon;
  } catch (error) {
    console.error('Error loading all pokemon:', error);
    throw error;
  }
}

// Load simplified pokemon data for game logic
export async function loadSimplePokemon(): Promise<SimplePokemon[]> {
  if (simplePokemonCache) {
    return simplePokemonCache;
  }

  try {
    const allPokemon = await loadAllPokemon();
    simplePokemonCache = allPokemon.map(pokemon => ({
      id: pokemon.id,
      name: pokemon.name,
      weight: pokemon.weight,
    }));
    return simplePokemonCache;
  } catch (error) {
    console.error('Error loading simple pokemon data:', error);
    throw error;
  }
}

// Get a specific pokemon by ID
export async function getPokemonById(id: number): Promise<Pokemon | null> {
  try {
    const allPokemon = await loadAllPokemon();
    return allPokemon.find(pokemon => pokemon.id === id) ?? null;
  } catch (error) {
    console.error(`Error getting pokemon by ID ${id.toString()}:`, error);
    return null;
  }
}

// Clear the cache (useful for development)
export function clearPokemonCache(): void {
  pokemonCache = null;
  simplePokemonCache = null;
}
