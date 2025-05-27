import type {
  Pokemon,
  PokemonListEntry,
  SimplePokemon,
  PokemonSpecies,
  EvolutionChain,
  TypeData,
  ChainLink,
} from './types/pokemon';
import { buildUrl } from './utils';

// Cache for loaded Pokemon data
let pokemonCache: Pokemon[] | null = null;
let simplePokemonCache: SimplePokemon[] | null = null;
const speciesCache = new Map<number, PokemonSpecies>();
const evolutionCache = new Map<number, EvolutionChain>();
const typeCache = new Map<string, TypeData>();

// Load the pokemon list to get all available pokemon
export async function loadPokemonList(): Promise<PokemonListEntry[]> {
  try {
    const response = await fetch(buildUrl('/api/v2/pokemon-list.json'));
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

// Extract generation number from generation name
function extractGenerationNumber(generationName: string): number {
  const match = /generation-([ivx]+)/.exec(generationName);
  if (!match) return 1;

  const romanToNumber: Record<string, number> = {
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

// Load a single pokemon's species data
async function loadPokemonSpecies(id: number): Promise<PokemonSpecies | null> {
  if (speciesCache.has(id)) {
    return speciesCache.get(id) ?? null;
  }

  try {
    const response = await fetch(
      buildUrl(`/api/v2/pokemon-species/${id.toString()}.json`)
    );
    if (!response.ok) {
      console.warn(
        `Failed to load species data for Pokemon ${id.toString()}: ${response.statusText}`
      );
      return null;
    }
    const species = (await response.json()) as PokemonSpecies;
    speciesCache.set(id, species);
    return species;
  } catch (error) {
    console.warn(
      `Error loading species data for Pokemon ${id.toString()}:`,
      error
    );
    return null;
  }
}

// Load evolution chain data
async function loadEvolutionChain(
  chainId: number
): Promise<EvolutionChain | null> {
  if (evolutionCache.has(chainId)) {
    return evolutionCache.get(chainId) ?? null;
  }

  try {
    const response = await fetch(
      buildUrl(`/api/v2/evolution-chain/${chainId.toString()}.json`)
    );
    if (!response.ok) {
      console.warn(
        `Failed to load evolution chain ${chainId.toString()}: ${response.statusText}`
      );
      return null;
    }
    const chain = (await response.json()) as EvolutionChain;
    evolutionCache.set(chainId, chain);
    return chain;
  } catch (error) {
    console.warn(`Error loading evolution chain ${chainId.toString()}:`, error);
    return null;
  }
}

// Check if a Pokemon has evolution (either evolves from or evolves to something)
function checkEvolutionStatus(
  pokemon: Pokemon,
  species: PokemonSpecies | null,
  evolutionChain: EvolutionChain | null
): { hasEvolution: boolean; isEvolved: boolean } {
  let hasEvolution = false;
  let isEvolved = false;

  // Check if it evolves from something
  if (species?.evolves_from_species) {
    isEvolved = true;
    hasEvolution = true;
  }

  // Check if it evolves into something by traversing the evolution chain
  if (evolutionChain) {
    const checkChainForEvolution = (
      chain: ChainLink,
      pokemonName: string
    ): boolean => {
      if (chain.species.name === pokemonName && chain.evolves_to.length > 0) {
        return true;
      }
      for (const evolution of chain.evolves_to) {
        if (checkChainForEvolution(evolution, pokemonName)) {
          return true;
        }
      }
      return false;
    };

    if (checkChainForEvolution(evolutionChain.chain, pokemon.name)) {
      hasEvolution = true;
    }
  }

  return { hasEvolution, isEvolved };
}

// Load a single pokemon's complete data
export async function loadPokemon(id: number, name: string): Promise<Pokemon> {
  try {
    const response = await fetch(
      buildUrl(`/api/v2/pokemon/${id.toString()}-${name}.json`)
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
    console.log(
      'Enhancing Pokemon data with species and evolution information...'
    );

    const enhancedPokemon: SimplePokemon[] = [];

    for (let i = 0; i < allPokemon.length; i++) {
      const pokemon = allPokemon[i];

      // Load species data
      const species = await loadPokemonSpecies(pokemon.id);

      // Load evolution chain if species data is available
      let evolutionChain: EvolutionChain | null = null;
      if (species?.evolution_chain.url) {
        const chainId = parseInt(
          species.evolution_chain.url.split('/').slice(-2, -1)[0],
          10
        );
        evolutionChain = await loadEvolutionChain(chainId);
      }

      // Check evolution status
      const { hasEvolution, isEvolved } = checkEvolutionStatus(
        pokemon,
        species,
        evolutionChain
      );

      // Extract generation number
      const generation = species
        ? extractGenerationNumber(species.generation.name)
        : 1;

      // Calculate type effectiveness
      const { weaknesses, strengths } = await calculateTypeEffectiveness(
        pokemon.types.map(t => t.type.name)
      );

      // Extract color
      const color = species?.color.name ?? 'unknown';

      // Create enhanced SimplePokemon object
      const simplePokemon: SimplePokemon = {
        id: pokemon.id,
        name: pokemon.name,
        weight: pokemon.weight,
        height: pokemon.height,
        types: pokemon.types.map(t => t.type.name),
        generation,
        isLegendary: species?.is_legendary ?? false,
        isMythical: species?.is_mythical ?? false,
        isBaby: species?.is_baby ?? false,
        hasEvolution,
        isEvolved,
        color,
        weaknesses,
        strengths,
      };

      enhancedPokemon.push(simplePokemon);

      // Progress update every 100 Pokemon
      if ((i + 1) % 100 === 0) {
        console.log(
          `Enhanced ${(i + 1).toString()}/${allPokemon.length.toString()} Pokemon with additional data...`
        );
      }
    }

    simplePokemonCache = enhancedPokemon;
    console.log(
      `Successfully enhanced ${enhancedPokemon.length.toString()} Pokemon with additional data!`
    );
    return enhancedPokemon;
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
  speciesCache.clear();
  evolutionCache.clear();
  typeCache.clear();
}

// Load type data for effectiveness calculations
async function loadTypeData(typeName: string): Promise<TypeData | null> {
  if (typeCache.has(typeName)) {
    return typeCache.get(typeName) ?? null;
  }

  try {
    // Map type names to their IDs (this is a simplified mapping)
    const typeIds: Record<string, number> = {
      normal: 1,
      fighting: 2,
      flying: 3,
      poison: 4,
      ground: 5,
      rock: 6,
      bug: 7,
      ghost: 8,
      steel: 9,
      fire: 10,
      water: 11,
      grass: 12,
      electric: 13,
      psychic: 14,
      ice: 15,
      dragon: 16,
      dark: 17,
      fairy: 18,
    };

    const typeId = typeIds[typeName];
    if (!typeId) return null;

    const response = await fetch(
      buildUrl(`/api/v2/type/${typeId.toString()}.json`)
    );
    if (!response.ok) {
      console.warn(
        `Failed to load type data for ${typeName}: ${response.statusText}`
      );
      return null;
    }
    const typeData = (await response.json()) as TypeData;
    typeCache.set(typeName, typeData);
    return typeData;
  } catch (error) {
    console.warn(`Error loading type data for ${typeName}:`, error);
    return null;
  }
}

// Calculate weaknesses and strengths for a Pokemon based on its types
async function calculateTypeEffectiveness(
  pokemonTypes: string[]
): Promise<{ weaknesses: string[]; strengths: string[] }> {
  const weaknesses = new Set<string>();
  const strengths = new Set<string>();
  const resistances = new Set<string>();
  const immunities = new Set<string>();

  // Load type data for each of the Pokemon's types
  for (const typeName of pokemonTypes) {
    const typeData = await loadTypeData(typeName);
    if (!typeData) continue;

    // Add weaknesses (types that deal double damage to this type)
    typeData.damage_relations.double_damage_from.forEach(type => {
      weaknesses.add(type.name);
    });

    // Add resistances (types that deal half damage to this type)
    typeData.damage_relations.half_damage_from.forEach(type => {
      resistances.add(type.name);
    });

    // Add immunities (types that deal no damage to this type)
    typeData.damage_relations.no_damage_from.forEach(type => {
      immunities.add(type.name);
    });

    // Add strengths (types this Pokemon is strong against)
    typeData.damage_relations.double_damage_to.forEach(type => {
      strengths.add(type.name);
    });
  }

  // Remove resistances and immunities from weaknesses
  resistances.forEach(type => weaknesses.delete(type));
  immunities.forEach(type => weaknesses.delete(type));

  return {
    weaknesses: Array.from(weaknesses),
    strengths: Array.from(strengths),
  };
}
