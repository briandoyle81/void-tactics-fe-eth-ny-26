"use client";

import { createPortal } from "react-dom";
import type { FlowPaymentModal as ModalHook, FlowModalStep, PaymentWalletOption, PaymentTokenBalance } from "../hooks/useFlowPaymentModal";
import { CHAIN_NAMES } from "../hooks/useFlowPaymentModal";
import type { FlowTier } from "../config/flowPayment";

const STEP_LABELS: Partial<Record<FlowModalStep, string>> = {
  "connect-wallet": "Connect Payment Wallet",
  "loading-balances": "Loading balances…",
  "select-token": "Select Token to Pay With",
  "no-balances": "No Supported Tokens Found",
  creating: "Initializing…",
  attaching: "Attaching wallet…",
  quoting: "Getting quote…",
  confirming: "Confirm Payment",
  approving: "Approving token spend…",
  signing: "Sign in wallet…",
  polling: "Waiting for settlement…",
  minting: "Minting ships…",
  success: "Ships Minted!",
  error: "Payment Failed",
};

const PROGRESS_STEPS: FlowModalStep[] = ["signing", "polling", "minting"];
const LOCKED_STEPS = new Set<FlowModalStep>(["approving", "signing", "polling", "minting"]);

function formatAmount(raw: string, decimals: number): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  const value = n > 1e6 ? n / Math.pow(10, decimals) : n;
  return value.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

interface Props {
  modal: ModalHook;
  flowTier: FlowTier;
}

export function FlowPaymentModal({ modal, flowTier }: Props) {
  const { step } = modal;
  if (step === "closed") return null;

  const locked = LOCKED_STEPS.has(step);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={locked ? undefined : modal.close}
      />
      {/* card */}
      <div className="relative z-10 w-full max-w-md border-2 border-phosphor-green/60 bg-void-black p-6 font-mono">
        {/* header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-phosphor-green/70">
              USD Payment · ${flowTier.displayPrice}
            </div>
            <div className="mt-0.5 text-base font-bold tracking-wider text-phosphor-green">
              {STEP_LABELS[step] ?? "…"}
            </div>
          </div>
          {!locked && (
            <button
              onClick={modal.close}
              className="text-text-muted hover:text-phosphor-green text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* body */}
        {step === "connect-wallet" && <ConnectWalletStep modal={modal} />}
        {step === "loading-balances" && (
          <Spinner label="Fetching balances across Ethereum, Base, Polygon, Arbitrum, and Optimism…" />
        )}
        {step === "select-token" && <SelectTokenStep modal={modal} flowTier={flowTier} />}
        {step === "no-balances" && <NoBalancesStep modal={modal} />}
        {(["creating", "attaching", "quoting"] as FlowModalStep[]).includes(step) && (
          <Spinner label={STEP_LABELS[step] ?? "…"} />
        )}
        {step === "confirming" && <ConfirmStep modal={modal} flowTier={flowTier} />}
        {step === "approving" && <Spinner label="Approve token spend in your wallet…" />}
        {(PROGRESS_STEPS as FlowModalStep[]).includes(step) && <ProgressStep step={step} />}
        {step === "success" && (
          <div className="py-6 text-center">
            <div className="text-3xl">✓</div>
            <div className="mt-2 text-sm text-phosphor-green">Your ships have been minted.</div>
          </div>
        )}
        {step === "error" && <ErrorStep modal={modal} />}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function ConnectWalletStep({ modal }: { modal: ModalHook }) {
  const { walletOptions, walletOptionsLoaded } = modal;
  return (
    <div>
      <p className="mb-4 text-xs text-text-muted leading-relaxed">
        Your game wallet stays connected. Connect a separate wallet that holds funds to pay with.
      </p>
      {!walletOptionsLoaded ? (
        <Spinner label="Detecting wallets…" />
      ) : walletOptions.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-text-muted leading-relaxed mb-4">
            No browser wallet extensions detected. Install MetaMask, Coinbase Wallet, or another
            EVM wallet, then try again.
          </p>
          <button
            onClick={() => void modal.open(modal.tier, modal.gameChainId)}
            className="border border-phosphor-green/50 px-4 py-2 text-sm text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
          >
            Retry detection
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(walletOptions as PaymentWalletOption[]).map((opt) => (
            <button
              key={opt.info.rdns}
              onClick={() => void modal.connectWallet(opt.info.rdns)}
              className="flex items-center gap-3 border border-phosphor-green/30 px-4 py-3 text-left text-sm text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
            >
              {opt.info.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opt.info.icon} alt={opt.info.name} className="h-6 w-6 shrink-0" />
              )}
              <span className="font-bold tracking-wider">{opt.info.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectTokenStep({ modal, flowTier }: { modal: ModalHook; flowTier: FlowTier }) {
  const required = parseFloat(flowTier.displayPrice);
  return (
    <div>
      <p className="mb-3 text-xs text-text-muted">
        Need at least ~${flowTier.displayPrice} USD. Select a token to pay with.
      </p>
      <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
        {(modal.balances as PaymentTokenBalance[]).map((token, i) => {
          const chainName = CHAIN_NAMES[token.networkId] ?? `Chain ${String(token.networkId)}`;
          const usd = token.marketValue;
          const sufficient = usd >= required;
          return (
            <button
              key={i}
              onClick={() => (sufficient ? void modal.selectToken(token) : undefined)}
              disabled={!sufficient}
              className={`flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors ${
                sufficient
                  ? "border-phosphor-green/30 text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5"
                  : "border-gunmetal text-text-muted opacity-50 cursor-not-allowed"
              }`}
            >
              <div>
                <span className="font-bold">{token.symbol}</span>
                <span className="ml-2 text-xs opacity-70">{chainName}</span>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-70">
                  {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </div>
                <div className="font-bold">${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoBalancesStep({ modal }: { modal: ModalHook }) {
  return (
    <div className="py-4">
      <p className="mb-4 text-sm text-text-muted leading-relaxed">
        No tokens with sufficient balance found on Ethereum, Base, Polygon, Arbitrum, or Optimism.
      </p>
      <button
        onClick={modal.retry}
        className="w-full border border-phosphor-green/50 py-2 text-sm text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
      >
        Try a different wallet
      </button>
    </div>
  );
}

function ConfirmStep({ modal, flowTier }: { modal: ModalHook; flowTier: FlowTier }) {
  const { quote, selectedToken } = modal;
  const token = selectedToken as PaymentTokenBalance | null;
  const chainName = token ? (CHAIN_NAMES[token.networkId] ?? `Chain ${String(token.networkId)}`) : "";
  const fromAmt = quote && token ? formatAmount(quote.fromAmount, token.decimals) : "…";

  return (
    <div>
      <div className="mb-4 border border-phosphor-green/20 bg-phosphor-green/5 p-4">
        <div className="text-xs uppercase tracking-wider text-phosphor-green/70 mb-2">
          Payment summary
        </div>
        <div className="text-sm text-phosphor-green">
          ~{fromAmt} {token?.symbol ?? ""} on {chainName}
        </div>
        <div className="mt-1 text-xs text-text-muted">→ ${flowTier.displayPrice} USD in ships</div>
        {quote?.expiresAt && (
          <div className="mt-2 text-xs text-text-muted">
            Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={modal.retry}
          className="flex-1 border border-gunmetal py-2 text-sm text-text-muted hover:border-steel hover:text-secondary transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => void modal.confirm()}
          className="flex-1 border border-phosphor-green py-2 text-sm font-bold text-phosphor-green hover:bg-phosphor-green/10 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function ProgressStep({ step }: { step: FlowModalStep }) {
  const currentIdx = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  return (
    <div className="py-6">
      <Spinner label={STEP_LABELS[step] ?? "…"} />
      <div className="mt-4 flex justify-center gap-2">
        {PROGRESS_STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 w-8 rounded-full transition-colors ${
              i <= currentIdx ? "bg-phosphor-green" : "bg-gunmetal"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorStep({ modal }: { modal: ModalHook }) {
  return (
    <div className="py-4">
      {modal.error && (
        <p className="mb-4 text-xs text-warning-red leading-relaxed break-words">{modal.error}</p>
      )}
      <button
        onClick={modal.retry}
        className="w-full border border-phosphor-green/50 py-2 text-sm text-phosphor-green hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
      <span className="text-xs text-text-muted tracking-wider">{label}</span>
    </div>
  );
}
