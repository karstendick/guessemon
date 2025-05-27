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
// Fallback to original loader if aggregated files don't exist
import { loadSimplePokemon as loadSimplePokemonOriginal } from './dataLoader';

// Cache for loaded data
let minimalPokemonCache: SimplePokemon[] | null = null;
let allPokemonCache: Record<string, Pokemon> | null = null;
let allSpeciesCache: Record<string, PokemonSpecies> | null = null;
let allEvolutionChainsCache: Record<string, EvolutionChain> | null = null;
let allTypesCache: Record<string, TypeData> | null = null;

// Enhanced SimplePokemon interface for the minimal dataset
interface MinimalPokemonData {
  id: number;
  name: string;
  weight: number;
  height: number;
  types: string[];
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  color: string;
  evolves_from_species: string | null;
  evolution_chain_id: number | null;
}

// Load the minimal Pokemon dataset (fastest option)
export async function loadMinimalPokemon(): Promise<SimplePokemon[]> {
  if (minimalPokemonCache) {
    return minimalPokemonCache;
  }

  try {
    console.log('Loading minimal Pokemon dataset...');
    const response = await fetch(
      buildUrl('/api/v2/aggregated/minimal-pokemon.json')
    );
    if (!response.ok) {
      console.log(
        'Aggregated data not available, falling back to original loader...'
      );
      return await loadSimplePokemonOriginal();
    }

    const minimalData = (await response.json()) as Record<
      string,
      MinimalPokemonData
    >;

    // Load evolution chains and types for enhanced data calculation
    await loadAllEvolutionChains();
    await loadAllTypes();

    console.log('Enhancing Pokemon data with type effectiveness...');

    // Convert to SimplePokemon format with enhanced data
    const simplePokemon: SimplePokemon[] = [];
    const pokemonArray = Object.values(minimalData);

    for (let i = 0; i < pokemonArray.length; i++) {
      const pokemon = pokemonArray[i];
      const { hasEvolution, isEvolved } = checkEvolutionStatusMinimal(pokemon);

      // Calculate type effectiveness
      const { weaknesses, strengths } = await calculateTypeEffectiveness(
        pokemon.types
      );

      const simplePokemonEntry: SimplePokemon = {
        id: pokemon.id,
        name: pokemon.name,
        weight: pokemon.weight,
        height: pokemon.height,
        types: pokemon.types,
        generation: pokemon.generation,
        isLegendary: pokemon.isLegendary,
        isMythical: pokemon.isMythical,
        isBaby: pokemon.isBaby,
        hasEvolution,
        isEvolved,
        color: pokemon.color,
        weaknesses,
        strengths,
      };

      simplePokemon.push(simplePokemonEntry);

      // Progress update every 100 Pokemon
      if ((i + 1) % 100 === 0) {
        console.log(
          `Enhanced ${(i + 1).toString()}/${pokemonArray.length.toString()} Pokemon with type effectiveness...`
        );
      }
    }

    minimalPokemonCache = simplePokemon;
    console.log(
      `✅ Loaded ${simplePokemon.length.toString()} Pokemon from minimal dataset!`
    );
    return simplePokemon;
  } catch (error) {
    console.error('Error loading minimal pokemon data:', error);
    throw error;
  }
}

// Load all aggregated Pokemon data
export async function loadAllPokemon(): Promise<Pokemon[]> {
  if (allPokemonCache) {
    return Object.values(allPokemonCache);
  }

  try {
    console.log('Loading all Pokemon data...');
    const response = await fetch(
      buildUrl('/api/v2/aggregated/all-pokemon.json')
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load all pokemon data: ${response.statusText}`
      );
    }

    allPokemonCache = (await response.json()) as Record<string, Pokemon>;
    const pokemonArray = Object.values(allPokemonCache);
    console.log(
      `✅ Loaded ${pokemonArray.length.toString()} Pokemon from aggregated data!`
    );
    return pokemonArray;
  } catch (error) {
    console.error('Error loading all pokemon data:', error);
    throw error;
  }
}

// Load all species data
export async function loadAllSpecies(): Promise<
  Record<string, PokemonSpecies>
> {
  if (allSpeciesCache) {
    return allSpeciesCache;
  }

  try {
    console.log('Loading all species data...');
    const response = await fetch(
      buildUrl('/api/v2/aggregated/all-species.json')
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load all species data: ${response.statusText}`
      );
    }

    allSpeciesCache = (await response.json()) as Record<string, PokemonSpecies>;
    console.log(
      `✅ Loaded ${Object.keys(allSpeciesCache).length.toString()} species from aggregated data!`
    );
    return allSpeciesCache;
  } catch (error) {
    console.error('Error loading all species data:', error);
    throw error;
  }
}

// Load all evolution chains
export async function loadAllEvolutionChains(): Promise<
  Record<string, EvolutionChain>
> {
  if (allEvolutionChainsCache) {
    return allEvolutionChainsCache;
  }

  try {
    console.log('Loading all evolution chains...');
    const response = await fetch(
      buildUrl('/api/v2/aggregated/all-evolution-chains.json')
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load evolution chains: ${response.statusText}`
      );
    }

    allEvolutionChainsCache = (await response.json()) as Record<
      string,
      EvolutionChain
    >;
    console.log(
      `✅ Loaded ${Object.keys(allEvolutionChainsCache).length.toString()} evolution chains!`
    );
    return allEvolutionChainsCache;
  } catch (error) {
    console.error('Error loading evolution chains:', error);
    throw error;
  }
}

// Load all type data
export async function loadAllTypes(): Promise<Record<string, TypeData>> {
  if (allTypesCache) {
    return allTypesCache;
  }

  try {
    console.log('Loading all type data...');
    const response = await fetch(buildUrl('/api/v2/aggregated/all-types.json'));
    if (!response.ok) {
      throw new Error(`Failed to load type data: ${response.statusText}`);
    }

    allTypesCache = (await response.json()) as Record<string, TypeData>;
    console.log(
      `✅ Loaded ${Object.keys(allTypesCache).length.toString()} types!`
    );
    return allTypesCache;
  } catch (error) {
    console.error('Error loading type data:', error);
    throw error;
  }
}

// Check evolution status using minimal data
function checkEvolutionStatusMinimal(pokemon: MinimalPokemonData): {
  hasEvolution: boolean;
  isEvolved: boolean;
} {
  let hasEvolution = false;
  let isEvolved = false;

  // Check if it evolves from something
  if (pokemon.evolves_from_species) {
    isEvolved = true;
    hasEvolution = true;
  }

  // Check if it evolves into something by looking at the evolution chain
  if (pokemon.evolution_chain_id && allEvolutionChainsCache) {
    const evolutionChain =
      allEvolutionChainsCache[pokemon.evolution_chain_id.toString()];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
  }

  return { hasEvolution, isEvolved };
}

// Calculate type effectiveness for a Pokemon (on demand)
export async function calculateTypeEffectiveness(
  pokemonTypes: string[]
): Promise<{ weaknesses: string[]; strengths: string[] }> {
  const allTypes = await loadAllTypes();
  const weaknesses = new Set<string>();
  const strengths = new Set<string>();
  const resistances = new Set<string>();
  const immunities = new Set<string>();

  // Map type names to their IDs
  const typeIds: Record<string, string> = {
    normal: '1',
    fighting: '2',
    flying: '3',
    poison: '4',
    ground: '5',
    rock: '6',
    bug: '7',
    ghost: '8',
    steel: '9',
    fire: '10',
    water: '11',
    grass: '12',
    electric: '13',
    psychic: '14',
    ice: '15',
    dragon: '16',
    dark: '17',
    fairy: '18',
  };

  // Process each of the Pokemon's types
  for (const typeName of pokemonTypes) {
    const typeId = typeIds[typeName];
    if (!typeId) continue;

    const typeData = allTypes[typeId];
    // TypeData should always exist for valid type IDs, but check just in case

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

// Get a specific pokemon by ID (from aggregated data)
export async function getPokemonById(id: number): Promise<Pokemon | null> {
  const allPokemon = await loadAllPokemon();
  return allPokemon.find(pokemon => pokemon.id === id) ?? null;
}

// Legacy compatibility functions
export async function loadPokemonList(): Promise<PokemonListEntry[]> {
  const minimalPokemon = await loadMinimalPokemon();
  return minimalPokemon.map(pokemon => ({
    name: pokemon.name,
    url: `https://pokeapi.co/api/v2/pokemon/${pokemon.id.toString()}/`,
  }));
}

export async function loadSimplePokemon(): Promise<SimplePokemon[]> {
  return loadMinimalPokemon();
}

// Clear all caches
export function clearPokemonCache(): void {
  minimalPokemonCache = null;
  allPokemonCache = null;
  allSpeciesCache = null;
  allEvolutionChainsCache = null;
  allTypesCache = null;
}
