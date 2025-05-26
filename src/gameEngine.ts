import type { Answer, SimplePokemon } from './types/pokemon';

interface CurrentQuestion {
  text: string;
  type: 'weight';
  parameter: number;
}

export class PokemonGameEngine {
  private allPokemon: SimplePokemon[] = [];
  private possiblePokemon: SimplePokemon[] = [];
  private currentQuestion: CurrentQuestion | null = null;
  private questionCount = 0;
  private maxQuestions = 20;
  private isComplete = false;

  initializeGame(): void {
    this.allPokemon = this.loadPokemonData();
    this.possiblePokemon = [...this.allPokemon];
    this.questionCount = 0;
    this.isComplete = false;
    this.generateNextQuestion();
    console.log(`Loaded ${this.allPokemon.length.toString()} Pokemon`);
  }

  private loadPokemonData(): SimplePokemon[] {
    // Mock data for now - replace with actual data loading later
    return [
      { id: 25, name: 'pikachu', weight: 60 }, // 6.0 kg
      { id: 1, name: 'bulbasaur', weight: 69 }, // 6.9 kg
      { id: 6, name: 'charizard', weight: 905 }, // 90.5 kg
      { id: 143, name: 'snorlax', weight: 4600 }, // 460.0 kg
    ];
  }

  // Generate the next question using binary search on weight
  private generateNextQuestion(): void {
    if (
      this.possiblePokemon.length <= 1 ||
      this.questionCount >= this.maxQuestions
    ) {
      this.completeGame();
      return;
    }

    // Sort possible Pokemon by weight
    const sortedByWeight = [...this.possiblePokemon].sort(
      (a, b) => a.weight - b.weight
    );

    // Find the median weight to split the possibilities in half
    const medianIndex = Math.floor(sortedByWeight.length / 2);
    const medianWeight = sortedByWeight[medianIndex].weight;

    // Convert hectograms to a more readable format
    const weightInKg = medianWeight / 10;

    this.currentQuestion = {
      text: `Is your Pokémon heavier than ${weightInKg.toString()} kg?`,
      type: 'weight',
      parameter: medianWeight,
    };
  }

  // Process the user's answer and update the game state
  answerQuestion(answer: Answer): void {
    if (!this.currentQuestion || this.isComplete) return;

    // Record the question and answer
    this.questionCount++;

    // Filter possible Pokemon based on the answer
    if (answer !== 'unknown') {
      const threshold = this.currentQuestion.parameter;

      if (answer === 'yes') {
        // Keep Pokemon heavier than threshold
        this.possiblePokemon = this.possiblePokemon.filter(
          pokemon => pokemon.weight > threshold
        );
      } else {
        // Keep Pokemon lighter than or equal to threshold
        this.possiblePokemon = this.possiblePokemon.filter(
          pokemon => pokemon.weight <= threshold
        );
      }
    }

    console.log(
      `Remaining possibilities: ${this.possiblePokemon.length.toString()}`
    );
    console.log(
      'Remaining Pokemon:',
      this.possiblePokemon.map(p => p.name)
    );

    // Generate the next question
    this.generateNextQuestion();
  }

  // Complete the game when we've narrowed it down
  private completeGame(): void {
    this.isComplete = true;
    this.currentQuestion = null;
  }

  // Reset the game
  resetGame(): void {
    this.possiblePokemon = [...this.allPokemon];
    this.questionCount = 0;
    this.isComplete = false;
    this.currentQuestion = null;
  }

  // Get the current question text
  getCurrentQuestionText(): string {
    return this.currentQuestion?.text ?? '';
  }

  // Check if the game is complete
  isGameComplete(): boolean {
    return this.isComplete;
  }

  // Get the final guess
  getFinalGuess(): SimplePokemon | null {
    return this.possiblePokemon.length === 1 ? this.possiblePokemon[0] : null;
  }

  // Get the number of questions asked
  getQuestionsAsked(): number {
    return this.questionCount;
  }

  // Get remaining possibilities count
  getRemainingCount(): number {
    return this.possiblePokemon.length;
  }
}
