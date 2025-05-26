import { useState, useRef, useEffect } from 'react';
import './App.css';

// Mock questions for now
const mockQuestions = [
  'Is your Pokémon a Fire type?',
  'Does your Pokémon evolve?',
  'Is your Pokémon from Generation 1?',
  'Does your Pokémon have wings?',
  'Is your Pokémon taller than 3 feet?',
  'Does your Pokémon learn Electric-type moves?',
  'Is your Pokémon a legendary?',
  'Does your Pokémon have multiple forms?',
  'Is your Pokémon primarily blue in color?',
  'Does your Pokémon live in water?',
];

type Answer = 'yes' | 'no' | 'unknown';

interface QuestionAnswer {
  question: string;
  answer: Answer;
}

function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionAnswer[]>(
    []
  );
  const [gameStarted, setGameStarted] = useState(false);
  const currentQuestionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current question when it changes
  useEffect(() => {
    if (currentQuestionRef.current && gameStarted) {
      currentQuestionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [answeredQuestions.length, gameStarted]);

  const handleAnswer = (answer: Answer) => {
    const currentQuestion = mockQuestions[currentQuestionIndex];
    console.log(
      `Question ${(answeredQuestions.length + 1).toString()}: ${currentQuestion} - Answer: ${answer}`
    );

    // Add the answered question to our list
    setAnsweredQuestions(prev => [
      ...prev,
      { question: currentQuestion, answer },
    ]);

    // Move to next question
    const nextQuestionIndex = (currentQuestionIndex + 1) % mockQuestions.length;
    setCurrentQuestionIndex(nextQuestionIndex);

    // Check if we've reached 20 questions
    if (answeredQuestions.length >= 19) {
      alert('Game over! I would make a guess here based on your answers.');
      resetGame();
    }
  };

  const resetGame = () => {
    setCurrentQuestionIndex(0);
    setAnsweredQuestions([]);
    setGameStarted(false);
  };

  const startGame = () => {
    setGameStarted(true);
    setCurrentQuestionIndex(0);
    setAnsweredQuestions([]);
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
                <li>I'll try to guess your Pokémon within 20 questions!</li>
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
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(((answeredQuestions.length + 1) / 20) * 100).toString()}%`,
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
          <div ref={currentQuestionRef} className="question-card current">
            <div className="question-header">
              <span className="question-number">
                Q{(answeredQuestions.length + 1).toString()}
              </span>
            </div>
            <h2 className="question-text">
              {mockQuestions[currentQuestionIndex]}
            </h2>

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
        </div>

        <div className="game-controls">
          <button type="button" className="reset-button" onClick={resetGame}>
            🔄 Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
