import type {
  SimplePokemon,
  AnsweredQuestion,
  GameState,
  Question,
} from './types/pokemon';
import { loadSimplePokemon, getPokemonById } from './dataLoader';

interface QuestionStrategy {
  type: Question['type'];
  generateQuestion: (pokemon: SimplePokemon[]) => Question | null;
  filterPokemon: (
    pokemon: SimplePokemon[],
    question: Question,
    response: 'yes' | 'no'
  ) => SimplePokemon[];
}

export class PokemonGameEngine {
  private gameState: GameState;
  private allPokemon: SimplePokemon[] = [];
  private usedQuestionTypes = new Set<Question['type']>();
  private askedQuestions = new Set<string>(); // Track specific questions asked

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

    this.usedQuestionTypes.clear();
    this.askedQuestions.clear(); // Clear previously asked questions
    await this.generateNextQuestion();
  }

  // Question strategies for different types
  private getQuestionStrategies(): QuestionStrategy[] {
    return [
      // Weight questions
      {
        type: 'weight',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          if (pokemon.length < 2) return null;

          const sortedPokemon = [...pokemon].sort(
            (a, b) => a.weight - b.weight
          );

          // For small sets, try to find a weight that gives a better split
          if (pokemon.length <= 3) {
            // Try using the weight of the lightest Pokemon as threshold
            const lightestWeight = sortedPokemon[0].weight;
            const yesCount = pokemon.filter(
              p => p.weight > lightestWeight
            ).length;
            const noCount = pokemon.filter(
              p => p.weight <= lightestWeight
            ).length;

            if (yesCount > 0 && noCount > 0) {
              const weightInKg = lightestWeight / 10;
              return {
                text: `Is your Pokémon heavier than ${weightInKg.toString()} kg?`,
                type: 'weight',
                value: lightestWeight,
              };
            }

            // If that doesn't work, try the second lightest
            if (pokemon.length >= 3) {
              const secondWeight = sortedPokemon[1].weight;
              const yesCount2 = pokemon.filter(
                p => p.weight > secondWeight
              ).length;
              const noCount2 = pokemon.filter(
                p => p.weight <= secondWeight
              ).length;

              if (yesCount2 > 0 && noCount2 > 0) {
                const weightInKg = secondWeight / 10;
                return {
                  text: `Is your Pokémon heavier than ${weightInKg.toString()} kg?`,
                  type: 'weight',
                  value: secondWeight,
                };
              }
            }

            // If no good split found, return null
            return null;
          }

          // For larger sets, use median approach
          const medianIndex = Math.floor(sortedPokemon.length / 2);
          const medianWeight = sortedPokemon[medianIndex].weight;
          const weightInKg = medianWeight / 10; // Convert hectograms to kg

          return {
            text: `Is your Pokémon heavier than ${weightInKg.toString()} kg?`,
            type: 'weight',
            value: medianWeight,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (question.value === undefined) return pokemon;
          const threshold = question.value;

          if (response === 'yes') {
            return pokemon.filter(p => p.weight > threshold);
          } else {
            return pokemon.filter(p => p.weight <= threshold);
          }
        },
      },

      // Height questions
      {
        type: 'height',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          if (pokemon.length < 2) return null;

          const sortedPokemon = [...pokemon].sort(
            (a, b) => a.height - b.height
          );

          // For small sets, try to find a height that gives a better split
          if (pokemon.length <= 3) {
            // Try using the height of the shortest Pokemon as threshold
            const shortestHeight = sortedPokemon[0].height;
            const yesCount = pokemon.filter(
              p => p.height > shortestHeight
            ).length;
            const noCount = pokemon.filter(
              p => p.height <= shortestHeight
            ).length;

            if (yesCount > 0 && noCount > 0) {
              const heightInM = shortestHeight / 10;
              return {
                text: `Is your Pokémon taller than ${heightInM.toString()} meters?`,
                type: 'height',
                value: shortestHeight,
              };
            }

            // If that doesn't work, try the second shortest
            if (pokemon.length >= 3) {
              const secondHeight = sortedPokemon[1].height;
              const yesCount2 = pokemon.filter(
                p => p.height > secondHeight
              ).length;
              const noCount2 = pokemon.filter(
                p => p.height <= secondHeight
              ).length;

              if (yesCount2 > 0 && noCount2 > 0) {
                const heightInM = secondHeight / 10;
                return {
                  text: `Is your Pokémon taller than ${heightInM.toString()} meters?`,
                  type: 'height',
                  value: secondHeight,
                };
              }
            }

            // If no good split found, return null
            return null;
          }

          // For larger sets, use median approach
          const medianIndex = Math.floor(sortedPokemon.length / 2);
          const medianHeight = sortedPokemon[medianIndex].height;
          const heightInM = medianHeight / 10; // Convert decimeters to meters

          return {
            text: `Is your Pokémon taller than ${heightInM.toString()} meters?`,
            type: 'height',
            value: medianHeight,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (question.value === undefined) return pokemon;
          const threshold = question.value;

          if (response === 'yes') {
            return pokemon.filter(p => p.height > threshold);
          } else {
            return pokemon.filter(p => p.height <= threshold);
          }
        },
      },

      // Type questions
      {
        type: 'type',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          // Find the type that gives the best split
          const typeCount: Record<string, number> = {};
          pokemon.forEach(p => {
            p.types.forEach(type => {
              typeCount[type] = (typeCount[type] || 0) + 1;
            });
          });

          // Find type closest to 50% split
          let bestType = '';
          let bestSplit = Infinity;
          const targetSplit = pokemon.length / 2;

          Object.entries(typeCount).forEach(([type, count]) => {
            const splitDiff = Math.abs(count - targetSplit);
            if (splitDiff < bestSplit) {
              bestSplit = splitDiff;
              bestType = type;
            }
          });

          if (!bestType) return null;

          return {
            text: `Is your Pokémon a ${bestType.charAt(0).toUpperCase() + bestType.slice(1)} type?`,
            type: 'type',
            stringValue: bestType,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (!question.stringValue) return pokemon;
          const targetType = question.stringValue;

          if (response === 'yes') {
            return pokemon.filter(p => p.types.includes(targetType));
          } else {
            return pokemon.filter(p => !p.types.includes(targetType));
          }
        },
      },

      // Generation questions
      {
        type: 'generation',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          // Find generation that gives best split
          const genCount: Record<number, number> = {};
          pokemon.forEach(p => {
            genCount[p.generation] = (genCount[p.generation] || 0) + 1;
          });

          let bestGen = 1;
          let bestSplit = Infinity;
          const targetSplit = pokemon.length / 2;

          Object.entries(genCount).forEach(([gen, count]) => {
            const splitDiff = Math.abs(count - targetSplit);
            if (splitDiff < bestSplit) {
              bestSplit = splitDiff;
              bestGen = parseInt(gen, 10);
            }
          });

          const genNames = [
            '',
            'Kanto',
            'Johto',
            'Hoenn',
            'Sinnoh',
            'Unova',
            'Kalos',
            'Alola',
            'Galar',
            'Paldea',
          ];
          const genName =
            genNames[bestGen] || `Generation ${bestGen.toString()}`;

          return {
            text: `Is your Pokémon from ${genName}?`,
            type: 'generation',
            value: bestGen,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (question.value === undefined) return pokemon;
          const targetGen = question.value;

          if (response === 'yes') {
            return pokemon.filter(p => p.generation === targetGen);
          } else {
            return pokemon.filter(p => p.generation !== targetGen);
          }
        },
      },

      // Legendary questions
      {
        type: 'legendary',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          const legendaryCount = pokemon.filter(p => p.isLegendary).length;
          const nonLegendaryCount = pokemon.length - legendaryCount;

          // Only ask if there's a reasonable split
          if (legendaryCount === 0 || nonLegendaryCount === 0) return null;

          return {
            text: 'Is your Pokémon a legendary Pokémon?',
            type: 'legendary',
            booleanValue: true,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          _question: Question,
          response: 'yes' | 'no'
        ) => {
          if (response === 'yes') {
            return pokemon.filter(p => p.isLegendary);
          } else {
            return pokemon.filter(p => !p.isLegendary);
          }
        },
      },

      // Mythical questions
      {
        type: 'mythical',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          const mythicalCount = pokemon.filter(p => p.isMythical).length;
          const nonMythicalCount = pokemon.length - mythicalCount;

          // Only ask if there's a reasonable split
          if (mythicalCount === 0 || nonMythicalCount === 0) return null;

          return {
            text: 'Is your Pokémon a mythical Pokémon?',
            type: 'mythical',
            booleanValue: true,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          _question: Question,
          response: 'yes' | 'no'
        ) => {
          if (response === 'yes') {
            return pokemon.filter(p => p.isMythical);
          } else {
            return pokemon.filter(p => !p.isMythical);
          }
        },
      },

      // Baby questions
      {
        type: 'baby',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          const babyCount = pokemon.filter(p => p.isBaby).length;
          const nonBabyCount = pokemon.length - babyCount;

          // Only ask if there's a reasonable split
          if (babyCount === 0 || nonBabyCount === 0) return null;

          return {
            text: 'Is your Pokémon a baby Pokémon?',
            type: 'baby',
            booleanValue: true,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          _question: Question,
          response: 'yes' | 'no'
        ) => {
          if (response === 'yes') {
            return pokemon.filter(p => p.isBaby);
          } else {
            return pokemon.filter(p => !p.isBaby);
          }
        },
      },

      // Evolution questions
      {
        type: 'evolution',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          const evolvedCount = pokemon.filter(p => p.isEvolved).length;
          const notEvolvedCount = pokemon.length - evolvedCount;

          // Choose the question that gives a better split
          if (
            Math.abs(evolvedCount - notEvolvedCount) <
            Math.abs(
              pokemon.filter(p => p.hasEvolution).length -
                pokemon.filter(p => !p.hasEvolution).length
            )
          ) {
            return {
              text: 'Has your Pokémon evolved from another Pokémon?',
              type: 'evolution',
              stringValue: 'isEvolved',
            };
          } else {
            return {
              text: 'Can your Pokémon evolve into another Pokémon?',
              type: 'evolution',
              stringValue: 'hasEvolution',
            };
          }
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (!question.stringValue) return pokemon;

          if (question.stringValue === 'isEvolved') {
            if (response === 'yes') {
              return pokemon.filter(p => p.isEvolved);
            } else {
              return pokemon.filter(p => !p.isEvolved);
            }
          } else if (question.stringValue === 'hasEvolution') {
            if (response === 'yes') {
              return pokemon.filter(p => p.hasEvolution);
            } else {
              return pokemon.filter(p => !p.hasEvolution);
            }
          }

          return pokemon;
        },
      },

      // Weakness questions
      {
        type: 'weakness',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          // Find the weakness type that gives the best split
          const weaknessCount: Record<string, number> = {};
          pokemon.forEach(p => {
            p.weaknesses.forEach(weakness => {
              weaknessCount[weakness] = (weaknessCount[weakness] || 0) + 1;
            });
          });

          // Find weakness closest to 50% split
          let bestWeakness = '';
          let bestSplit = Infinity;
          const targetSplit = pokemon.length / 2;

          Object.entries(weaknessCount).forEach(([weakness, count]) => {
            const splitDiff = Math.abs(count - targetSplit);
            if (splitDiff < bestSplit && count > 0) {
              bestSplit = splitDiff;
              bestWeakness = weakness;
            }
          });

          if (!bestWeakness) return null;

          return {
            text: `Is your Pokémon weak to ${bestWeakness.charAt(0).toUpperCase() + bestWeakness.slice(1)} attacks?`,
            type: 'weakness',
            stringValue: bestWeakness,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (!question.stringValue) return pokemon;
          const targetWeakness = question.stringValue;

          if (response === 'yes') {
            return pokemon.filter(p => p.weaknesses.includes(targetWeakness));
          } else {
            return pokemon.filter(p => !p.weaknesses.includes(targetWeakness));
          }
        },
      },

      // Strength questions
      {
        type: 'strength',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          // Find the strength type that gives the best split
          const strengthCount: Record<string, number> = {};
          pokemon.forEach(p => {
            p.strengths.forEach(strength => {
              strengthCount[strength] = (strengthCount[strength] || 0) + 1;
            });
          });

          // Find strength closest to 50% split
          let bestStrength = '';
          let bestSplit = Infinity;
          const targetSplit = pokemon.length / 2;

          Object.entries(strengthCount).forEach(([strength, count]) => {
            const splitDiff = Math.abs(count - targetSplit);
            if (splitDiff < bestSplit && count > 0) {
              bestSplit = splitDiff;
              bestStrength = strength;
            }
          });

          if (!bestStrength) return null;

          return {
            text: `Is your Pokémon strong against ${bestStrength.charAt(0).toUpperCase() + bestStrength.slice(1)} types?`,
            type: 'strength',
            stringValue: bestStrength,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (!question.stringValue) return pokemon;
          const targetStrength = question.stringValue;

          if (response === 'yes') {
            return pokemon.filter(p => p.strengths.includes(targetStrength));
          } else {
            return pokemon.filter(p => !p.strengths.includes(targetStrength));
          }
        },
      },

      // Color questions
      {
        type: 'color',
        generateQuestion: (pokemon: SimplePokemon[]) => {
          // Find the color that gives the best split
          const colorCount: Record<string, number> = {};
          pokemon.forEach(p => {
            if (p.color !== 'unknown') {
              colorCount[p.color] = (colorCount[p.color] || 0) + 1;
            }
          });

          // Find color closest to 50% split
          let bestColor = '';
          let bestSplit = Infinity;
          const targetSplit = pokemon.length / 2;

          Object.entries(colorCount).forEach(([color, count]) => {
            const splitDiff = Math.abs(count - targetSplit);
            if (splitDiff < bestSplit && count > 0) {
              bestSplit = splitDiff;
              bestColor = color;
            }
          });

          if (!bestColor) return null;

          return {
            text: `Is your Pokémon primarily ${bestColor}?`,
            type: 'color',
            stringValue: bestColor,
          };
        },
        filterPokemon: (
          pokemon: SimplePokemon[],
          question: Question,
          response: 'yes' | 'no'
        ) => {
          if (!question.stringValue) return pokemon;
          const targetColor = question.stringValue;

          if (response === 'yes') {
            return pokemon.filter(p => p.color === targetColor);
          } else {
            return pokemon.filter(p => p.color !== targetColor);
          }
        },
      },
    ];
  }

  // Generate the next question using the best available strategy
  private async generateNextQuestion(): Promise<void> {
    if (this.gameState.possiblePokemon.length <= 1) {
      await this.completeGame();
      return;
    }

    if (this.gameState.answers.length >= 20) {
      await this.completeGame();
      return;
    }

    // Log remaining Pokemon if count is low
    if (this.gameState.possiblePokemon.length <= 10) {
      console.log(
        `Remaining Pokemon (${this.gameState.possiblePokemon.length.toString()}):`,
        this.gameState.possiblePokemon
          .map(p => `${p.name}(id:${p.id.toString()})`)
          .join(', ')
      );
    }

    const strategies = this.getQuestionStrategies();

    let bestQuestion: Question | null = null;
    let bestSplit = Infinity;
    const maxAttempts = 10; // Prevent infinite loops
    let questionsConsidered = 0;
    let questionsSkippedRepeated = 0;
    let questionsSkippedNoSplit = 0;

    // Try each strategy and pick the one that gives the best split
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`\n--- Attempt ${(attempt + 1).toString()} ---`);

      // Recalculate available strategies for each attempt (important after reset)
      const availableStrategies = strategies.filter(
        s => !this.usedQuestionTypes.has(s.type)
      );
      const strategiesToUse =
        availableStrategies.length > 0 ? availableStrategies : strategies;

      console.log(
        `Available question types: ${availableStrategies.map(s => s.type).join(', ')}`
      );
      console.log(
        `Used question types: ${Array.from(this.usedQuestionTypes).join(', ')}`
      );
      console.log(
        `Asked questions count: ${this.askedQuestions.size.toString()}`
      );
      console.log(
        `Strategies to use this attempt: ${strategiesToUse.map(s => s.type).join(', ')}`
      );

      for (const strategy of strategiesToUse) {
        const question = strategy.generateQuestion(
          this.gameState.possiblePokemon
        );
        if (!question) {
          console.log(`Strategy ${strategy.type}: No question generated`);
          continue;
        }

        questionsConsidered++;
        console.log(
          `Strategy ${strategy.type}: Generated question "${question.text}"`
        );

        // Check if we've already asked this exact question
        const questionKey = `${question.type}:${question.text}`;
        if (this.askedQuestions.has(questionKey)) {
          console.log(`  -> Skipped: Already asked this question`);
          questionsSkippedRepeated++;
          continue;
        }

        // Calculate how good the split would be for yes/no answers
        const yesFiltered = strategy.filterPokemon(
          this.gameState.possiblePokemon,
          question,
          'yes'
        );
        const noFiltered = strategy.filterPokemon(
          this.gameState.possiblePokemon,
          question,
          'no'
        );

        console.log(
          `  -> Split: YES=${yesFiltered.length.toString()}, NO=${noFiltered.length.toString()}`
        );

        const splitDiff = Math.abs(yesFiltered.length - noFiltered.length);

        // Skip questions that don't provide any useful split
        if (yesFiltered.length === 0 || noFiltered.length === 0) {
          console.log(`  -> Skipped: No useful split (one side has 0 Pokemon)`);
          questionsSkippedNoSplit++;
          continue;
        }

        // Prefer questions that split closer to 50/50
        if (splitDiff < bestSplit) {
          bestSplit = splitDiff;
          bestQuestion = question;
          console.log(
            `  -> New best question! Split diff: ${splitDiff.toString()}`
          );
        } else {
          console.log(
            `  -> Not better than current best (split diff: ${splitDiff.toString()} vs ${bestSplit.toString()})`
          );
        }
      }

      // If we found a good question, use it
      if (bestQuestion) {
        console.log(
          `Found good question after ${(attempt + 1).toString()} attempts`
        );
        break;
      }

      // If no good question found, reset used question types and try again
      if (attempt === 0) {
        console.log('No good questions found, resetting used question types');
        this.usedQuestionTypes.clear();
        console.log(
          `After reset - All question types now available: ${strategies.map(s => s.type).join(', ')}`
        );
      }
    }

    console.log(`\nQuestion generation summary:`);
    console.log(`  Questions considered: ${questionsConsidered.toString()}`);
    console.log(`  Skipped (repeated): ${questionsSkippedRepeated.toString()}`);
    console.log(`  Skipped (no split): ${questionsSkippedNoSplit.toString()}`);
    console.log(`  Best question found: ${bestQuestion ? 'YES' : 'NO'}`);

    if (bestQuestion) {
      this.gameState.currentQuestion = bestQuestion;
      this.usedQuestionTypes.add(bestQuestion.type);

      // Track this specific question to avoid repeating it
      const questionKey = `${bestQuestion.type}:${bestQuestion.text}`;
      this.askedQuestions.add(questionKey);

      console.log(
        `Selected question: "${bestQuestion.text}" (type: ${bestQuestion.type})`
      );
    } else {
      // Fallback: if we really can't find any good questions, just complete the game
      console.log('Could not generate any valid questions, completing game');
      await this.completeGame();
    }
  }

  // Process an answer and update the game state
  async answerQuestion(response: 'yes' | 'no' | 'unknown'): Promise<void> {
    if (!this.gameState.currentQuestion || this.gameState.gameComplete) {
      return;
    }

    const answer: AnsweredQuestion = {
      response,
      question: this.gameState.currentQuestion,
    };

    this.gameState.answers.push(answer);

    const previousCount = this.gameState.possiblePokemon.length;

    // Filter possible Pokemon based on the answer
    if (response !== 'unknown') {
      const strategies = this.getQuestionStrategies();
      const strategy = strategies.find(
        s => s.type === this.gameState.currentQuestion?.type
      );

      if (strategy) {
        this.gameState.possiblePokemon = strategy.filterPokemon(
          this.gameState.possiblePokemon,
          this.gameState.currentQuestion,
          response
        );
      }
    }

    const newCount = this.gameState.possiblePokemon.length;
    console.log(
      `Question answered: "${this.gameState.currentQuestion.text}" -> ${response}`
    );
    console.log(
      `Pokemon count: ${previousCount.toString()} -> ${newCount.toString()}`
    );

    // If the Pokemon count didn't change and we answered yes/no, there might be an issue
    if (response !== 'unknown' && previousCount === newCount) {
      console.warn(
        'Warning: Pokemon count unchanged after yes/no answer - possible filtering issue'
      );
    }

    // Generate next question or complete game
    await this.generateNextQuestion();
  }

  // Complete the game and make a guess
  private async completeGame(): Promise<void> {
    this.gameState.gameComplete = true;
    this.gameState.currentQuestion = null; // Clear the current question

    if (this.gameState.possiblePokemon.length > 0) {
      // Pick the first remaining Pokemon as our guess
      const guessedSimple = this.gameState.possiblePokemon[0];
      try {
        this.gameState.guessedPokemon = await getPokemonById(guessedSimple.id);
      } catch (error) {
        console.error('Failed to load guessed Pokemon details:', error);
        // Fallback: create a minimal Pokemon object from SimplePokemon data
        this.gameState.guessedPokemon = {
          id: guessedSimple.id,
          name: guessedSimple.name,
          height: guessedSimple.height,
          weight: guessedSimple.weight,
          base_experience: 0,
          species: { name: guessedSimple.name, url: '' },
          abilities: [],
          stats: [],
          types: guessedSimple.types.map((type, index) => ({
            slot: index + 1,
            type: { name: type, url: '' },
          })),
          sprites: {
            back_default: null,
            back_female: null,
            back_shiny: null,
            back_shiny_female: null,
            front_default: null,
            front_female: null,
            front_shiny: null,
            front_shiny_female: null,
          },
        };
      }
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
