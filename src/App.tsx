import { useState, useEffect, useRef } from 'react';
import { PokemonGameEngine } from './gameEngine';
import type { GameState } from './types/pokemon';
import './App.css';

function App() {
  const [gameEngine] = useState(() => new PokemonGameEngine());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

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
    return `/images/pokemon/${pokemonId.toString()}-${pokemonName}/official-artwork.png`;
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
          <h1>🎮 Pokémon 20 Questions</h1>
          <div className="progress-info">
            <span>Question {gameState.answers.length + 1} of 20</span>
            <span>•</span>
            <span>
              {gameEngine.getRemainingCount()} possibilities remaining
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
            <div key={answer.question.text} className="question-card answered">
              <div className="question-header">
                <span className="question-number">Q{index + 1}</span>
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
                  Q{gameState.answers.length + 1}
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
                      {gameState.guessedPokemon.name.charAt(0).toUpperCase() +
                        gameState.guessedPokemon.name.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="pokemon-info">
                  <h3>
                    {gameState.guessedPokemon.name.charAt(0).toUpperCase() +
                      gameState.guessedPokemon.name.slice(1)}
                  </h3>
                  <p className="pokemon-number">
                    #{gameState.guessedPokemon.id.toString().padStart(3, '0')}
                  </p>
                  <p className="game-stats">
                    Solved in {gameState.answers.length} question
                    {gameState.answers.length !== 1 ? 's' : ''}!
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="play-again-button"
                onClick={resetGame}
              >
                🎮 Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
