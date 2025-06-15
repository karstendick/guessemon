import { useState, useEffect, useRef } from 'react';
import { PokemonGameEngine } from './gameEngine';
import type { GameState, EliminationExplanation } from './types/pokemon';
import { buildUrl, capitalize } from './utils';
import './App.css';

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

  const handleAnswer = async (response: 'yes' | 'no' | 'unknown') => {
    await gameEngine.answerQuestion(response);
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

  const getPokemonImageUrl = (
    pokemonId: number,
    pokemonName: string
  ): string => {
    return buildUrl(
      `/images/pokemon/${pokemonId.toString()}-${pokemonName}/official-artwork.png`
    );
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
                    void handleAnswer('yes');
                  }}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  className="answer-button no"
                  onClick={() => {
                    void handleAnswer('no');
                  }}
                >
                  ❌ No
                </button>
                <button
                  type="button"
                  className="answer-button unknown"
                  onClick={() => {
                    void handleAnswer('unknown');
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
