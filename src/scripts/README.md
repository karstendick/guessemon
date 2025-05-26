# Pokémon Data Fetcher

This script fetches comprehensive Pokémon data from [PokéAPI](https://pokeapi.co/) and caches it locally with a directory structure that mirrors the API paths. Files are saved with an `{id}-{name}.json` format for easy sorting and identification.

## Features

- ✅ Fetches all Pokémon data (1000+ Pokémon) by ID
- ✅ Saves files in `{id}-{name}.json` format for easy sorting
- ✅ Caches data locally to avoid repeated API calls
- ✅ Respects API rate limits with delays between requests
- ✅ Retry logic with exponential backoff for failed requests
- ✅ Progress tracking and error handling
- ✅ TypeScript with full type definitions
- ✅ Modular design for easy extension

## Directory Structure

The script creates a `data/` directory that mirrors the PokéAPI structure:

```
data/
└── api/
    └── v2/
        ├── pokemon-list.json           # List of all Pokémon
        ├── pokemon/
        │   ├── 1-bulbasaur.json        # Bulbasaur data
        │   ├── 2-ivysaur.json          # Ivysaur data
        │   ├── 25-pikachu.json         # Pikachu data
        │   └── ...
        ├── type-list.json              # List of all types
        ├── ability-list.json           # List of all abilities
        ├── move-list.json              # List of all moves
        └── ...
```

## Usage

### Run all data fetching (recommended for first run):
```bash
npm run fetch-pokemon
```

### Run specific parts:

**Fetch just the Pokémon list:**
```bash
npm run fetch-pokemon:list
```

**Fetch all Pokémon data:**
```bash
npm run fetch-pokemon:pokemon
```

**Fetch additional data (types, abilities, moves, etc.):**
```bash
npm run fetch-pokemon:additional
```

**Show cache statistics:**
```bash
npm run fetch-pokemon:stats
```

## Data Types

The script fetches Pokémon data from the `/pokemon/{id}` endpoint:

### Pokemon Data
- Basic stats (HP, Attack, Defense, etc.)
- Types, abilities, moves
- Sprites and images
- Game-specific data
- Height, weight, base experience

## Performance

- **Total Pokémon**: ~1300+ (as of 2024)
- **Estimated time**: 20-30 minutes for full fetch
- **API rate limit**: 100ms delay between requests
- **Retry logic**: 3 attempts with exponential backoff
- **Cache**: Subsequent runs are much faster (only fetches missing data)

## Error Handling

- Failed requests are retried up to 3 times
- Individual Pokémon failures don't stop the entire process
- Detailed logging for debugging
- Graceful handling of network issues

## Using the Data

Once cached, you can easily load Pokémon data in your application:

```typescript
import { PokemonDataFetcher } from './scripts/fetch-pokemon-data';
import { promises as fs } from 'fs';

// Load a specific Pokémon by ID
const bulbasaur = JSON.parse(
  await fs.readFile('data/api/v2/pokemon/1-bulbasaur.json', 'utf-8')
);

// Load the complete Pokémon list
const allPokemon = JSON.parse(
  await fs.readFile('data/api/v2/pokemon-list.json', 'utf-8')
);

// Use the fetcher class for programmatic access (ID-based)
const fetcher = new PokemonDataFetcher();
const pikachu = await fetcher.fetchPokemon(25); // Pikachu's ID
```

## File Format

All Pokémon files are saved with the format `{id}-{name}.json`:
- `1-bulbasaur.json` - Easy to sort numerically
- `25-pikachu.json` - Clear identification
- `150-mewtwo.json` - Consistent naming

This format makes it easy to:
- Sort files by Pokémon ID
- Quickly identify Pokémon by name
- Maintain consistent file organization

## API Documentation

For more details about the data structure, see the [PokéAPI documentation](https://pokeapi.co/docs/v2). 