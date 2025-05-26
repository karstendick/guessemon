// Base API types
export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface APIResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

// Pokemon-specific types
export interface PokemonType {
  slot: number;
  type: NamedAPIResource;
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

export interface PokemonAbility {
  ability: NamedAPIResource;
  is_hidden: boolean;
  slot: number;
}

export interface PokemonSprites {
  back_default: string | null;
  back_female: string | null;
  back_shiny: string | null;
  back_shiny_female: string | null;
  front_default: string | null;
  front_female: string | null;
  front_shiny: string | null;
  front_shiny_female: string | null;
  other?: {
    'official-artwork'?: {
      front_default?: string;
    };
    dream_world?: {
      front_default?: string;
    };
    home?: {
      front_default?: string;
    };
    [key: string]: unknown;
  };
  versions?: Record<string, unknown>;
}

export interface Pokemon {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  abilities: PokemonAbility[];
  forms: NamedAPIResource[];
  game_indices: {
    game_index: number;
    version: NamedAPIResource;
  }[];
  held_items: {
    item: NamedAPIResource;
    version_details: {
      rarity: number;
      version: NamedAPIResource;
    }[];
  }[];
  location_area_encounters: string;
  moves: {
    move: NamedAPIResource;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: NamedAPIResource;
      version_group: NamedAPIResource;
    }[];
  }[];
  species: NamedAPIResource;
  sprites: PokemonSprites;
  stats: PokemonStat[];
  types: PokemonType[];
  order: number;
  is_default: boolean;
}

// Utility types for working with Pokemon data
export interface MatchingPokemon {
  name: string;
  id: number;
  types: string[];
}

export interface ImageFile {
  name: string;
  path: string;
  type: string;
}

export interface PokemonImages {
  pokemonId: number;
  pokemonName: string;
  imagesDir: string;
  imageFiles: ImageFile[];
} 