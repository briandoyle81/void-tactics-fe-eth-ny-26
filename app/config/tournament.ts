import { baseSepolia } from "viem/chains";

export const TOURNAMENT_CHAIN_ID = baseSepolia.id;

// World ID — on-chain verification via Base Sepolia WorldIDRouter (Orb, groupId=1)
export const WORLD_APP_ID = "app_b2739b54eb71ceb8c76380c60c20ce22" as const;
export const WORLD_RP_ID = "rp_7a7c4c4d289540ed" as const;
export const WORLD_ACTION = "join-tournament" as const;
export const WORLD_SIGNER_ADDRESS = "0xBB5bF86761362B1c0e36721C15F1AC8129E48e3A" as const;
export const WORLD_EXTERNAL_NULLIFIER =
  318078722027557965998987370672697888390534537434722412480399796468873891570n;
export const WORLD_ID_ROUTER = "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02" as `0x${string}`;

// Prize split (informational — enforced on-chain)
export const PROTOCOL_FEE_BPS = 100; // 1%
export const CHAMPION_SHARE_PCT = 60;
export const RUNNER_UP_SHARE_PCT = 40;
