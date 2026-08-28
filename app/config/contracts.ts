import ShipsContract from "../contracts/artifacts/DeployModule#Ships.json";
import LobbiesContract from "../contracts/artifacts/DeployModule#Lobbies.json";
import FleetsContract from "../contracts/artifacts/DeployModule#Fleets.json";
import GameContract from "../contracts/artifacts/DeployModule#Game.json";
import UniversalCreditsContract from "../contracts/artifacts/DeployModule#UniversalCredits.json";
import MapsContract from "../contracts/artifacts/DeployModule#Maps.json";
import ShipAttributesContract from "../contracts/artifacts/DeployModule#ShipAttributes.json";
import DroneYardContract from "../contracts/artifacts/DeployModule#DroneYard.json";
import DroneEnergyCoresContract from "../contracts/artifacts/DeployModule#DroneEnergyCores.json";
import TutorialClaimContract from "../contracts/artifacts/DeployModule#TutorialClaim.json";
import ShipPurchaserContract from "../contracts/artifacts/DeployModule#ShipPurchaser.json";
import TournamentContract from "../contracts/artifacts/DeployModule#Tournament.json";
import GameBlobRegistryContract from "../contracts/artifacts/DeployModule#GameBlobRegistry.json";
import SinglePlayerMatchContract from "../contracts/artifacts/DeployModule#SinglePlayerMatch.json";
import AIEncountersContract from "../contracts/artifacts/DeployModule#AIEncounters.json";
import PvPMatchContract from "../contracts/artifacts/DeployModule#PvPMatch.json";
import NodeMapContract from "../contracts/artifacts/DeployModule#NodeMap.json";
import AIShipsContract from "../contracts/artifacts/DeployModule#AIShips.json";
import ShipsRouterContract from "../contracts/artifacts/DeployModule#ShipsRouter.json";
import DroneStorefrontContract from "../contracts/artifacts/DeployModule#DroneStorefront.json";
import FreeShipClaimContract from "../contracts/artifacts/DeployModule#FreeShipClaim.json";
import RamResolverContract from "../contracts/artifacts/DeployModule#RamResolver.json";
import RepairResolverContract from "../contracts/artifacts/DeployModule#RepairResolver.json";
import DroneNamesContract from "../contracts/artifacts/DeployModule#DroneNames.json";
import VariantPurchaseGateContract from "../contracts/artifacts/DeployModule#VariantPurchaseGate.json";
import ShatteredHiveMedalContract from "../contracts/artifacts/DeployModule#ShatteredHiveMedal.json";
import RoguelikeNodeMapContract from "../contracts/artifacts/DeployModule#RoguelikeNodeMap.json";
import RoguelikeRunContract from "../contracts/artifacts/DeployModule#RoguelikeRun.json";
import RoguelikeMatchContract from "../contracts/artifacts/DeployModule#RoguelikeMatch.json";
import RoguelikeResupplyContract from "../contracts/artifacts/DeployModule#RoguelikeResupply.json";
import RandomManagerContract from "../contracts/artifacts/DeployModule#RandomManager.json";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { getSelectedChainId, xaiTestnet } from "./networks";
import flowTestnetDeployedAddresses from "../contracts/flow-testnet/deployed_addresses.json";
import baseSepoliaDeployedAddresses from "../contracts/base-sepolia/deployed_addresses.json";
import roninSaigonDeployedAddresses from "../contracts/ronin-saigon/deployed_addresses.json";
import xaiTestnetDeployedAddresses from "../contracts/xai-testnet/deployed_addresses.json";

type DeployedAddresses = Record<string, `0x${string}`>;

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
  DRONE_ENERGY_CORES:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneEnergyCores"] ??
    ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ?? ZERO_ADDRESS,
  FREE_SHIP_CLAIM:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#FreeShipClaim"] ??
    ZERO_ADDRESS,
  DRONE_STOREFRONT:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneStorefront"] ??
    ZERO_ADDRESS,
  RAM_RESOLVER:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RamResolver"] ?? ZERO_ADDRESS,
  REPAIR_RESOLVER:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RepairResolver"] ??
    ZERO_ADDRESS,
  DRONE_NAMES:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneNames"] ?? ZERO_ADDRESS,
  VARIANT_PURCHASE_GATE:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#VariantPurchaseGate"] ??
    ZERO_ADDRESS,
  SHATTERED_HIVE_MEDAL:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShatteredHiveMedal"] ??
    ZERO_ADDRESS,
  RANDOM_MANAGER:
    FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RandomManager"] ??
    ZERO_ADDRESS,
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
  DRONE_ENERGY_CORES:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#DroneEnergyCores"] ??
    ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
  FREE_SHIP_CLAIM:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#FreeShipClaim"] ??
    ZERO_ADDRESS,
  DRONE_STOREFRONT:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#DroneStorefront"] ??
    ZERO_ADDRESS,
  RAM_RESOLVER:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#RamResolver"] ??
    ZERO_ADDRESS,
  REPAIR_RESOLVER:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#RepairResolver"] ??
    ZERO_ADDRESS,
  DRONE_NAMES:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#DroneNames"] ??
    ZERO_ADDRESS,
  VARIANT_PURCHASE_GATE:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#VariantPurchaseGate"] ??
    ZERO_ADDRESS,
  SHATTERED_HIVE_MEDAL:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#ShatteredHiveMedal"] ??
    ZERO_ADDRESS,
  RANDOM_MANAGER:
    RONIN_SAIGON_DEPLOYED_ADDRESSES["DeployModule#RandomManager"] ??
    ZERO_ADDRESS,
} as const;

const BASE_SEPOLIA_CONTRACT_ADDRESSES = {
  SHIPS: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Ships"] ?? ZERO_ADDRESS,
  TOURNAMENT: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#Tournament"] ?? ZERO_ADDRESS,
  GAME_BLOB_REGISTRY: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#GameBlobRegistry"] ?? ZERO_ADDRESS,
  SINGLE_PLAYER_MATCH: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#SinglePlayerMatch"] ?? ZERO_ADDRESS,
  AI_ENCOUNTERS: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#AIEncounters"] ?? ZERO_ADDRESS,
  PVP_MATCH: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#PvPMatch"] ?? ZERO_ADDRESS,
  NODE_MAP: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#NodeMap"] ?? ZERO_ADDRESS,
  AI_SHIPS: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#AIShips"] ?? ZERO_ADDRESS,
  SHIPS_ROUTER: BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#ShipsRouter"] ?? ZERO_ADDRESS,
  ROGUELIKE_NODE_MAP:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RoguelikeNodeMap"] ??
    ZERO_ADDRESS,
  ROGUELIKE_RUN:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RoguelikeRun"] ??
    ZERO_ADDRESS,
  ROGUELIKE_MATCH:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RoguelikeMatch"] ??
    ZERO_ADDRESS,
  ROGUELIKE_RESUPPLY:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RoguelikeResupply"] ??
    ZERO_ADDRESS,
  DRONE_STOREFRONT:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#DroneStorefront"] ??
    ZERO_ADDRESS,
  FREE_SHIP_CLAIM:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#FreeShipClaim"] ??
    ZERO_ADDRESS,
  RAM_RESOLVER:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RamResolver"] ??
    ZERO_ADDRESS,
  REPAIR_RESOLVER:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RepairResolver"] ??
    ZERO_ADDRESS,
  DRONE_NAMES:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#DroneNames"] ??
    ZERO_ADDRESS,
  VARIANT_PURCHASE_GATE:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#VariantPurchaseGate"] ??
    ZERO_ADDRESS,
  SHATTERED_HIVE_MEDAL:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#ShatteredHiveMedal"] ??
    ZERO_ADDRESS,
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
  DRONE_ENERGY_CORES:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#DroneEnergyCores"] ??
    ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
  RANDOM_MANAGER:
    BASE_SEPOLIA_DEPLOYED_ADDRESSES["DeployModule#RandomManager"] ??
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
  DRONE_ENERGY_CORES:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneEnergyCores"] ??
    ZERO_ADDRESS,
  TUTORIAL_CLAIM:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#TutorialClaim"] ??
    ZERO_ADDRESS,
  FREE_SHIP_CLAIM:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#FreeShipClaim"] ??
    ZERO_ADDRESS,
  DRONE_STOREFRONT:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneStorefront"] ??
    ZERO_ADDRESS,
  RAM_RESOLVER:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RamResolver"] ?? ZERO_ADDRESS,
  REPAIR_RESOLVER:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RepairResolver"] ??
    ZERO_ADDRESS,
  DRONE_NAMES:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneNames"] ?? ZERO_ADDRESS,
  VARIANT_PURCHASE_GATE:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#VariantPurchaseGate"] ??
    ZERO_ADDRESS,
  SHATTERED_HIVE_MEDAL:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShatteredHiveMedal"] ??
    ZERO_ADDRESS,
  RANDOM_MANAGER:
    XAI_TESTNET_DEPLOYED_ADDRESSES["DeployModule#RandomManager"] ??
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
  DRONE_ENERGY_CORES: DroneEnergyCoresContract.abi,
  TUTORIAL_CLAIM: TutorialClaimContract.abi,
  SHIP_PURCHASER: ShipPurchaserContract.abi,
  TOURNAMENT: TournamentContract.abi,
  GAME_BLOB_REGISTRY: GameBlobRegistryContract.abi,
  SINGLE_PLAYER_MATCH: SinglePlayerMatchContract.abi,
  AI_ENCOUNTERS: AIEncountersContract.abi,
  PVP_MATCH: PvPMatchContract.abi,
  NODE_MAP: NodeMapContract.abi,
  AI_SHIPS: AIShipsContract.abi,
  SHIPS_ROUTER: ShipsRouterContract.abi,
  DRONE_STOREFRONT: DroneStorefrontContract.abi,
  FREE_SHIP_CLAIM: FreeShipClaimContract.abi,
  RAM_RESOLVER: RamResolverContract.abi,
  REPAIR_RESOLVER: RepairResolverContract.abi,
  DRONE_NAMES: DroneNamesContract.abi,
  VARIANT_PURCHASE_GATE: VariantPurchaseGateContract.abi,
  SHATTERED_HIVE_MEDAL: ShatteredHiveMedalContract.abi,
  ROGUELIKE_NODE_MAP: RoguelikeNodeMapContract.abi,
  ROGUELIKE_RUN: RoguelikeRunContract.abi,
  ROGUELIKE_MATCH: RoguelikeMatchContract.abi,
  ROGUELIKE_RESUPPLY: RoguelikeResupplyContract.abi,
  RANDOM_MANAGER: RandomManagerContract.abi,
} as const;

// Contract types for wagmi
export type ContractNames = keyof typeof FLOW_TESTNET_CONTRACT_ADDRESSES;
export type ContractAddresses =
  (typeof FLOW_TESTNET_CONTRACT_ADDRESSES)[ContractNames];
