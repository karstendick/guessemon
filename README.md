# Guessemon - Pokémon Guessing Game

A React + TypeScript + Vite application with comprehensive Pokémon data fetching and caching capabilities, **now including automatic image downloading!**

## 🚀 Live Demo

The game is deployed on GitHub Pages: [https://karstendick.github.io/guessemon/](https://karstendick.github.io/guessemon/)

## Features

- 🎮 **Pokémon Guessing Game** (coming soon)
- 📊 **Complete Pokémon Database** - Fetch and cache all Pokémon data from PokéAPI
- 🖼️ **Configurable Image Downloads** - Choose which image types to download (defaults to official artwork only)
- ⚡ **Fast Local Access** - Smart caching system for offline usage
- 🔍 **Rich Data Types** - Pokémon stats, types, abilities, moves, and more
- 🛠️ **TypeScript Support** - Fully typed interfaces for all Pokémon data

## Pokémon Data System

This project includes a powerful data fetching system that downloads and caches all Pokémon information from [PokéAPI](https://pokeapi.co/), including comprehensive image downloading.

### Quick Start

```bash
# Install dependencies
npm install

# Fetch all Pokémon data with official artwork (takes 15-25 minutes)
npm run fetch-pokemon

# Or fetch specific parts:
npm run fetch-pokemon:list      # Just the Pokémon list
npm run fetch-pokemon:pokemon   # All Pokémon data (includes official artwork)
npm run fetch-pokemon:images    # Download official artwork for cached Pokémon
npm run fetch-pokemon:images:all # Download all image types (sprites, artwork, etc.)
npm run fetch-pokemon:stats     # Show cache statistics
```

### Data Structure

The system creates a local cache in `data/` that mirrors the PokéAPI structure:

```
data/
├── api/v2/
│   ├── pokemon-list.json           # Complete list of 1300+ Pokémon
│   ├── pokemon/1-bulbasaur.json    # Individual Pokémon data
│   └── ...
└── images/pokemon/
    ├── 1-bulbasaur/
    │   └── official-artwork.png    # High-quality artwork (default)
    ├── 25-pikachu/
    │   └── official-artwork.png
    └── ...
```

### Usage Examples

```typescript
import { PokemonDataFetcher } from './src/scripts/fetch-pokemon-data';
import { loadPokemonImages } from './src/scripts/example-usage';

// Load cached data (ID-based, includes automatic image download)
const fetcher = new PokemonDataFetcher();
const pikachu = await fetcher.fetchPokemon(25); // Pikachu's ID

// Load Pokemon images
const images = await loadPokemonImages(1); // Bulbasaur images
console.log(images.imageFiles); // Array of image info with paths

// Or load directly from cache files (id-name format)
const pokemonList = JSON.parse(
  await fs.readFile('data/api/v2/pokemon-list.json', 'utf-8')
);
const bulbasaur = JSON.parse(
  await fs.readFile('data/api/v2/pokemon/1-bulbasaur.json', 'utf-8')
);
```

See [`src/scripts/README.md`](src/scripts/README.md) for detailed documentation.

## Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

1. Push your changes to the `main` branch
2. GitHub Actions will automatically build and deploy the app
3. Your site will be available at `https://yourusername.github.io/guessemon/`

### Manual Deployment

You can also deploy manually using:

```bash
# Install gh-pages if not already installed
npm install

# Build and deploy to GitHub Pages
npm run deploy
```

### Setup GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the sidebar
3. Under "Source", select "GitHub Actions"
4. The deployment workflow will handle the rest automatically

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
