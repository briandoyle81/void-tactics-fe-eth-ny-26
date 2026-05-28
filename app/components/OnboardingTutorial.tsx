"use client";

import React, { createContext, useContext } from "react";
import { useOnboardingTutorial } from "../hooks/useOnboardingTutorial";
import {
  TutorialContextValue,
  TUTORIAL_STEP_STORAGE_KEY,
  getTutorialAnalyticsRewardPath,
} from "../types/onboarding";
import { SimulatedGameDisplay } from "./SimulatedGameDisplay";
import posthog from "posthog-js";

// Create context for tutorial
const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error(
      "useTutorialContext must be used within OnboardingTutorial",
    );
  }
  return context;
}

interface OnboardingTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTutorial({
  onComplete,
  onSkip,
}: OnboardingTutorialProps) {
  const tutorialContext = useOnboardingTutorial();

  const {
    currentStep,
    currentStepIndex,
    displayStepNumber,
    rescueCompletionBranch,
  } = tutorialContext;

  const handleSkip = () => {
    const stepId = currentStep?.id ?? "unknown";
    const rewardPath = getTutorialAnalyticsRewardPath(
      stepId,
      rescueCompletionBranch,
    );
    posthog.capture("tutorial_abandoned", {
      step_id: stepId,
      step_index: currentStepIndex,
      display_step_number: displayStepNumber,
      rescue_branch: rescueCompletionBranch,
      reward_path: rewardPath,
    });
    // Clear saved step index when quitting the tutorial.
    if (typeof window !== "undefined") {
      localStorage.removeItem(TUTORIAL_STEP_STORAGE_KEY);
    }
    onSkip?.();
  };

  return (
    <TutorialContext.Provider value={tutorialContext}>
      <div className="relative h-full w-full overflow-hidden">
        {!currentStep ? (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="text-cyan font-mono">Loading tutorial...</div>
          </div>
        ) : (
          <>
            <SimulatedGameDisplay
              tutorialContext={tutorialContext}
              onBack={handleSkip}
            />

          </>
        )}
      </div>
    </TutorialContext.Provider>
  );
}
