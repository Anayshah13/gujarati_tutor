import React, { useState, useEffect } from 'react';
import BKT from './bkt.js';
import questionsData from './gujarati_questions.json';

function App() {
  const [level, setLevel] = useState(null); // 'primary' or 'highschool'
  const [bktState, setBktState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState([]);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  
  const [activeTab, setActiveTab] = useState('quiz'); // 'quiz', 'features'

  useEffect(() => {
    // If state is already initialized and level is set, load first question
    if (level && bktState && !currentQuestion) {
      loadNextQuestion(bktState, []);
    }
  }, [level, bktState]);

  const handleLevelSelect = (selectedLevel) => {
    setLevel(selectedLevel);
    const newState = BKT.initBKTState(selectedLevel);
    setBktState(newState);
    setUsedQuestionIds([]);
  };

  const loadNextQuestion = (state, usedIds) => {
    const weakestSkill = BKT.getWeakestSkill(state);
    let question = BKT.selectQuestion(questionsData, state, weakestSkill, usedIds);
    
    // If we exhausted questions for the weakest skill, just pick a random one we haven't done
    if (!question) {
      const remaining = questionsData.filter(q => !usedIds.includes(q.id));
      if (remaining.length > 0) {
        question = remaining[Math.floor(Math.random() * remaining.length)];
      } else {
        // Reset used questions if all are done
        setUsedQuestionIds([]);
        question = questionsData[Math.floor(Math.random() * questionsData.length)];
      }
    }
    
    setCurrentQuestion(question);
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionSelect = (option) => {
    if (selectedOption !== null) return; // Prevent multiple selections
    
    const correct = option === currentQuestion.answer;
    setSelectedOption(option);
    setIsCorrect(correct);
    
    // Update BKT State
    const updatedState = BKT.updateBKT({ ...bktState }, currentQuestion.skill, correct);
    setBktState(updatedState);
  };

  const handleNextQuestion = () => {
    const newUsedIds = [...usedQuestionIds, currentQuestion.id];
    setUsedQuestionIds(newUsedIds);
    loadNextQuestion(bktState, newUsedIds);
  };

  if (!level) {
    return (
      <div className="app-container">
        <div className="onboarding-container fade-in">
          <h1 className="onboarding-title">Welcome to Gujarati Tutor</h1>
          <p className="onboarding-subtitle">To personalize your learning journey, please tell us about yourself.</p>
          
          <div className="level-cards">
            <div className="level-card" onClick={() => handleLevelSelect('primary')}>
              <div className="level-icon">🎒</div>
              <h2 className="level-title">Primary School</h2>
              <p className="level-desc">Start with the basics. Easy questions to build your foundation in Gujarati.</p>
            </div>
            
            <div className="level-card" onClick={() => handleLevelSelect('highschool')}>
              <div className="level-icon">📚</div>
              <h2 className="level-title">High School</h2>
              <p className="level-desc">Jump straight into medium difficulty and refine your language skills.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bktSummary = bktState ? BKT.getBKTSummary(bktState) : [];

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <span>🐘</span> Gujarati Tutor
        </div>
        <div className="nav-links">
          <span 
            className={`nav-link ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            Quiz
          </span>
          <span 
            className={`nav-link ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            More Features
          </span>
        </div>
      </nav>

      {/* Main Content */}
      {activeTab === 'quiz' ? (
        <div className="quiz-layout fade-in">
          <div className="main-content">
            {currentQuestion && (
              <div className="question-card">
                <div className="skill-badge">{currentQuestion.skill.replace('_', ' ')}</div>
                <h3 className="question-text">{currentQuestion.translation}</h3>
                <div className="gujarati-text">
                  {currentQuestion.question}
                </div>
                
                <div className="options-grid">
                  {currentQuestion.options.map((option, index) => {
                    let btnClass = "option-btn";
                    if (selectedOption === option) {
                      btnClass += isCorrect ? " correct" : " incorrect";
                    } else if (selectedOption !== null && option === currentQuestion.answer) {
                      btnClass += " correct"; // highlight correct answer if wrong one selected
                    }
                    
                    return (
                      <button 
                        key={index}
                        className={btnClass}
                        onClick={() => handleOptionSelect(option)}
                        disabled={selectedOption !== null}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                
                {selectedOption !== null && (
                  <button className="next-btn fade-in" onClick={handleNextQuestion}>
                    Next Question
                  </button>
                )}
              </div>
            )}
            
            {/* Progress Panel */}
            <div className="progress-panel">
              <div className="progress-title">
                <span>Skill Mastery</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>
                  Target: 95%
                </span>
              </div>
              
              {bktSummary.map((skillItem) => (
                <div className="skill-progress-item" key={skillItem.skill}>
                  <div className="skill-label-row">
                    <span className="skill-name">{skillItem.skill.replace('_', ' ')}</span>
                    <span className="skill-value">
                      {(skillItem.pL * 100).toFixed(0)}%
                      {skillItem.mastered && <span className="mastery-check">✓</span>}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className={`progress-bar-fill ${skillItem.mastered ? 'mastered' : ''}`} 
                      style={{ width: `${Math.min(skillItem.pL * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="onboarding-container fade-in">
          <h2 className="onboarding-title">Coming Soon</h2>
          <p className="onboarding-subtitle">More exciting features to learn Gujarati are on the way.</p>
        </div>
      )}
    </div>
  );
}

export default App;
