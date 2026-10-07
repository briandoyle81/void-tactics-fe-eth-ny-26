# Roguelike Campaign Editor — User Guide

Everything below describes the in-app "Edit Mode" for the roguelike map: node fields, edges, maps, enemy fleets, win effects, campaign-wide settings, and saving node text on chain. It works identically in Web3 (wallet) and Web2 (Google sign-in) mode, with the differences called out where they matter.

## Who can edit

Editing is gated behind three separate permissions, each covering a different piece of the map. You may hold some but not all of them.

| Permission | Contract / mechanism | Gates | Granted from |
|---|---|---|---|
| Node editor | `RoguelikeNodeMap.isNodeEditor` | Node fields, create/delete edges, campaign settings | Roguelike Settings → Editor access → `[GRANT]` (wallet mode only) |
| Enemy fleet editor | `AIEncounters.isEncounterEditor` | Editing ship placements on a node's map | Same `[GRANT]` action — see below |
| Content editor | `NodeContentRegistry.isNodeEditor` | Saving title/description (web3) | **No in-app UI yet** — `onlyOwner`-gated `setNodeEditor`, must be called directly against the contract by whoever owns it (script/Etherscan/console) |
| Web2 admin | Google email in `WEB2_ADMIN_EMAILS` (`app/config/alpha.ts`) | Everything above, at once, for a Google-signed-in session | Add the email to that file (source change, not a UI) |

**"Merged" grant:** the Roguelike Settings modal's `[GRANT]`/`[REVOKE]` buttons set node-editor and enemy-fleet-editor together in one action (two sequential transactions), so a newly-granted wallet editor never hits the "I can edit nodes but not the fleet" gap. They do **not** grant the content-editor role — that's a separate, contract-owner-only step (see the table above and Known Limitations).

A Web2 admin session (Google sign-in, allowlisted email) automatically satisfies all four rows above — no wallet, no separate grants needed.

## Getting into Edit Mode

Where you land depends on whether you have an active roguelike run:

- **With an active run:** open the Roguelike tab as normal, then click the edit-mode toggle in the map header (visible only if you hold node-editor access). The live run keeps working underneath — Fight/Enter/Retreat are simply replaced by the edit panel while toggled on.
- **With no active run:** the normal roguelike screen only offers "Start Run." If you're a node editor, an **`[EDIT CAMPAIGN MAP]`** button appears there too — it opens the full map in a run-less "browse/edit" mode: every node renders unlocked (nothing to be locked against), and there's no "current position." Use **`[EXIT MAP EDITOR]`** in the header to leave this mode and get back to the run-start screen.

Both entry points share the same map, the same edit panel, and the same Campaign Settings modal — nothing about editing itself differs between them.

## Editing an existing node

Turn on Edit Mode, then click any node tile to open its edit panel.

**Kind** — `Combat` or `Resupply`. Switching kind changes which fields below are active:
- *Combat*: Map, Max Score, Creator Goes First, and the enemy-fleet button are all live. A map must be selected before saving.
- *Resupply*: those fields are hidden; instead you get **Cost Cap Override** (0 = no change from the campaign default).

**Title / Description** — free text, saved independently of everything else via its own **`[SAVE CONTENT]`** button. In wallet mode this sends one transaction from your wallet to `NodeContentRegistry.setNodeContentBatch`, and the new text shows once it's mined. Your wallet needs the registry's editor role (see the table above). In Web2 mode it saves to the database instead. There's no built-in fallback text: a node with no title or description shows a red error in its place on the map and in previews until one is saved.

**Map** — click **`[SELECT MAP]`** / **`[MAP #N]`** to open the map picker (thumbnail grid, same picker used everywhere else in the app). Combat nodes only.

**Max Score / Creator Goes First** — the same mechanical fields the underlying match uses; Combat nodes only. There's no turn-time field: campaign and roguelike games are always unlimited, so saving keeps the node's stored value (new nodes get a default).

**`[SAVE DETAILS]`** — writes Kind/Map/Max Score/Creator-Goes-First/Cost-Cap-Override on-chain in one transaction. This is separate from `[SAVE CONTENT]` — narrative and mechanics are independent writes.

**`[EDIT ENEMY FLEET]`** (Combat nodes only, requires a map to be set) — opens the same ship-placement editor used by the standalone AI Encounters admin panel, scoped to this node's map. If you don't hold enemy-fleet-editor access, this instead opens a read-only fleet preview with a note on how to request access.

**Win effects** (Combat nodes only) — a checklist of pluggable rewards (currently *DEC Bonus*, *Heal Above Floor*, *Grant Ship*) that run in order after a player wins at this node, on top of the campaign's ordinary auto-heal. Toggle any combination and click **`[SAVE WIN EFFECTS]`** — this is its own transaction (`setNodeWinEffects`), independent of `[SAVE DETAILS]`. An effect shows **"(not deployed on this chain)"** and is unselectable if its resolver contract has no address configured for the current chain. Each effect's own numbers (bonus amount, heal %, ship variant/tier) aren't set here — see Campaign Settings below.

## Creating a new node

While in Edit Mode, a **`+ ADD NODE`** tile appears on the canvas (it has no edges yet, so it always renders in the first column). Click it to open the same edit panel in "create" mode — pick a Kind, fill in the fields, and **`[CREATE NODE]`**. The new node starts with no children; link it in from an existing node next (see below), or it'll sit orphaned and unreachable.

Placeholder defaults for a brand-new node (`turnTime: 120`, `maxScore: 1000`, `costCapOverride: 700`) are filler — adjust them to match real game balance before you rely on the node.

## Linking nodes (edges)

Roguelike edges are directional **children** — the node you're editing is the *parent*; the node you link to becomes reachable *from* it.

1. Open the parent node's edit panel.
2. Check **"Two-way (player can walk back across this edge)"** if you want the player able to return to the parent later — leave it unchecked for a one-way advance.
3. Click **`[+ LINK CHILD]`**. The map now shows a banner: *"Click the node this one leads to."*
4. Click the target node on the canvas. The edge is created immediately (`addChild`) — no separate save step.

Existing children are listed as chips (`#id →` for one-way, `#id ↔` for two-way) with an `×` to remove them (`removeChild`, immediate). A node with no children is a dead end — reaching it ends the run, which is a valid design (a finale), not necessarily a mistake.

There is no on-chain cycle protection — the UI doesn't stop you from linking a node back into an ancestor. Double-check the direction before confirming a link on a large graph.

## Campaign Settings

With Edit Mode on, click **`[CAMPAIGN SETTINGS]`** in the header for campaign-wide values, each with its own `[SAVE]`:

- **Root node id** — where every run starts.
- **Auto-heal % on win (0–100)** — HP restored after clearing a Combat node.
- **Required fleet variant (0 = unrestricted)** — gates entry to a specific ship variant/faction.
- **Initial cost cap** — starting roster cost budget for a new run.
- **Repair cost per HP (wei)** — resupply pricing.
- **Withdraw resupply fees to** — sends accumulated resupply revenue to an address (wallet mode only — this is a real fund transfer, double-check the address).
- **Editor access** — the merged node-editor + fleet-editor `[GRANT]`/`[REVOKE]` described above (wallet mode only; a Web2 admin session already has everything).

Below that is **Win effect configuration** — the *global* numbers behind each pluggable effect from the node editor's Win Effects checklist. These are per-resolver-contract, not per-campaign or per-node: changing one here changes it everywhere that effect is assigned (any roguelike node, and separately PvP/Tournament wins, which use the same resolvers outside this guide's scope).

- **DEC Bonus — amount minted per win.**
- **Heal Above Floor — heals to this % of max HP.**
- **Grant Ship — variant / tier** of the ship granted.

## Exporting missions for a redeploy

*(Added 2026-10-02.)* The contracts repo (`void-tactics-contracts-eth-online-2026`) seeds every mission on a fresh deploy from three files in `ignition/data/`: `singlePlayerStarterContent.json`, `roguelikeStarterContent.json` and `pvpStarterContent.json`. To carry edits made in the app over to the next deploy:

1. Open the **Admin** tab with a wallet holding any editor role (map admin, enemy-fleet editor or node editor) and scroll to **`[EXPORT MISSION SEED FILES]`**.
2. Load the contracts repo's current three seed files. They're used to keep existing keys (`m01`, `mainCampaign`, `f06`, …) the same, since the deploy references some of them directly.
3. Click **`[DOWNLOAD SEED FILES]`** and copy the three downloads over the originals. An unchanged chain produces no diff.

The export covers maps (tiles, impassable terrain, deployment zones, names, modes), AI ship configs, enemy placements, both campaign graphs, node titles/descriptions (only text actually set on chain), and roguelike win effects. The deploy seeds the titles into `NodeContentRegistry` and the win effects onto their nodes. Read any warnings the panel shows after exporting: they flag things like items with no on-chain match or a node whose numeric id will change.

Not exported: campaign-wide numbers that live outside the seed files (win-effect amounts, repair cost, required variants for campaigns other than `mainCampaign`). Web2 mode isn't covered; its export button still produces the older admin snapshot.

## Known limitations

- **No UI to grant the content-editor role.** `NodeContentRegistry.setNodeEditor` is `onlyOwner` and nothing in the app calls it, so a wallet that can edit nodes can't save their text until the registry owner grants that role directly (script, Etherscan, or a console call).
- **No cycle detection** on roguelike edges — see "Linking nodes" above.
- **New-node defaults are placeholders**, not tuned game-balance numbers.
- **This guide covers the roguelike map only.** The original (non-roguelike) campaign has its own, structurally similar editor (`CampaignGraph.tsx` / `CampaignNodeEditPanel.tsx`) — prerequisites instead of children, no Kind/two-way concept, otherwise the same map/fleet/content pattern.
