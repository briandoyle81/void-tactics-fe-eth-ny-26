import ShipsContract from "../contracts/DeployModule#Ships.json";
import LobbiesContract from "../contracts/DeployModule#Lobbies.json";
import FleetsContract from "../contracts/DeployModule#Fleets.json";
import GameContract from "../contracts/DeployModule#Game.json";
import UniversalCreditsContract from "../contracts/DeployModule#UniversalCredits.json";
import MapsContract from "../contracts/DeployModule#Maps.json";
import ShipAttributesContract from "../contracts/DeployModule#ShipAttributes.json";
import DroneYardContract from "../contracts/DeployModule#DroneYard.json";
import TutorialClaimContract from "../contracts/DeployModule#TutorialClaim.json";
import ShipPurchaserContract from "../contracts/DeployModule#ShipPurchaser.json";
import { getSelectedChainId, flowTestnet, saigon, baseSepolia, xaiTestnet } from "./networks";
import flowTestnetDeployedAddresses from "../contracts/flow-testnet/deployed_addresses.json";
import baseSepoliaDeployedAddresses from "../contracts/base-sepolia/deployed_addresses.json";
import roninSaigonDeployedAddresses from "../contracts/ronin-saigon/deployed_addresses.json";
import xaiTestnetDeployedAddresses from "../contracts/xai-testnet/deployed_addresses.json";

type DeployedAddresses = Record<string, string>;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const FLOW_TESTNET_DEPLOYED_ADDRESSES =
  flowTestnetDeployedAddresses as unknown as DeployedAddresses;
const RONIN_SAIGON_DEPLOYED_ADDRESSES =
  roninSaigonDeployedAddresses as unknown as DeployedAddresses;
const BASE_SEPOLIA_DEPLOYED_ADDRESSES =
  baseSepoliaDeployedAddresses as unknown as DeployedAddresses;
const XAI_TESTNET_DEPLOYED_ADDRESSES =
  xaiTestnetDeployedAddresses as unknown as DeployedAddresses;

// Per-network deployed address registries
export const DEPLOYED_ADDRESSES_BY_CHAIN_ID = {
  [flowTestnet.id]: FLOW_TESTNET_DEPLOYED_ADDRESSES,
  [saigon.id]: RONIN_SAIGON_DEPLOYED_ADDRESSES,
  [baseSepolia.id]: BASE_SEPOLIA_DEPLOYED_ADDRESSES,
  [xaiTestnet.id]: XAI_TESTNET_DEPLOYED_ADDRESSES,
} as const;

// Stable, per-network contract address sets
const FLOW_TESTNET_CONTRACT_ADDRESSES = {
  SHIPS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Ships"],
  FLEETS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Fleets"],
  LOBBIES: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Lobbies"],
  GAME: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Game"],
  UNIVERSAL_CREDITS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#UniversalCredits"],
  MAPS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Maps"],
  SHIP_ATTRIBUTES: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipAttributes"],
  SHIP_PURCHASER: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipPurchaser"],
  DRONE_YARD: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneYard"],
  TUTORIAL_CLAIM:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ?? ZERO_ADDRESS,
} as const;

const RONIN_SAIGON_CONTRACT_ADDRESSES = {
  SHIPS: RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#Ships"] ?? ZERO_ADDRESS,
  FLEETS:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#Fleets"] ?? ZERO_ADDRESS,
  LOBBIES:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#Lobbies"] ?? ZERO_ADDRESS,
  GAME: RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#Game"] ?? ZERO_ADDRESS,
  UNIVERSAL_CREDITS:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#UniversalCredits"] ??
    ZERO_ADDRESS,
  MAPS: RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#Maps"] ?? ZERO_ADDRESS,
  SHIP_ATTRIBUTES:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#ShipAttributes"] ??
    ZERO_ADDRESS,
  SHIP_PURCHASER:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#ShipPurchaser"] ??
    ZERO_ADDRESS,
  DRONE_YARD:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#DroneYard"] ?? ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
} as const;

const BASE_SEPOLIA_CONTRACT_ADDRESSES = {
  SHIPS: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Ships"] ?? ZERO_ADDRESS,
  FLEETS:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Fleets"] ?? ZERO_ADDRESS,
  LOBBIES:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Lobbies"] ?? ZERO_ADDRESS,
  GAME: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Game"] ?? ZERO_ADDRESS,
  UNIVERSAL_CREDITS:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#UniversalCredits"] ??
    ZERO_ADDRESS,
  MAPS: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Maps"] ?? ZERO_ADDRESS,
  SHIP_ATTRIBUTES:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#ShipAttributes"] ??
    ZERO_ADDRESS,
  SHIP_PURCHASER:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#ShipPurchaser"] ??
    ZERO_ADDRESS,
  DRONE_YARD:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#DroneYard"] ?? ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
} as const;

const XAI_TESTNET_CONTRACT_ADDRESSES = {
  SHIPS: XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Ships"] ?? ZERO_ADDRESS,
  FLEETS:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Fleets"] ?? ZERO_ADDRESS,
  LOBBIES:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Lobbies"] ?? ZERO_ADDRESS,
  GAME: XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Game"] ?? ZERO_ADDRESS,
  UNIVERSAL_CREDITS:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#UniversalCredits"] ??
    ZERO_ADDRESS,
  MAPS: XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Maps"] ?? ZERO_ADDRESS,
  SHIP_ATTRIBUTES:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipAttributes"] ??
    ZERO_ADDRESS,
  SHIP_PURCHASER:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipPurchaser"] ??
    ZERO_ADDRESS,
  DRONE_YARD:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneYard"] ?? ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
} as const;

export const CONTRACT_ADDRESSES_BY_CHAIN_ID = {
  [flowTestnet.id]: FLOW_TESTNET_CONTRACT_ADDRESSES,
  [saigon.id]: RONIN_SAIGON_CONTRACT_ADDRESSES,
  [baseSepolia.id]: BASE_SEPOLIA_CONTRACT_ADDRESSES,
  [xaiTestnet.id]: XAI_TESTNET_CONTRACT_ADDRESSES,
} as const;

/**
 * Returns contract addresses for the active chain. Falls back to Flow
 * Testnet for unknown chainIds.
 */
export function getContractAddresses(chainId?: number) {
  if (chainId && chainId in CONTRACT_ADDRESSES_BY_CHAIN_ID) {
    return CONTRACT_ADDRESSES_BY_CHAIN_ID[
      chainId as keyof typeof CONTRACT_ADDRESSES_BY_CHAIN_ID
    ];
  }
  return FLOW_TESTNET_CONTRACT_ADDRESSES;
}

// Back-compat: most callsites import `CONTRACT_ADDRESSES`. Make it chain-aware.
export const CONTRACT_ADDRESSES = new Proxy(
  {} as typeof FLOW_TESTNET_CONTRACT_ADDRESSES,
  {
    get(_target, prop) {
      const chainId = getSelectedChainId();
      const addresses = getContractAddresses(chainId) as Record<string, unknown>;
      return addresses[prop as string];
    },
  }
);

// Contract ABIs
export const CONTRACT_ABIS = {
  SHIPS: ShipsContract.abi,
  LOBBIES: LobbiesContract.abi,
  FLEETS: FleetsContract.abi,
  GAME: GameContract.abi,
  UNIVERSAL_CREDITS: UniversalCreditsContract.abi,
  MAPS: MapsContract.abi,
  SHIP_ATTRIBUTES: ShipAttributesContract.abi,
  DRONE_YARD: DroneYardContract.abi,
  TUTORIAL_CLAIM: TutorialClaimContract.abi,
  SHIP_PURCHASER: ShipPurchaserContract.abi,
} as const;

// Contract types for wagmi
export type ContractNames = keyof typeof FLOW_TESTNET_CONTRACT_ADDRESSES;
export type ContractAddresses =
  (typeof FLOW_TESTNET_CONTRACT_ADDRESSES)[ContractNames];
