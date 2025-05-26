# Pokémon Data Fetcher

This script fetches comprehensive Pokémon data from [PokéAPI](https://pokeapi.co/) and caches it locally with a directory structure that mirrors the API paths. Files are saved with an `{id}-{name}.json` format for easy sorting and identification. **Now includes automatic image downloading and caching!**

## Features

- ✅ Fetches all Pokémon data (1000+ Pokémon) by ID
- ✅ **Configurable image downloading** - Choose which image types to download
- ✅ **Defaults to official artwork only** - Minimal storage and fast downloads
- ✅ Saves files in `{id}-{name}.json` format for easy sorting
- ✅ Organizes images in structured directories
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
├── api/
│   └── v2/
│       ├── pokemon-list.json           # List of all Pokémon
│       ├── pokemon/
│       │   ├── 1-bulbasaur.json        # Bulbasaur data
│       │   ├── 2-ivysaur.json          # Ivysaur data
│       │   ├── 25-pikachu.json         # Pikachu data
│       │   └── ...
│       ├── type-list.json              # List of all types
│       ├── ability-list.json           # List of all abilities
│       ├── move-list.json              # List of all moves
│       └── ...
└── images/
    └── pokemon/
        ├── 1-bulbasaur/
        │   └── official-artwork.png    # High-quality artwork (default)
        ├── 25-pikachu/
        │   └── official-artwork.png
        └── ...
```

*Note: Additional image types (sprites, dream world, etc.) are downloaded only when specifically requested.*

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

**Download Pokémon images (official artwork only - default):**
```bash
npm run fetch-pokemon:images
```

**Download different image types:**
```bash
# All available image types
npm run fetch-pokemon:images:all

# Just sprites (front/back, male/female variants)
npm run fetch-pokemon:images:sprites

# Just high-quality artwork
npm run fetch-pokemon:images:artwork

# Custom selection (pass image types as arguments)
npm run fetch-pokemon:images -- official-artwork front-default
```

**Fetch API endpoint lists (types, abilities, moves, etc.):**
```bash
npm run fetch-pokemon:lists
```

**Show cache statistics:**
```bash
npm run fetch-pokemon:stats
```

## Image Types

The script can download various types of images for each Pokémon. **By default, only official artwork is downloaded** to minimize storage and download time.

### Available Image Types

**High-Quality Artwork (default)**
- `official-artwork` - Official high-resolution artwork (PNG, ~500KB each)

**Basic Sprites (optional)**
- `front-default` - Default front view sprite
- `front-female` - Female variant sprite (if different)
- `back-default` - Default back view sprite
- `back-female` - Female back view sprite (if different)

**Additional Artwork (optional)**
- `dream-world` - Dream World vector artwork (SVG)
- `home-default` - Pokémon HOME style sprite

### Configuring Image Downloads

You can specify which image types to download:

```bash
# Default: official artwork only (recommended)
npm run fetch-pokemon:images

# Download specific types
npm run fetch-pokemon:images -- official-artwork front-default

# Download all available types
npm run fetch-pokemon:images:all
```

**Note**: Shiny variants are not supported to save storage space and download time.

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
- **Estimated time**: 
  - Data only: 20-30 minutes
  - Data + Images (official artwork only): 15-25 minutes
  - Data + All image types: 30-45 minutes
- **API rate limit**: 100ms delay between requests
- **Retry logic**: 3 attempts with exponential backoff
- **Cache**: Subsequent runs are much faster (only fetches missing data/images)
- **Image storage**: 
  - Official artwork only: ~150-300MB
  - All image types: ~300-500MB

## Error Handling

- Failed requests are retried up to 3 times
- Individual Pokémon failures don't stop the entire process
- Missing images are skipped gracefully
- Detailed logging for debugging
- Graceful handling of network issues

## Using the Data

Once cached, you can easily load Pokémon data and images in your application:

```typescript
import { PokemonDataFetcher } from './scripts/fetch-pokemon-data';
import { loadPokemonImages } from './scripts/example-usage';
import { promises as fs } from 'fs';

// Load a specific Pokémon by ID
const bulbasaur = JSON.parse(
  await fs.readFile('data/api/v2/pokemon/1-bulbasaur.json', 'utf-8')
);

// Load Pokémon images
const images = await loadPokemonImages(1); // Bulbasaur images
console.log(images.imageFiles); // Array of image info

// Use the fetcher class for programmatic access (ID-based)
const fetcher = new PokemonDataFetcher();
const pikachu = await fetcher.fetchPokemon(25); // Pikachu's ID (includes image download)
```

## File Format

All Pokémon files are saved with the format `{id}-{name}.json`:
- `1-bulbasaur.json` - Easy to sort numerically
- `25-pikachu.json` - Clear identification
- `150-mewtwo.json` - Consistent naming

Images are organized in directories matching the same format:
- `data/images/pokemon/1-bulbasaur/` - All Bulbasaur images
- `data/images/pokemon/25-pikachu/` - All Pikachu images

This format makes it easy to:
- Sort files by Pokémon ID
- Quickly identify Pokémon by name
- Maintain consistent file organization
- Link data files with image directories

## API Documentation

For more details about the data structure, see the [PokéAPI documentation](https://pokeapi.co/docs/v2). 