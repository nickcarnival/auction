import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS, Step, CallBackProps } from 'react-joyride';

interface TourContextType {
  isRunning: boolean;
  currentStep: number;
  startTour: () => void;
  stopTour: () => void;
  resetTour: () => void;
  hasCompletedTour: boolean;
  setTourCompleted: (completed: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

// Tour steps configuration
const tourSteps: Step[] = [
  {
    target: '[data-tour="dashboard-welcome"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to your Dashboard! 🎉</h3>
        <p>
          Great job setting up your account! Let's take a quick tour to show you the key features
          that will help you manage your business effectively.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-schedule"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">📅 Schedule & Calendar</h3>
        <p>
          This is your main calendar view where you'll see all appointments. Use{' '}
          <strong>Team</strong> in the main nav to add technicians so each person gets a column
          on the schedule.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-team"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">👥 Team</h3>
        <p>
          Open <strong>Team</strong> to manage technicians, dashboard logins (managers), and the
          team overview. The left sidebar lists everyone; settings like hours and billing live under{' '}
          <strong>Settings</strong>.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="calendar-click-demo"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">✨ Creating Appointments</h3>
        <p>
          <strong>Try it now!</strong> Click on any empty slot in the calendar to create a new
          appointment. This is the primary way you'll schedule bookings for your customers.
        </p>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="nav-customers"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">👤 Customer Management</h3>
        <p>
          Keep track of all your customers, their contact information, and appointment history in
          one place.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-settings"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">⚙️ Settings</h3>
        <p>
          Open <strong>Settings</strong> for Operations, your public booking page, billing, data
          export, and notification preferences. The same left sidebar also links back to{' '}
          <strong>Team</strong> when you need your roster.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="trial-status"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">🎯 You're All Set!</h3>
        <p>
          You're currently on a trial account with full access to all features. Start creating
          appointments and managing your business!
        </p>
      </div>
    ),
    placement: 'bottom',
  },
];

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(
    localStorage.getItem('tour-completed') === 'true'
  );

  const startTour = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
  }, []);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTour = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
    setHasCompletedTour(false);
    localStorage.removeItem('tour-completed');
  }, []);

  const setTourCompleted = useCallback((completed: boolean) => {
    setHasCompletedTour(completed);
    if (completed) {
      localStorage.setItem('tour-completed', 'true');
    } else {
      localStorage.removeItem('tour-completed');
    }
  }, []);

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        setCurrentStep(index + (action === ACTIONS.PREV ? -1 : 1));
      } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setIsRunning(false);
        setTourCompleted(true);
      } else if (status === STATUS.ERROR) {
        // Continue tour even if target not found
        setCurrentStep(currentStep + 1);
      }
    },
    [currentStep, setTourCompleted]
  );

  return (
    <TourContext.Provider
      value={{
        isRunning,
        currentStep,
        startTour,
        stopTour,
        resetTour,
        hasCompletedTour,
        setTourCompleted,
      }}
    >
      {children}
      <Joyride
        steps={tourSteps}
        run={isRunning}
        stepIndex={currentStep}
        callback={handleJoyrideCallback}
        continuous
        showSkipButton
        showProgress
        styles={{
          options: {
            /* Matches `--brand-accent` in global.css (Joyride needs literals) */
            primaryColor: 'hsl(33, 20%, 20%)',
            zIndex: 10000,
          },
          tooltip: {
            fontSize: 14,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: 'hsl(33, 20%, 20%)',
            fontSize: 14,
          },
          buttonBack: {
            marginRight: 10,
            fontSize: 14,
          },
        }}
        locale={{
          back: 'Previous',
          close: 'Close',
          last: 'Finish Tour',
          next: 'Next',
          open: 'Open',
          skip: 'Skip Tour',
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
