import { promises as fs } from 'fs';
import path from 'path';
import type {
  NamedAPIResource,
  APIResourceList,
  Pokemon,
  PokemonSpecies,
  EvolutionChain,
  TypeData,
  Generation,
} from '../types/pokemon.js';

// Base configuration
const BASE_URL = 'https://pokeapi.co/api/v2';
const DATA_DIR = path.join(process.cwd(), 'data');
const DELAY_BETWEEN_REQUESTS = 100; // milliseconds to be respectful to the API

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

  private async fetchWithRetry<T = unknown>(
    url: string,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching: ${url} (attempt ${String(attempt)})`);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `HTTP ${String(response.status)}: ${response.statusText}`
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        console.error(
          `Attempt ${String(attempt)} failed for ${url}:`,
          error instanceof Error ? error.message : String(error)
        );
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }

    throw new Error(
      `Failed to fetch ${url} after ${String(maxRetries)} attempts`
    );
  }

  private async saveToFile(data: unknown, filePath: string): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async downloadImage(
    imageUrl: string,
    localPath: string
  ): Promise<boolean> {
    try {
      // Check if image already exists
      if (await this.fileExists(localPath)) {
        return true;
      }

      await this.ensureDirectoryExists(path.dirname(localPath));

      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.warn(
          `Failed to download image: ${imageUrl} (${response.status.toString()})`
        );
        return false;
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(localPath, new Uint8Array(buffer));

      console.log(`Downloaded: ${path.basename(localPath)}`);
      return true;
    } catch (error) {
      console.error(
        `Error downloading image ${imageUrl}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  private getImagePath(
    pokemonId: number,
    pokemonName: string,
    imageType: string,
    imageUrl: string
  ): string {
    // Extract file extension from URL
    const urlParts = imageUrl.split('.');
    const extension = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params

    // Create organized directory structure: data/images/pokemon/{id}-{name}/{imageType}.{ext}
    return path.join(
      DATA_DIR,
      'images',
      'pokemon',
      `${String(pokemonId)}-${pokemonName}`,
      `${imageType}.${extension}`
    );
  }

  private getLocalPath(
    apiUrl: string,
    pokemonData?: { id: number; name: string }
  ): string {
    // Convert API URL to local file path
    const urlPath = apiUrl.replace(BASE_URL, '').replace(/\/$/, '');

    // Special handling for pokemon endpoints to use id-name format
    if (urlPath.includes('/pokemon/')) {
      if (pokemonData) {
        // Use id-name format: e.g., "1-bulbasaur.json"
        return path.join(
          DATA_DIR,
          'api',
          'v2',
          'pokemon',
          `${String(pokemonData.id)}-${pokemonData.name}.json`
        );
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
      return JSON.parse(cached) as NamedAPIResource[];
    }

    console.log('Fetching complete Pokémon list...');
    const allPokemon: NamedAPIResource[] = [];
    let url: string | null = `${BASE_URL}/pokemon?limit=100000`; // Get all at once

    while (url) {
      const data: APIResourceList =
        await this.fetchWithRetry<APIResourceList>(url);
      allPokemon.push(...data.results);
      url = data.next;

      if (url) {
        await this.delay(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Save the complete list
    await this.saveToFile(allPokemon, listPath);
    console.log(`Found ${String(allPokemon.length)} Pokémon`);

    return allPokemon;
  }

  async fetchPokemon(id: number): Promise<Pokemon> {
    const url = `${BASE_URL}/pokemon/${String(id)}`;

    // First, try to find existing file with id-name format
    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');
    try {
      await this.ensureDirectoryExists(pokemonDir);
      const files = await fs.readdir(pokemonDir);
      const existingFile = files.find(
        file => file.startsWith(`${String(id)}-`) && file.endsWith('.json')
      );

      if (existingFile) {
        const existingPath = path.join(pokemonDir, existingFile);
        console.log(
          `Loading cached Pokémon: ${String(id)} from ${existingFile}`
        );
        const cached = await fs.readFile(existingPath, 'utf-8');
        const pokemon = JSON.parse(cached) as Pokemon;

        // Download images if they don't exist yet
        await this.downloadPokemonImages(pokemon);

        // Fetch associated data if not already cached
        await this.fetchPokemonAssociatedData(pokemon);

        return pokemon;
      }
    } catch {
      // Directory doesn't exist yet, continue with fetch
    }

    // Fetch from API
    console.log(`Fetching Pokémon #${String(id)}...`);
    const pokemon = await this.fetchWithRetry<Pokemon>(url);

    // Save with id-name format
    const localPath = this.getLocalPath(url, {
      id: pokemon.id,
      name: pokemon.name,
    });
    await this.saveToFile(pokemon, localPath);

    // Download images
    await this.downloadPokemonImages(pokemon);

    // Fetch all associated data
    await this.fetchPokemonAssociatedData(pokemon);

    await this.delay(DELAY_BETWEEN_REQUESTS);

    return pokemon;
  }

  async fetchPokemonAssociatedData(pokemon: Pokemon): Promise<void> {
    console.log(`Fetching associated data for ${pokemon.name}...`);

    // Fetch species data
    const species = await this.fetchPokemonSpecies(pokemon.species.url);

    // Fetch evolution chain data
    if (species.evolution_chain.url) {
      await this.fetchEvolutionChain(species.evolution_chain.url);
    }

    // Fetch type effectiveness data for each type
    for (const typeInfo of pokemon.types) {
      await this.fetchTypeData(typeInfo.type.url);
    }

    // Fetch generation data
    if (species.generation.url) {
      await this.fetchGenerationData(species.generation.url);
    }
  }

  async fetchPokemonSpecies(speciesUrl: string): Promise<PokemonSpecies> {
    const localPath = this.getLocalPath(speciesUrl);

    // Check if already cached
    if (await this.fileExists(localPath)) {
      const cached = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(cached) as PokemonSpecies;
    }

    console.log(`Fetching species data: ${speciesUrl}`);
    const species = await this.fetchWithRetry<PokemonSpecies>(speciesUrl);
    await this.saveToFile(species, localPath);
    await this.delay(DELAY_BETWEEN_REQUESTS);

    return species;
  }

  async fetchEvolutionChain(
    evolutionChainUrl: string
  ): Promise<EvolutionChain> {
    const localPath = this.getLocalPath(evolutionChainUrl);

    // Check if already cached
    if (await this.fileExists(localPath)) {
      const cached = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(cached) as EvolutionChain;
    }

    console.log(`Fetching evolution chain: ${evolutionChainUrl}`);
    const evolutionChain =
      await this.fetchWithRetry<EvolutionChain>(evolutionChainUrl);
    await this.saveToFile(evolutionChain, localPath);
    await this.delay(DELAY_BETWEEN_REQUESTS);

    return evolutionChain;
  }

  async fetchTypeData(typeUrl: string): Promise<TypeData> {
    const localPath = this.getLocalPath(typeUrl);

    // Check if already cached
    if (await this.fileExists(localPath)) {
      const cached = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(cached) as TypeData;
    }

    console.log(`Fetching type data: ${typeUrl}`);
    const typeData = await this.fetchWithRetry<TypeData>(typeUrl);
    await this.saveToFile(typeData, localPath);
    await this.delay(DELAY_BETWEEN_REQUESTS);

    return typeData;
  }

  async fetchGenerationData(generationUrl: string): Promise<Generation> {
    const localPath = this.getLocalPath(generationUrl);

    // Check if already cached
    if (await this.fileExists(localPath)) {
      const cached = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(cached) as Generation;
    }

    console.log(`Fetching generation data: ${generationUrl}`);
    const generation = await this.fetchWithRetry<Generation>(generationUrl);
    await this.saveToFile(generation, localPath);
    await this.delay(DELAY_BETWEEN_REQUESTS);

    return generation;
  }

  async fetchAllPokemonData(): Promise<void> {
    console.log('Starting Pokémon data fetch...');

    // Get the list of all Pokémon
    const pokemonList = await this.fetchAllPokemonList();

    console.log(`Fetching data for ${String(pokemonList.length)} Pokémon...`);

    let skippedAlternateForms = 0;
    let processedCount = 0;

    for (const pokemon of pokemonList) {
      try {
        // Extract ID from URL (e.g., "https://pokeapi.co/api/v2/pokemon/1/" -> 1)
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0], 10);

        // Skip alternate forms (ID >= 10000)
        if (pokemonId >= 10000) {
          skippedAlternateForms++;
          continue;
        }

        processedCount++;
        const progress = `${String(processedCount)}/${String(pokemonList.length - skippedAlternateForms)}`;

        console.log(`[${progress}] Processing ${pokemon.name}...`);

        // Fetch pokemon data
        await this.fetchPokemon(pokemonId);

        // Progress update every 50 Pokémon
        if (processedCount % 50 === 0) {
          console.log(
            `Progress: ${String(processedCount)}/${String(pokemonList.length - skippedAlternateForms)} Pokémon processed (${String(skippedAlternateForms)} alternate forms skipped)`
          );
        }
      } catch (error) {
        console.error(
          `Failed to fetch data for ${pokemon.name}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue with the next Pokémon instead of stopping
      }
    }

    console.log(
      `Finished fetching all Pokémon data! Processed ${String(processedCount)} main Pokémon, skipped ${String(skippedAlternateForms)} alternate forms.`
    );
  }

  async fetchLists(): Promise<void> {
    console.log(
      'Fetching API endpoint lists (types, abilities, moves, etc.)...'
    );

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
      'pokedex',
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Fetching ${endpoint} list...`);
        const url = `${BASE_URL}/${endpoint}?limit=100000`;
        const data: APIResourceList =
          await this.fetchWithRetry<APIResourceList>(url);

        const listPath = path.join(
          DATA_DIR,
          'api',
          'v2',
          `${endpoint}-list.json`
        );
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
        console.error(
          `Failed to fetch ${endpoint} list:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  async fetchAllAssociatedData(): Promise<void> {
    console.log('Fetching associated data for all cached Pokémon...');

    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');

    try {
      const files = await fs.readdir(pokemonDir);
      const pokemonFiles = files.filter(file => file.endsWith('.json'));

      console.log(`Found ${String(pokemonFiles.length)} cached Pokémon files`);

      for (let i = 0; i < pokemonFiles.length; i++) {
        const file = pokemonFiles[i];
        const progress = `${String(i + 1)}/${String(pokemonFiles.length)}`;

        try {
          console.log(
            `[${progress}] Processing associated data for ${file}...`
          );

          const pokemonPath = path.join(pokemonDir, file);
          const pokemonData = JSON.parse(
            await fs.readFile(pokemonPath, 'utf-8')
          ) as Pokemon;

          await this.fetchPokemonAssociatedData(pokemonData);

          // Progress update every 25 Pokémon
          if ((i + 1) % 25 === 0) {
            console.log(
              `Progress: ${String(i + 1)}/${String(pokemonFiles.length)} Pokémon processed`
            );
          }
        } catch (error) {
          console.error(
            `Failed to fetch associated data for ${file}:`,
            error instanceof Error ? error.message : String(error)
          );
          // Continue with the next Pokémon instead of stopping
        }
      }

      console.log('Finished fetching all associated data!');
    } catch {
      console.error(
        'No cached Pokémon data found. Run "npm run fetch-pokemon:pokemon" first.'
      );
    }
  }

  async downloadAllPokemonImages(
    imageTypes: string[] = ['official-artwork']
  ): Promise<void> {
    console.log('Downloading images for all cached Pokémon...');

    const pokemonDir = path.join(DATA_DIR, 'api', 'v2', 'pokemon');

    try {
      const files = await fs.readdir(pokemonDir);
      const pokemonFiles = files.filter(file => file.endsWith('.json'));

      console.log(`Found ${String(pokemonFiles.length)} cached Pokémon files`);
      console.log(`Image types to download: ${imageTypes.join(', ')}`);

      for (let i = 0; i < pokemonFiles.length; i++) {
        const file = pokemonFiles[i];
        const progress = `${String(i + 1)}/${String(pokemonFiles.length)}`;

        try {
          console.log(`[${progress}] Processing images for ${file}...`);

          const pokemonPath = path.join(pokemonDir, file);
          const pokemonData = JSON.parse(
            await fs.readFile(pokemonPath, 'utf-8')
          ) as Pokemon;

          await this.downloadPokemonImages(pokemonData, imageTypes);

          // Progress update every 25 Pokémon
          if ((i + 1) % 25 === 0) {
            console.log(
              `Progress: ${String(i + 1)}/${String(pokemonFiles.length)} Pokémon images processed`
            );
          }
        } catch (error) {
          console.error(
            `Failed to download images for ${file}:`,
            error instanceof Error ? error.message : String(error)
          );
          // Continue with the next Pokémon instead of stopping
        }
      }

      console.log('Finished downloading all Pokémon images!');
    } catch {
      console.error(
        'No cached Pokémon data found. Run "npm run fetch-pokemon:pokemon" first.'
      );
    }
  }

  async getStats(): Promise<void> {
    const dataPath = path.join(DATA_DIR, 'api', 'v2');
    const imagesPath = path.join(DATA_DIR, 'images', 'pokemon');

    try {
      const files = await fs.readdir(dataPath, { recursive: true });
      const jsonFiles = files.filter(file => file.toString().endsWith('.json'));

      console.log('\n=== Cache Statistics ===');
      console.log(`Total cached files: ${String(jsonFiles.length)}`);

      // Count by type
      const counts: Record<string, number> = {};
      for (const file of jsonFiles) {
        const filePath = file.toString();
        // Normalize path separators for cross-platform compatibility
        const normalizedPath = filePath.replace(/\\/g, '/');

        if (
          normalizedPath.includes('pokemon/') &&
          !normalizedPath.includes('pokemon-species/')
        ) {
          counts.pokemon = (counts.pokemon || 0) + 1;
        } else if (normalizedPath.includes('pokemon-species/')) {
          counts['pokemon-species'] = (counts['pokemon-species'] || 0) + 1;
        } else if (normalizedPath.includes('evolution-chain/')) {
          counts['evolution-chain'] = (counts['evolution-chain'] || 0) + 1;
        } else if (
          normalizedPath.includes('type/') &&
          !normalizedPath.includes('-list.json')
        ) {
          counts.type = (counts.type || 0) + 1;
        } else if (
          normalizedPath.includes('generation/') &&
          !normalizedPath.includes('-list.json')
        ) {
          counts.generation = (counts.generation || 0) + 1;
        } else if (normalizedPath.includes('-list.json')) {
          const type = path.basename(normalizedPath, '-list.json');
          counts[`${type}-list`] = (counts[`${type}-list`] || 0) + 1;
        } else {
          // Catch any other files we might have missed
          const dirName = path.dirname(normalizedPath);
          const baseName = path.basename(dirName);
          if (baseName && baseName !== 'v2') {
            counts[`other-${baseName}`] =
              (counts[`other-${baseName}`] || 0) + 1;
          }
        }
      }

      Object.entries(counts).forEach(([type, count]) => {
        console.log(`${type}: ${String(count)}`);
      });

      // Count images
      try {
        const imageDirs = await fs.readdir(imagesPath);
        const pokemonImageDirs = imageDirs.filter(dir => dir.includes('-'));

        let totalImages = 0;
        for (const dir of pokemonImageDirs) {
          const dirPath = path.join(imagesPath, dir);
          const imageFiles = await fs.readdir(dirPath);
          totalImages += imageFiles.length;
        }

        console.log(`\n=== Image Statistics ===`);
        console.log(`Pokémon with images: ${String(pokemonImageDirs.length)}`);
        console.log(`Total images: ${String(totalImages)}`);
      } catch {
        console.log('\n=== Image Statistics ===');
        console.log('No images cached yet.');
      }
    } catch {
      console.log('No cache data found yet.');
    }
  }

  async downloadPokemonImages(
    pokemon: Pokemon,
    imageTypes: string[] = ['official-artwork']
  ): Promise<void> {
    const { id, name, sprites } = pokemon;

    console.log(`Downloading images for ${name} (#${String(id)})...`);

    const downloadPromises: Promise<boolean>[] = [];

    // Download based on specified image types
    for (const imageType of imageTypes) {
      switch (imageType) {
        case 'front-default':
          if (sprites.front_default) {
            const localPath = this.getImagePath(
              id,
              name,
              'front-default',
              sprites.front_default
            );
            downloadPromises.push(
              this.downloadImage(sprites.front_default, localPath)
            );
          }
          break;

        case 'front-female':
          if (sprites.front_female) {
            const localPath = this.getImagePath(
              id,
              name,
              'front-female',
              sprites.front_female
            );
            downloadPromises.push(
              this.downloadImage(sprites.front_female, localPath)
            );
          }
          break;

        case 'back-default':
          if (sprites.back_default) {
            const localPath = this.getImagePath(
              id,
              name,
              'back-default',
              sprites.back_default
            );
            downloadPromises.push(
              this.downloadImage(sprites.back_default, localPath)
            );
          }
          break;

        case 'back-female':
          if (sprites.back_female) {
            const localPath = this.getImagePath(
              id,
              name,
              'back-female',
              sprites.back_female
            );
            downloadPromises.push(
              this.downloadImage(sprites.back_female, localPath)
            );
          }
          break;

        case 'official-artwork':
          if (sprites.other?.['official-artwork']?.front_default) {
            const artworkUrl = sprites.other['official-artwork'].front_default;
            const localPath = this.getImagePath(
              id,
              name,
              'official-artwork',
              artworkUrl
            );
            downloadPromises.push(this.downloadImage(artworkUrl, localPath));
          }
          break;

        case 'dream-world':
          if (sprites.other?.dream_world?.front_default) {
            const dreamUrl = sprites.other.dream_world.front_default;
            const localPath = this.getImagePath(
              id,
              name,
              'dream-world',
              dreamUrl
            );
            downloadPromises.push(this.downloadImage(dreamUrl, localPath));
          }
          break;

        case 'home-default':
          if (sprites.other?.home?.front_default) {
            const homeUrl = sprites.other.home.front_default;
            const localPath = this.getImagePath(
              id,
              name,
              'home-default',
              homeUrl
            );
            downloadPromises.push(this.downloadImage(homeUrl, localPath));
          }
          break;

        default:
          console.warn(`Unknown image type: ${imageType}`);
          break;
      }
    }

    // Wait for all downloads to complete
    const results = await Promise.all(downloadPromises);
    const successCount = results.filter(success => success).length;
    const totalCount = results.length;

    console.log(
      `Downloaded ${String(successCount)}/${String(totalCount)} images for ${name}`
    );

    // Add delay to be respectful to the image servers
    await this.delay(DELAY_BETWEEN_REQUESTS);
  }
}

// Main execution function
async function main(): Promise<void> {
  const fetcher = new PokemonDataFetcher();

  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  // Parse image types from command line (for images command)
  // Usage: npm run fetch-pokemon:images -- official-artwork front-default back-default
  const imageTypes =
    args.slice(1).length > 0 ? args.slice(1) : ['official-artwork'];

  try {
    switch (command) {
      case 'list':
        await fetcher.fetchAllPokemonList();
        break;
      case 'pokemon':
        await fetcher.fetchAllPokemonData();
        break;
      case 'images':
        await fetcher.downloadAllPokemonImages(imageTypes);
        break;
      case 'lists':
        await fetcher.fetchLists();
        break;
      case 'associated':
        await fetcher.fetchAllAssociatedData();
        break;
      case 'stats':
        await fetcher.getStats();
        break;
      case 'all':
      default:
        await fetcher.getStats();
        await fetcher.fetchAllPokemonList();
        await fetcher.fetchAllPokemonData();
        await fetcher.fetchLists();
        await fetcher.getStats();
        break;
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export { PokemonDataFetcher };
