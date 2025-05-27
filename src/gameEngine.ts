import type {
  SimplePokemon,
  AnsweredQuestion,
  GameState,
} from './types/pokemon';
import { loadSimplePokemon, getPokemonById } from './dataLoader';

export class PokemonGameEngine {
  private gameState: GameState;
  private allPokemon: SimplePokemon[] = [];

  constructor() {
    this.gameState = {
      currentQuestion: null,
      answers: [],
      possiblePokemon: [],
      gameComplete: false,
      guessedPokemon: null,
    };
  }

  // Initialize the game with real Pokemon data
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Pokemon game engine...');
      this.allPokemon = await loadSimplePokemon();
      this.gameState.possiblePokemon = [...this.allPokemon];
      console.log(
        `Game initialized with ${this.allPokemon.length.toString()} Pokemon!`
      );
    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }

  // Start a new game
  async startNewGame(): Promise<void> {
    if (this.allPokemon.length === 0) {
      await this.initialize();
    }

    this.gameState = {
      currentQuestion: null,
      answers: [],
      possiblePokemon: [...this.allPokemon],
      gameComplete: false,
      guessedPokemon: null,
    };

    this.generateNextQuestion();
  }

  // Generate the next question using binary search on weight
  private generateNextQuestion(): void {
    if (this.gameState.possiblePokemon.length <= 1) {
      void this.completeGame();
      return;
    }

    if (this.gameState.answers.length >= 20) {
      void this.completeGame();
      return;
    }

    // Sort by weight and find median
    const sortedPokemon = [...this.gameState.possiblePokemon].sort(
      (a, b) => a.weight - b.weight
    );
    const medianIndex = Math.floor(sortedPokemon.length / 2);
    const medianWeight = sortedPokemon[medianIndex].weight;
    const weightInKg = medianWeight / 10; // Convert hectograms to kg

    this.gameState.currentQuestion = {
      text: `Is your Pokémon heavier than ${weightInKg.toString()} kg?`,
      type: 'weight',
      value: medianWeight,
    };
  }

  // Process an answer and update the game state
  answerQuestion(response: 'yes' | 'no' | 'unknown'): void {
    if (!this.gameState.currentQuestion || this.gameState.gameComplete) {
      return;
    }

    const answer: AnsweredQuestion = {
      response,
      question: this.gameState.currentQuestion,
    };

    this.gameState.answers.push(answer);

    // Filter possible Pokemon based on the answer
    if (
      this.gameState.currentQuestion.type === 'weight' &&
      this.gameState.currentQuestion.value !== undefined
    ) {
      const threshold = this.gameState.currentQuestion.value;

      if (response === 'yes') {
        // Pokemon is heavier than threshold
        this.gameState.possiblePokemon = this.gameState.possiblePokemon.filter(
          pokemon => pokemon.weight > threshold
        );
      } else if (response === 'no') {
        // Pokemon is lighter than or equal to threshold
        this.gameState.possiblePokemon = this.gameState.possiblePokemon.filter(
          pokemon => pokemon.weight <= threshold
        );
      }
      // For 'unknown', we don't filter the possibilities
    }

    // Generate next question or complete game
    this.generateNextQuestion();
  }

  // Complete the game and make a guess
  private async completeGame(): Promise<void> {
    this.gameState.gameComplete = true;

    if (this.gameState.possiblePokemon.length > 0) {
      // Pick the first remaining Pokemon as our guess
      const guessedSimple = this.gameState.possiblePokemon[0];
      this.gameState.guessedPokemon = await getPokemonById(guessedSimple.id);
    }
  }

  // Get current game state
  getGameState(): GameState {
    return { ...this.gameState };
  }

  // Get number of remaining possibilities
  getRemainingCount(): number {
    return this.gameState.possiblePokemon.length;
  }

  // Check if game is complete
  isGameComplete(): boolean {
    return this.gameState.gameComplete;
  }
}
