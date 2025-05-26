# Guessemon - Pokémon Guessing Game

A React + TypeScript + Vite application with comprehensive Pokémon data fetching and caching capabilities.

## Features

- 🎮 **Pokémon Guessing Game** (coming soon)
- 📊 **Complete Pokémon Database** - Fetch and cache all Pokémon data from PokéAPI
- ⚡ **Fast Local Access** - Smart caching system for offline usage
- 🔍 **Rich Data Types** - Pokémon stats, types, abilities, moves, and more
- 🛠️ **TypeScript Support** - Fully typed interfaces for all Pokémon data

## Pokémon Data System

This project includes a powerful data fetching system that downloads and caches all Pokémon information from [PokéAPI](https://pokeapi.co/).

### Quick Start

```bash
# Install dependencies
npm install

# Fetch all Pokémon data (takes 20-30 minutes)
npm run fetch-pokemon

# Or fetch specific parts:
npm run fetch-pokemon:list      # Just the Pokémon list
npm run fetch-pokemon:pokemon   # All Pokémon data
npm run fetch-pokemon:stats     # Show cache statistics
```

### Data Structure

The system creates a local cache in `data/` that mirrors the PokéAPI structure:

```
data/api/v2/
├── pokemon-list.json           # Complete list of 1300+ Pokémon
├── pokemon/1-bulbasaur.json    # Individual Pokémon data
└── ...
```

### Usage Examples

```typescript
import { PokemonDataFetcher } from './src/scripts/fetch-pokemon-data';

// Load cached data (ID-based)
const fetcher = new PokemonDataFetcher();
const pikachu = await fetcher.fetchPokemon(25); // Pikachu's ID

// Or load directly from cache files (id-name format)
const pokemonList = JSON.parse(
  await fs.readFile('data/api/v2/pokemon-list.json', 'utf-8')
);
const bulbasaur = JSON.parse(
  await fs.readFile('data/api/v2/pokemon/1-bulbasaur.json', 'utf-8')
);
```

See [`src/scripts/README.md`](src/scripts/README.md) for detailed documentation.

## Development

```bash
# Start development server
npm run dev

# Run example data usage
npm run pokemon-example

# Build for production
npm run build
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **PokéAPI** - Pokémon data source
- **Node.js** - Data fetching scripts

