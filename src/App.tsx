import { useState, useRef, useEffect } from 'react';
import './App.css';
import { PokemonGameEngine } from './gameEngine';
import type { Answer } from './types/pokemon';

interface QuestionAnswer {
  question: string;
  answer: Answer;
}

function App() {
  const [gameEngine] = useState(() => new PokemonGameEngine());
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionAnswer[]>(
    []
  );
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [finalGuess, setFinalGuess] = useState<string>('');
  const [finalGuessId, setFinalGuessId] = useState<number | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const currentQuestionRef = useRef<HTMLDivElement>(null);
  const gameResultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current question when it changes
  useEffect(() => {
    if (currentQuestionRef.current && gameStarted && !gameComplete) {
      currentQuestionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [answeredQuestions.length, gameStarted, gameComplete]);

  // Auto-scroll to game result when game completes
  useEffect(() => {
    if (gameResultRef.current && gameComplete) {
      setTimeout(() => {
        gameResultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300); // Small delay to ensure the element is rendered
    }
  }, [gameComplete]);

  const handleAnswer = (answer: Answer) => {
    if (!currentQuestion) return;

    console.log(`Question: ${currentQuestion} - Answer: ${answer}`);

    // Add the answered question to our list
    setAnsweredQuestions(prev => [
      ...prev,
      { question: currentQuestion, answer },
    ]);

    // Process the answer through the game engine
    gameEngine.answerQuestion(answer);

    // Update the UI based on the new game state
    updateGameState();
  };

  const updateGameState = () => {
    const isComplete = gameEngine.isGameComplete();
    const nextQuestion = gameEngine.getCurrentQuestionText();
    const remaining = gameEngine.getRemainingCount();

    setGameComplete(isComplete);
    setCurrentQuestion(nextQuestion);
    setRemainingCount(remaining);

    if (isComplete) {
      const guess = gameEngine.getFinalGuess();
      if (guess) {
        setFinalGuess(guess.name);
        setFinalGuessId(guess.id);
      }
    }
  };

  const resetGame = () => {
    setAnsweredQuestions([]);
    setGameStarted(false);
    setGameComplete(false);
    setFinalGuess('');
    setFinalGuessId(null);
    setRemainingCount(0);
    gameEngine.resetGame();
  };

  const startGame = () => {
    setGameStarted(true);
    gameEngine.initializeGame();
    updateGameState();
  };

  const getAnswerEmoji = (answer: Answer) => {
    switch (answer) {
      case 'yes':
        return '✅';
      case 'no':
        return '❌';
      case 'unknown':
        return '🤷';
    }
  };

  const getAnswerText = (answer: Answer) => {
    switch (answer) {
      case 'yes':
        return 'Yes';
      case 'no':
        return 'No';
      case 'unknown':
        return "I Don't Know";
    }
  };

  const getPokemonImageUrl = (pokemonId: number, pokemonName: string) => {
    // Use the local cached images from the public directory
    return `/images/pokemon/${pokemonId.toString()}-${pokemonName}/official-artwork.png`;
  };

  const formatPokemonName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (!gameStarted) {
    return (
      <div className="app">
        <div className="game-container">
          <div className="header">
            <h1>🎮 Pokémon 20 Questions</h1>
            <p className="subtitle">
              Think of any Pokémon, and I'll try to guess it!
            </p>
          </div>

          <div className="start-screen">
            <div className="instructions">
              <h2>How to Play:</h2>
              <ol>
                <li>Think of any Pokémon in your mind</li>
                <li>Answer my questions with Yes, No, or I Don't Know</li>
                <li>
                  I'll try to guess your Pokémon using smart questions about
                  weight!
                </li>
              </ol>
            </div>

            <button type="button" className="start-button" onClick={startGame}>
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>🎮 Pokémon 20 Questions</h1>
          <div className="progress">
            <span>
              Question {(answeredQuestions.length + 1).toString()} of 20
            </span>
            <div className="progress-info">
              <span>Remaining possibilities: {remainingCount.toString()}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(
                    ((answeredQuestions.length + 1) / 20) *
                    100
                  ).toString()}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="questions-list">
          {/* Previous questions (grayed out) */}
          {answeredQuestions.map((qa, index) => (
            <div
              key={`question-${qa.question.replace(/\s+/g, '-').toLowerCase()}-${qa.answer}`}
              className="question-card answered"
            >
              <div className="question-header">
                <span className="question-number">
                  Q{(index + 1).toString()}
                </span>
                <span className="answer-badge">
                  {getAnswerEmoji(qa.answer)} {getAnswerText(qa.answer)}
                </span>
              </div>
              <h3 className="question-text">{qa.question}</h3>
            </div>
          ))}

          {/* Current question (interactive) */}
          {currentQuestion && !gameComplete && (
            <div ref={currentQuestionRef} className="question-card current">
              <div className="question-header">
                <span className="question-number">
                  Q{(answeredQuestions.length + 1).toString()}
                </span>
              </div>
              <h2 className="question-text">{currentQuestion}</h2>

              <div className="answer-buttons">
                <button
                  type="button"
                  className="answer-btn yes-btn"
                  onClick={() => {
                    handleAnswer('yes');
                  }}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  className="answer-btn no-btn"
                  onClick={() => {
                    handleAnswer('no');
                  }}
                >
                  ❌ No
                </button>
                <button
                  type="button"
                  className="answer-btn unknown-btn"
                  onClick={() => {
                    handleAnswer('unknown');
                  }}
                >
                  🤷 I Don't Know
                </button>
              </div>
            </div>
          )}

          {/* Game result (when complete) */}
          {gameComplete && finalGuess && finalGuessId && (
            <div ref={gameResultRef} className="game-result">
              <div className="result-header">
                <h2>🎉 I think your Pokémon is...</h2>
              </div>
              <div className="pokemon-guess">
                <div className="pokemon-image">
                  <img
                    src={getPokemonImageUrl(finalGuessId, finalGuess)}
                    alt={formatPokemonName(finalGuess)}
                    onError={e => {
                      // If the local image fails, replace with a text placeholder
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = `
                          <div class="image-placeholder">
                            <div class="placeholder-text">
                              <span class="pokemon-icon">🎮</span>
                              <span class="pokemon-name-fallback">${formatPokemonName(finalGuess)}</span>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
                <div className="pokemon-name">
                  <h3>{formatPokemonName(finalGuess)}</h3>
                  <p>#{finalGuessId.toString().padStart(3, '0')}</p>
                </div>
              </div>
              <div className="result-stats">
                <p>
                  I used <strong>{answeredQuestions.length}</strong> questions
                  to find your Pokémon!
                </p>
                <p>Binary search on weight is pretty efficient! 🧠</p>
              </div>
            </div>
          )}

          {/* No guess found */}
          {gameComplete && !finalGuess && (
            <div ref={gameResultRef} className="game-result">
              <div className="result-header">
                <h2>🤔 Hmm...</h2>
              </div>
              <div className="no-guess">
                <p>I couldn't narrow it down to a single Pokémon.</p>
                <p>Let's try again with a different approach!</p>
              </div>
            </div>
          )}
        </div>

        <div className="game-controls">
          <button type="button" className="reset-button" onClick={resetGame}>
            🔄 {gameComplete ? 'Play Again' : 'Reset Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
