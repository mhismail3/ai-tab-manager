import React, { useState, useEffect } from 'react';
import { FiX, FiArrowRight, FiCpu, FiTablet, FiLayers, FiBarChart2, FiSave, FiSettings } from 'react-icons/fi';

const ONBOARDING_COMPLETED_KEY = 'ai_tab_manager_onboarding_completed';

const Onboarding = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const steps = [
    {
      title: "Welcome to AI Tab Manager",
      content: "Let's take a quick tour to help you get the most out of your new tab management experience.",
      icon: <FiCpu size={20} />,
      description: "AI Tab Manager uses machine learning to help you organize and manage browser tabs efficiently."
    },
    {
      title: "Tab Organization",
      content: "Easily organize your tabs into logical groups based on their content and your browsing patterns.",
      icon: <FiTablet size={20} />,
      description: "The extension analyzes your open tabs and suggests ways to group them to reduce clutter."
    },
    {
      title: "Tab Groups",
      content: "Create and manage tab groups to keep related content together.",
      icon: <FiLayers size={20} />,
      description: "Groups make it easier to focus on specific tasks without closing unrelated tabs."
    },
    {
      title: "Tab Analytics",
      content: "View detailed analytics about your tab usage patterns.",
      icon: <FiBarChart2 size={20} />,
      description: "Understand your browsing habits and get insights to improve productivity."
    },
    {
      title: "Save Sessions",
      content: "Save your tab groups for later use and quick restoration.",
      icon: <FiSave size={20} />,
      description: "Never lose your work context again - save important tab sessions and restore them anytime."
    }
  ];
  
  useEffect(() => {
    // Check if onboarding has been completed before
    chrome.storage.local.get([ONBOARDING_COMPLETED_KEY], (result) => {
      if (result[ONBOARDING_COMPLETED_KEY]) {
        // User has completed onboarding before, close the modal
        handleClose();
      }
    });
  }, []);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, mark onboarding as completed
      completeOnboarding();
    }
  };
  
  const handleSkip = () => {
    completeOnboarding();
  };
  
  const completeOnboarding = () => {
    // Mark onboarding as completed in storage
    chrome.storage.local.set({ [ONBOARDING_COMPLETED_KEY]: true }, () => {
      handleClose();
    });
  };
  
  const handleClose = () => {
    setIsVisible(false);
    
    // Call the onClose callback after animation
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  if (!isVisible) return null;
  
  const currentStepData = steps[currentStep];
  
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2 className="onboarding-title">AI Tab Manager</h2>
          <button 
            className="btn-icon close-btn" 
            onClick={handleSkip}
            style={{ 
              position: 'absolute', 
              right: '15px', 
              top: '15px',
              background: 'none', 
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            <FiX />
          </button>
        </div>
        
        <div className="onboarding-content">
          <div className="onboarding-step">
            <div className="step-number">{currentStep + 1}</div>
            <div className="step-content">
              <h3>{currentStepData.title}</h3>
              <p>{currentStepData.content}</p>
              
              <div className="feature-highlight">
                <div className="feature-highlight-icon">
                  {currentStepData.icon}
                </div>
                <div className="feature-highlight-content">
                  <h4>Pro Tip</h4>
                  <p>{currentStepData.description}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="onboarding-pagination">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`pagination-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>
        
        <div className="onboarding-footer">
          <button className="onboarding-skip" onClick={handleSkip}>
            Skip Tour
          </button>
          <button className="onboarding-next" onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}
            <FiArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding; 