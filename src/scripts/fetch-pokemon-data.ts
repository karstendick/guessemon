import { promises as fs } from 'fs';
import path from 'path';

// Base configuration
const BASE_URL = 'https://pokeapi.co/api/v2';
const DATA_DIR = path.join(process.cwd(), 'data');
const DELAY_BETWEEN_REQUESTS = 100; // milliseconds to be respectful to the API

// Type definitions for PokéAPI responses
interface NamedAPIResource {
  name: string;
  url: string;
}

interface APIResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

interface Pokemon {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  abilities: Array<{
    ability: NamedAPIResource;
    is_hidden: boolean;
    slot: number;
  }>;
  forms: NamedAPIResource[];
  game_indices: Array<{
    game_index: number;
    version: NamedAPIResource;
  }>;
  held_items: Array<{
    item: NamedAPIResource;
    version_details: Array<{
      rarity: number;
      version: NamedAPIResource;
    }>;
  }>;
  location_area_encounters: string;
  moves: Array<{
    move: NamedAPIResource;
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: NamedAPIResource;
      version_group: NamedAPIResource;
    }>;
  }>;
  species: NamedAPIResource;
  sprites: {
    back_default: string | null;
    back_female: string | null;
    back_shiny: string | null;
    back_shiny_female: string | null;
    front_default: string | null;
    front_female: string | null;
    front_shiny: string | null;
    front_shiny_female: string | null;
    other?: any;
    versions?: any;
  };
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: NamedAPIResource;
  }>;
  types: Array<{
    slot: number;
    type: NamedAPIResource;
  }>;
  order: number;
  is_default: boolean;
}

class PokemonDataFetcher {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching: ${url} (attempt ${attempt})`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${url}:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  private async saveToFile(data: any, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDirectoryExists(dir);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Saved: ${filePath}`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getLocalPath(apiUrl: string, pokemonData?: { id: number; name: string }): string {
    // Convert API URL to local file path
    const urlPath = apiUrl.replace(BASE_URL, '').replace(/\/$/, '');
    
    // Special handling for pokemon endpoints to use id-name format
    if (urlPath.includes('/pokemon/')) {
      if (pokemonData) {
        // Use id-name format: e.g., "1-bulbasaur.json"
        return path.join(DATA_DIR, 'api', 'v2', 'pokemon', `${pokemonData.id}-${pokemonData.name}.json`);
      }
      // Fallback for when we don't have pokemon data yet
      const pokemonId = urlPath.split('/pokemon/')[1];
      return path.join(DATA_DIR, 'api', 'v2', 'pokemon', `${pokemonId}.json`);
    }
    
    // Default behavior for other endpoints
    return path.join(DATA_DIR, 'api', 'v2', `${urlPath}.json`);
  }

  async fetchAllPokemonList(): Promise<NamedAPIResource[]> {
    const listPath = path.join(DATA_DIR, 'api', 'v2', 'pokemon-list.json');
    
    // Check if we already have the list cached
    if (await this.fileExists(listPath)) {
      console.log('Loading cached Pokémon list...');
      const cached = await fs.readFile(listPath, 'utf-8');
      return JSON.parse(cached);
    }

    console.log('Fetching complete Pokémon list...');
    const allPokemon: NamedAPIResource[] = [];
    let url: string | null = `${BASE_URL}/pokemon?limit=100000`; // Get all at once

    while (url) {
      const data: APIResourceList = await this.fetchWithRetry(url);
      allPokemon.push(...data.results);
      url = data.next;
      
      if (url) {
        await this.delay(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Save the complete list
    await this.saveToFile(allPokemon, listPath);
    console.log(`Found ${allPokemon.length} Pokémon`);
    
    return allPokemon;
  }

  async fetchPokemon(id: number): Promise<Pokemon> {
    const url = `${BASE_URL}/pokemon/${id}`;
    
    // First, try to find existing file with id-name format
    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
    try {
      await this.ensureDirectoryExists(pokemonDir);
      const files = await fs.readdir(pokemonDir);
      const existingFile = files.find(file => file.startsWith(`${id}-`) && file.endsWith('.json'));
      
      if (existingFile) {
        const existingPath = path.join(pokemonDir, existingFile);
        console.log(`Loading cached Pokémon: ${id} from ${existingFile}`);
        const cached = await fs.readFile(existingPath, 'utf-8');
        return JSON.parse(cached);
      }
    } catch (error) {
      // Directory doesn't exist yet, continue with fetch
    }

    // Fetch from API
    console.log(`Fetching Pokémon #${id}...`);
    const pokemon: Pokemon = await this.fetchWithRetry(url);
    
    // Save with id-name format
    const localPath = this.getLocalPath(url, { id: pokemon.id, name: pokemon.name });
    await this.saveToFile(pokemon, localPath);
    await this.delay(DELAY_BETWEEN_REQUESTS);
    
    return pokemon;
  }

  async fetchAllPokemonData(): Promise<void> {
    console.log('Starting Pokémon data fetch...');
    
    // Get the list of all Pokémon
    const pokemonList = await this.fetchAllPokemonList();
    
    console.log(`Fetching data for ${pokemonList.length} Pokémon...`);
    
    for (let i = 0; i < pokemonList.length; i++) {
      const pokemon = pokemonList[i];
      const progress = `${i + 1}/${pokemonList.length}`;
      
      try {
        console.log(`[${progress}] Processing ${pokemon.name}...`);
        
        // Extract ID from URL (e.g., "https://pokeapi.co/api/v2/pokemon/1/" -> 1)
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
        
        // Fetch pokemon data
        await this.fetchPokemon(pokemonId);
        
        // Progress update every 50 Pokémon
        if ((i + 1) % 50 === 0) {
          console.log(`Progress: ${i + 1}/${pokemonList.length} Pokémon processed`);
        }
        
      } catch (error) {
        console.error(`Failed to fetch data for ${pokemon.name}:`, error);
        // Continue with the next Pokémon instead of stopping
      }
    }
    
    console.log('Finished fetching all Pokémon data!');
  }

  async fetchAdditionalData(): Promise<void> {
    console.log('Fetching additional data (types, abilities, moves, etc.)...');
    
    const endpoints = [
      'type',
      'ability', 
      'move',
      'item',
      'location',
      'region',
      'generation',
      'version-group',
      'version',
      'pokedex'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Fetching ${endpoint} data...`);
        const url = `${BASE_URL}/${endpoint}?limit=100000`;
        const data: APIResourceList = await this.fetchWithRetry(url);
        
        const listPath = path.join(DATA_DIR, 'api', 'v2', `${endpoint}-list.json`);
        await this.saveToFile(data.results, listPath);
        
        // Optionally fetch individual items (commented out to avoid overwhelming the API)
        // for (const item of data.results.slice(0, 10)) { // Limit to first 10 for testing
        //   const itemUrl = item.url;
        //   const itemPath = this.getLocalPath(itemUrl);
        //   
        //   if (!(await this.fileExists(itemPath))) {
        //     const itemData = await this.fetchWithRetry(itemUrl);
        //     await this.saveToFile(itemData, itemPath);
        //     await this.delay(DELAY_BETWEEN_REQUESTS);
        //   }
        // }
        
        await this.delay(DELAY_BETWEEN_REQUESTS);
      } catch (error) {
        console.error(`Failed to fetch ${endpoint} data:`, error);
      }
    }
  }

  async getStats(): Promise<void> {
    const dataPath = path.join(DATA_DIR, 'api', 'v2');
    
    try {
      const files = await fs.readdir(dataPath, { recursive: true });
      const jsonFiles = files.filter(file => file.toString().endsWith('.json'));
      
      console.log('\n=== Cache Statistics ===');
      console.log(`Total cached files: ${jsonFiles.length}`);
      
      // Count by type
      const counts: Record<string, number> = {};
      for (const file of jsonFiles) {
        const filePath = file.toString();
        if (filePath.includes('/pokemon/')) {
          counts['pokemon'] = (counts['pokemon'] || 0) + 1;
        } else if (filePath.includes('-list.json')) {
          const type = path.basename(filePath, '-list.json');
          counts[`${type}-list`] = (counts[`${type}-list`] || 0) + 1;
        }
      }
      
      Object.entries(counts).forEach(([type, count]) => {
        console.log(`${type}: ${count}`);
      });
      
    } catch (error) {
      console.log('No cache data found yet.');
    }
  }
}

// Main execution function
async function main() {
  const fetcher = new PokemonDataFetcher();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  try {
    switch (command) {
      case 'list':
        await fetcher.fetchAllPokemonList();
        break;
      case 'pokemon':
        await fetcher.fetchAllPokemonData();
        break;
      case 'additional':
        await fetcher.fetchAdditionalData();
        break;
      case 'stats':
        await fetcher.getStats();
        break;
      case 'all':
      default:
        await fetcher.getStats();
        await fetcher.fetchAllPokemonList();
        await fetcher.fetchAllPokemonData();
        await fetcher.fetchAdditionalData();
        await fetcher.getStats();
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PokemonDataFetcher }; 