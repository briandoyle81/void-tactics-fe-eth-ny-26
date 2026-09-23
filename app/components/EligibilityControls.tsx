"use client";

import React from "react";
import {
  EligibilityGatedContract,
  useEligibilityProvider,
  useEligibilityGatedContractOwner,
  useSelfieCheckEligibilityProviderAddress,
} from "../hooks/useEligibilityProviderControls";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { CONTRACT_ABIS, ZERO_ADDRESS } from "../config/contracts";
import type { Abi } from "viem";

const CONTRACT_LABEL: Record<EligibilityGatedContract, string> = {
  FREE_SHIP_CLAIM: "Free Ship Claim",
  TUTORIAL_CLAIM: "Tutorial Completion",
};

function EligibilityToggleCard({ contract }: { contract: EligibilityGatedContract }) {
  const {
    data: providerData,
    error,
    contractAddress,
    isDeployedOnThisChain,
    refetch,
  } = useEligibilityProvider(contract);
  const { owner, isOwner } = useEligibilityGatedContractOwner(contract);
  const selfieCheckAddress = useSelfieCheckEligibilityProviderAddress();

  const provider = typeof providerData === "string" ? providerData : undefined;
  const isVerificationActive = !!provider && provider.toLowerCase() !== ZERO_ADDRESS;
  const canReEnable = selfieCheckAddress !== ZERO_ADDRESS;

  if (!isDeployedOnThisChain) {
    return (
      <div className="bg-steel rounded-none p-3">
        <h4 className="text-white font-mono mb-2">{CONTRACT_LABEL[contract]}</h4>
        <p className="text-text-muted text-sm font-mono">
          Not deployed on this chain.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-steel rounded-none p-3 space-y-2">
      <h4 className="text-white font-mono mb-1">{CONTRACT_LABEL[contract]}</h4>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Verification:</span>
        <span className={isVerificationActive ? "text-phosphor-green" : "text-warning-red"}>
          {provider === undefined ? "loading…" : isVerificationActive ? "ON" : "OFF (open to everyone)"}
        </span>
      </div>
      {isVerificationActive && (
        <p className="text-text-muted text-xs font-mono break-all">
          Provider: {provider}
        </p>
      )}
      {error && (
        <p className="text-warning-red text-xs font-mono">
          {error.message.split("\n")[0]}
        </p>
      )}
      {!isOwner ? (
        <p className="text-text-muted text-xs font-mono">
          Only this contract&apos;s owner ({owner ?? "…"}) can change this.
        </p>
      ) : isVerificationActive ? (
        <TransactionButton
          transactionId={`disable-eligibility-${contract}`}
          contractAddress={contractAddress}
          abi={CONTRACT_ABIS[contract] as Abi}
          functionName="setEligibilityProvider"
          args={[ZERO_ADDRESS]}
          className="w-full px-3 py-2 border border-warning-red text-warning-red rounded-none font-mono hover:bg-warning-red/10 transition-colors text-sm"
          onSuccess={() => {
            toast.success(`${CONTRACT_LABEL[contract]} verification disabled`);
            refetch();
          }}
          onError={(e) => {
            console.error(`Failed to disable ${contract} eligibility provider:`, e);
            toast.error(`Failed to disable verification: ${e.message.split("\n")[0]}`);
          }}
        >
          Disable Verification
        </TransactionButton>
      ) : (
        <TransactionButton
          transactionId={`enable-eligibility-${contract}`}
          contractAddress={contractAddress}
          abi={CONTRACT_ABIS[contract] as Abi}
          functionName="setEligibilityProvider"
          args={[selfieCheckAddress]}
          disabled={!canReEnable}
          className="w-full px-3 py-2 border border-phosphor-green text-phosphor-green rounded-none font-mono hover:bg-phosphor-green/10 transition-colors text-sm disabled:opacity-50"
          onSuccess={() => {
            toast.success(`${CONTRACT_LABEL[contract]} verification enabled`);
            refetch();
          }}
          onError={(e) => {
            console.error(`Failed to enable ${contract} eligibility provider:`, e);
            toast.error(`Failed to enable verification: ${e.message.split("\n")[0]}`);
          }}
        >
          {canReEnable ? "Enable Verification (SelfieCheck)" : "No verification backend on this chain"}
        </TransactionButton>
      )}
    </div>
  );
}

/**
 * Toggles the selfie-check identity verification gate on FreeShipClaim and
 * TutorialClaim independently. Both default open (eligibilityProvider ==
 * address(0)); "enable" re-wires them to SelfieCheckEligibilityProvider.
 * See docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md §9 —
 * a live write on each contract's own owner, never scripted automatically.
 */
const EligibilityControls: React.FC = () => {
  return (
    <div className="bg-near-black rounded-none p-4 border border-gunmetal">
      <h3 className="text-lg font-mono text-white mb-4">
        Free Ship / Tutorial Eligibility Verification
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        Controls whether claiming free ships or completing the tutorial
        requires passing selfie-check identity verification. Off (the
        default) means fully open — no gating.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EligibilityToggleCard contract="FREE_SHIP_CLAIM" />
        <EligibilityToggleCard contract="TUTORIAL_CLAIM" />
      </div>
    </div>
  );
};

export default EligibilityControls;
