import React, { useState, useEffect, useRef } from 'react';
import { PokemonGameEngine } from './gameEngine';
import type {
  GameState,
  EliminationExplanation,
  SimplePokemon,
} from './types/pokemon';
import { buildUrl, capitalize } from './utils';
import './App.css';

interface EvolutionNode {
  pokemon: SimplePokemon;
  evolutions: EvolutionNode[];
}

// Helper function to get Pokemon image URL
const getPokemonImageUrl = (id: number, name: string): string => {
  return buildUrl(
    `/images/pokemon/${id.toString()}-${name}/official-artwork.png`
  );
};

// Recursive component to render evolution tree nodes
const EvolutionTreeNode: React.FC<{
  node: EvolutionNode;
  currentPokemonId: number;
}> = ({ node, currentPokemonId }) => {
  const isCurrent = node.pokemon.id === currentPokemonId;
  const hasEvolutions = node.evolutions.length > 0;

  return (
    <div className="evolution-node">
      <div className={`evolution-stage ${isCurrent ? 'current' : ''}`}>
        <div className="evolution-image">
          <img
            src={getPokemonImageUrl(node.pokemon.id, node.pokemon.name)}
            alt={node.pokemon.name}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        <div className="evolution-name">{capitalize(node.pokemon.name)}</div>
      </div>

      {hasEvolutions && (
        <>
          <div className="evolution-arrow">→</div>
          <div className="evolution-branches">
            {node.evolutions.map(evolution => (
              <EvolutionTreeNode
                key={evolution.pokemon.id}
                node={evolution}
                currentPokemonId={currentPokemonId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function App() {
  const [gameEngine] = useState(() => new PokemonGameEngine());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  // New state for the "That's not my Pokémon!" feature
  const [showWrongGuessForm, setShowWrongGuessForm] = useState(false);
  const [enteredPokemon, setEnteredPokemon] = useState('');
  const [pokemonSuggestions, setPokemonSuggestions] = useState<
    {
      id: number;
      name: string;
      displayName: string;
    }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [elimination, setElimination] = useState<EliminationExplanation | null>(
    null
  );

  const currentQuestionRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Initialize the game engine
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await gameEngine.initialize();
        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load Pokemon data'
        );
        setIsLoading(false);
      }
    };

    void initializeGame();
  }, [gameEngine]);

  const startGame = async () => {
    try {
      setIsLoading(true);
      await gameEngine.startNewGame();
      setGameState(gameEngine.getGameState());
      setGameStarted(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setIsLoading(false);
    }
  };

  const handleAnswer = (response: 'yes' | 'no' | 'unknown') => {
    gameEngine.answerQuestion(response);
    setGameState(gameEngine.getGameState());
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState(null);
    setShowWrongGuessForm(false);
    setEnteredPokemon('');
    setElimination(null);
    setPokemonSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle showing the wrong guess form
  const handleWrongGuess = () => {
    setShowWrongGuessForm(true);
    setEnteredPokemon('');
    setElimination(null);
  };

  // Handle Pokemon input changes with suggestions
  const handlePokemonInput = (value: string) => {
    setEnteredPokemon(value);

    if (value.length >= 2) {
      const allPokemon = gameEngine.getAllPokemonForSuggestions();
      const filtered = allPokemon
        .filter(pokemon =>
          pokemon.displayName.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 10); // Limit to 10 suggestions
      setPokemonSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setPokemonSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle selecting a suggestion
  const handleSuggestionClick = (pokemonName: string) => {
    setEnteredPokemon(pokemonName);
    setShowSuggestions(false);
    setPokemonSuggestions([]);
  };

  // Handle explaining why the entered Pokemon was eliminated
  const handleExplainElimination = () => {
    if (!enteredPokemon.trim()) return;

    const result = gameEngine.explainWhyPokemonWasEliminated(
      enteredPokemon.trim()
    );
    setElimination(result);
    setShowSuggestions(false);
  };

  // Handle canceling the wrong guess form
  const handleCancelWrongGuess = () => {
    setShowWrongGuessForm(false);
    setEnteredPokemon('');
    setElimination(null);
    setPokemonSuggestions([]);
    setShowSuggestions(false);
  };

  // Auto-scroll to current question when it changes
  useEffect(() => {
    if (gameState?.currentQuestion && currentQuestionRef.current) {
      setTimeout(() => {
        currentQuestionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [gameState?.currentQuestion]);

  // Auto-scroll to result when game completes
  useEffect(() => {
    if (gameState?.gameComplete && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [gameState?.gameComplete]);

  // Helper functions for formatting Pokemon data
  const formatHeight = (decimeters: number): string => {
    const meters = decimeters / 10;
    return `${meters.toFixed(1)} m`;
  };

  const formatWeight = (hectograms: number): string => {
    const kg = hectograms / 10;
    return `${kg.toFixed(1)} kg`;
  };

  const getRegionName = (generation: number): string => {
    const regionNames = [
      '', // index 0 unused
      'Kanto', // Gen 1
      'Johto', // Gen 2
      'Hoenn', // Gen 3
      'Sinnoh', // Gen 4
      'Unova', // Gen 5
      'Kalos', // Gen 6
      'Alola', // Gen 7
      'Galar', // Gen 8
      'Paldea', // Gen 9
    ];
    return regionNames[generation] || `Generation ${generation.toString()}`;
  };

  const getEvolutionTree = (pokemon: SimplePokemon): EvolutionNode | null => {
    if (!pokemon.evolutionChainId || !gameState) {
      return null;
    }

    // Get all Pokemon from the game engine
    const allPokemon = gameEngine.getAllPokemon();

    // Find all Pokemon in the same evolution chain
    const chainPokemon = allPokemon.filter(
      p => p.evolutionChainId === pokemon.evolutionChainId
    );

    if (chainPokemon.length <= 1) {
      return null; // No evolution chain to show
    }

    // Build a map of evolvesFromSpecies to Pokemon
    const evolutionMap = new Map<string | null, SimplePokemon[]>();
    chainPokemon.forEach(p => {
      const from = p.evolvesFromSpecies;
      const existingList = evolutionMap.get(from) ?? [];
      evolutionMap.set(from, [...existingList, p]);
    });

    // Find the base Pokemon (the one that doesn't evolve from anything)
    const basePokemon = evolutionMap.get(null)?.[0];
    if (!basePokemon) {
      return null;
    }

    // Recursively build the evolution tree
    const buildTree = (current: SimplePokemon): EvolutionNode => {
      const evolutions = evolutionMap.get(current.name) ?? [];
      return {
        pokemon: current,
        evolutions: evolutions.map(evo => buildTree(evo)),
      };
    };

    return buildTree(basePokemon);
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading-card">
            <h1>🔄 Loading Pokemon Data...</h1>
            <p>Please wait while we load all Pokemon information.</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="container">
          <div className="error-card">
            <h1>❌ Error</h1>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameStarted || !gameState) {
    return (
      <div className="app">
        <div className="container">
          <div className="start-screen">
            <h1>🎮 Pokémon 20 Questions</h1>
            <div className="instructions">
              <p>
                Think of any Pokémon, and I'll try to guess it in 20 questions
                or less!
              </p>
              <p>Answer each question with:</p>
              <ul>
                <li>
                  <strong>Yes</strong> - if the answer is definitely yes
                </li>
                <li>
                  <strong>No</strong> - if the answer is definitely no
                </li>
                <li>
                  <strong>I Don't Know</strong> - if you're unsure
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="start-button"
              onClick={() => {
                void startGame();
              }}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="game-header">
          <h1>🎮 Guessémon: Pokémon 20 Questions</h1>
          <div className="progress-info">
            <span>
              Question {(gameState.answers.length + 1).toString()} of 20
            </span>
            <span>•</span>
            <span>
              {gameEngine.getRemainingCount().toString()} possibilities
              remaining
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(((gameState.answers.length + 1) / 20) * 100).toString()}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="questions-container">
          {gameState.answers.map((answer, index) => (
            <div
              key={`question-${index.toString()}`}
              className="question-card answered"
            >
              <div className="question-header">
                <span className="question-number">
                  Q{(index + 1).toString()}
                </span>
                <span className={`answer-badge ${answer.response}`}>
                  {answer.response === 'yes'
                    ? '✅ Yes'
                    : answer.response === 'no'
                      ? '❌ No'
                      : "❓ I Don't Know"}
                </span>
              </div>
              <p className="question-text">{answer.question.text}</p>
            </div>
          ))}

          {gameState.currentQuestion && !gameState.gameComplete && (
            <div ref={currentQuestionRef} className="question-card current">
              <div className="question-header">
                <span className="question-number">
                  Q{(gameState.answers.length + 1).toString()}
                </span>
              </div>
              <p className="question-text">{gameState.currentQuestion.text}</p>
              <div className="answer-buttons">
                <button
                  type="button"
                  className="answer-button yes"
                  onClick={() => {
                    handleAnswer('yes');
                  }}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  className="answer-button no"
                  onClick={() => {
                    handleAnswer('no');
                  }}
                >
                  ❌ No
                </button>
                <button
                  type="button"
                  className="answer-button unknown"
                  onClick={() => {
                    handleAnswer('unknown');
                  }}
                >
                  ❓ I Don't Know
                </button>
              </div>
            </div>
          )}

          {gameState.gameComplete && gameState.guessedPokemon && (
            <div ref={resultRef} className="result-card">
              <h2>🎯 My Guess!</h2>
              <div className="pokemon-result">
                <div className="pokemon-image-container">
                  <img
                    src={getPokemonImageUrl(
                      gameState.guessedPokemon.id,
                      gameState.guessedPokemon.name
                    )}
                    alt={gameState.guessedPokemon.name}
                    className="pokemon-image"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder =
                        target.nextElementSibling as HTMLElement | null;
                      placeholder?.style.setProperty('display', 'flex');
                    }}
                  />
                  <div
                    className="image-placeholder"
                    style={{ display: 'none' }}
                  >
                    <span className="pokemon-icon">🎮</span>
                    <span className="pokemon-name-fallback">
                      {capitalize(gameState.guessedPokemon.name)}
                    </span>
                  </div>
                </div>
                <div className="pokemon-info">
                  <h3>{capitalize(gameState.guessedPokemon.name)}</h3>
                  <p className="pokemon-number">
                    #{gameState.guessedPokemon.id.toString().padStart(3, '0')}
                  </p>

                  <div className="pokemon-details">
                    <div className="detail-section">
                      <h4>Physical Attributes</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Height:</span>
                          <span className="detail-value">
                            {formatHeight(gameState.guessedPokemon.height)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Weight:</span>
                          <span className="detail-value">
                            {formatWeight(gameState.guessedPokemon.weight)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Color:</span>
                          <span className="detail-value">
                            {capitalize(gameState.guessedPokemon.color)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>Type</h4>
                      <div className="type-badges">
                        {gameState.guessedPokemon.types.map((type, index) => (
                          <span
                            key={`type-${index.toString()}`}
                            className={`type-badge type-${type}`}
                          >
                            {capitalize(type)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>Region & Classification</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Region:</span>
                          <span className="detail-value">
                            {getRegionName(gameState.guessedPokemon.generation)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Generation:</span>
                          <span className="detail-value">
                            {gameState.guessedPokemon.generation}
                          </span>
                        </div>
                      </div>
                      <div className="classification-badges">
                        {gameState.guessedPokemon.isLegendary && (
                          <span className="classification-badge legendary">
                            Legendary
                          </span>
                        )}
                        {gameState.guessedPokemon.isMythical && (
                          <span className="classification-badge mythical">
                            Mythical
                          </span>
                        )}
                        {gameState.guessedPokemon.isBaby && (
                          <span className="classification-badge baby">
                            Baby
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>Evolution</h4>
                      {(() => {
                        const evolutionTree = getEvolutionTree(
                          gameState.guessedPokemon
                        );
                        if (evolutionTree) {
                          return (
                            <div className="evolution-tree">
                              <EvolutionTreeNode
                                node={evolutionTree}
                                currentPokemonId={gameState.guessedPokemon.id}
                              />
                            </div>
                          );
                        } else {
                          return (
                            <div className="evolution-none">
                              Does not evolve
                            </div>
                          );
                        }
                      })()}
                    </div>

                    <div className="detail-section">
                      <h4>Type Effectiveness</h4>
                      <div className="effectiveness-container">
                        <div className="effectiveness-group">
                          <span className="effectiveness-label">Weak to:</span>
                          <div className="type-badges">
                            {gameState.guessedPokemon.weaknesses.map(
                              (weakness, index) => (
                                <span
                                  key={`weakness-${index.toString()}`}
                                  className={`type-badge type-${weakness} small`}
                                >
                                  {capitalize(weakness)}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="effectiveness-group">
                          <span className="effectiveness-label">
                            Strong against:
                          </span>
                          <div className="type-badges">
                            {gameState.guessedPokemon.strengths.map(
                              (strength, index) => (
                                <span
                                  key={`strength-${index.toString()}`}
                                  className={`type-badge type-${strength} small`}
                                >
                                  {capitalize(strength)}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="game-stats">
                    Solved in {gameState.answers.length} question
                    {gameState.answers.length !== 1 ? 's' : ''}!
                  </p>
                </div>
              </div>

              {!showWrongGuessForm && !elimination && (
                <div className="result-buttons">
                  <button
                    type="button"
                    className="play-again-button"
                    onClick={resetGame}
                  >
                    🎮 Play Again
                  </button>
                  <button
                    type="button"
                    className="wrong-guess-button"
                    onClick={handleWrongGuess}
                  >
                    😅 That's not my Pokémon!
                  </button>
                </div>
              )}

              {showWrongGuessForm && !elimination && (
                <div className="wrong-guess-form">
                  <h3>What Pokémon were you thinking of?</h3>
                  <div className="pokemon-input-container">
                    <input
                      type="text"
                      value={enteredPokemon}
                      onChange={e => {
                        handlePokemonInput(e.target.value);
                      }}
                      placeholder="Enter Pokémon name..."
                      className="pokemon-input"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleExplainElimination();
                        }
                      }}
                    />
                    {showSuggestions && pokemonSuggestions.length > 0 && (
                      <div className="pokemon-suggestions">
                        {pokemonSuggestions.map((suggestion, index) => (
                          <button
                            key={`suggestion-${index.toString()}`}
                            type="button"
                            className="suggestion-item"
                            onClick={() => {
                              handleSuggestionClick(suggestion.name);
                            }}
                          >
                            <div className="suggestion-image-container">
                              <img
                                src={getPokemonImageUrl(
                                  suggestion.id,
                                  suggestion.name
                                )}
                                alt={suggestion.displayName}
                                className="suggestion-image"
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const placeholder =
                                    target.nextElementSibling as HTMLElement | null;
                                  placeholder?.style.setProperty(
                                    'display',
                                    'flex'
                                  );
                                }}
                              />
                              <div
                                className="suggestion-image-placeholder"
                                style={{ display: 'none' }}
                              >
                                🎮
                              </div>
                            </div>
                            <div className="suggestion-info">
                              <span className="suggestion-name">
                                {suggestion.displayName}
                              </span>
                              <span className="suggestion-id">
                                #{suggestion.id.toString().padStart(3, '0')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      className="explain-button"
                      onClick={handleExplainElimination}
                      disabled={!enteredPokemon.trim()}
                    >
                      💡 Explain Why
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={handleCancelWrongGuess}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}

              {elimination && (
                <div className="elimination-explanation">
                  {elimination.found ? (
                    <>
                      <h3>
                        🔍 Why{' '}
                        {elimination.pokemon
                          ? capitalize(elimination.pokemon.name)
                          : 'this Pokémon'}{' '}
                        wasn't guessed:
                      </h3>
                      {elimination.eliminatedBy.length > 0 ? (
                        <div className="elimination-reasons">
                          <p>
                            {elimination.pokemon
                              ? `${capitalize(elimination.pokemon.name)} was eliminated by these questions:`
                              : 'Your Pokémon was eliminated by these questions:'}
                          </p>
                          <ul className="elimination-list">
                            {elimination.eliminatedBy.map((item, index) => (
                              <li
                                key={`elimination-${index.toString()}`}
                                className="elimination-item"
                              >
                                <div className="elimination-question">
                                  <strong>"{item.question}"</strong>
                                  <span
                                    className={`elimination-answer ${item.answer}`}
                                  >
                                    {item.answer === 'yes' ? '✅ Yes' : '❌ No'}
                                  </span>
                                </div>
                                <div className="elimination-reason">
                                  {item.reason}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="no-elimination">
                          Interesting! Your Pokémon wasn't eliminated by any of
                          the questions. It might have been filtered out by an
                          "I Don't Know" answer or there could be an issue with
                          the question logic.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="pokemon-not-found">
                      <h3>🤔 Pokémon not found</h3>
                      <p>
                        I couldn't find a Pokémon named "{enteredPokemon}".
                        Please check the spelling or try again.
                      </p>
                    </div>
                  )}
                  <div className="explanation-buttons">
                    <button
                      type="button"
                      className="play-again-button"
                      onClick={resetGame}
                    >
                      🎮 Play Again
                    </button>
                    <button
                      type="button"
                      className="try-another-button"
                      onClick={() => {
                        setElimination(null);
                        setEnteredPokemon('');
                      }}
                    >
                      🔄 Try Another Pokémon
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
