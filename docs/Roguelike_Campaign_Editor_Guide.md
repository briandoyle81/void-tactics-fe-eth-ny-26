# Roguelike Campaign Editor — User Guide

Everything below describes the in-app "Edit Mode" for the roguelike map: node fields, edges, maps, enemy fleets, win effects, campaign-wide settings, and the on-chain content-publish flow. It works identically in Web3 (wallet) and Web2 (Google sign-in) mode, with the differences called out where they matter.

## Who can edit

Editing is gated behind three separate permissions, each covering a different piece of the map. You may hold some but not all of them.

| Permission | Contract / mechanism | Gates | Granted from |
|---|---|---|---|
| Node editor | `RoguelikeNodeMap.isNodeEditor` | Node fields, create/delete edges, campaign settings | Roguelike Settings → Editor access → `[GRANT]` (wallet mode only) |
| Enemy fleet editor | `AIEncounters.isEncounterEditor` | Editing ship placements on a node's map | Same `[GRANT]` action — see below |
| Content publisher | `NodeContentRegistry.isNodeEditor` | Publishing title/description on-chain | **No in-app UI yet** — `onlyOwner`-gated `setNodeEditor`, must be called directly against the contract by whoever owns it (script/Etherscan/console) |
| Web2 admin | Google email in `WEB2_ADMIN_EMAILS` (`app/config/alpha.ts`) | Everything above, at once, for a Google-signed-in session | Add the email to that file (source change, not a UI) |

**"Merged" grant:** the Roguelike Settings modal's `[GRANT]`/`[REVOKE]` buttons set node-editor and enemy-fleet-editor together in one action (two sequential transactions), so a newly-granted wallet editor never hits the "I can edit nodes but not the fleet" gap. They do **not** grant the content-publisher role — that's a separate, contract-owner-only step (see the table above and Known Limitations).

A Web2 admin session (Google sign-in, allowlisted email) automatically satisfies all four rows above — no wallet, no separate grants needed.

## Getting into Edit Mode

Where you land depends on whether you have an active roguelike run:

- **With an active run:** open the Roguelike tab as normal, then click the edit-mode toggle in the map header (visible only if you hold node-editor access). The live run keeps working underneath — Fight/Enter/Retreat are simply replaced by the edit panel while toggled on.
- **With no active run:** the normal roguelike screen only offers "Start Run." If you're a node editor, an **`[EDIT CAMPAIGN MAP]`** button appears there too — it opens the full map in a run-less "browse/edit" mode: every node renders unlocked (nothing to be locked against), and there's no "current position." Use **`[EXIT MAP EDITOR]`** in the header to leave this mode and get back to the run-start screen.

Both entry points share the same map, the same edit panel, and the same Campaign Settings modal — nothing about editing itself differs between them.

## Editing an existing node

Turn on Edit Mode, then click any node tile to open its edit panel.

**Kind** — `Combat` or `Resupply`. Switching kind changes which fields below are active:
- *Combat*: Map, Turn Time, Max Score, Creator Goes First, and the enemy-fleet button are all live. A map must be selected before saving.
- *Resupply*: those fields are hidden; instead you get **Cost Cap Override** (0 = no change from the campaign default).

**Title / Description** — free text, saved independently of everything else via its own **`[SAVE CONTENT]`** button. This writes to a Postgres-backed overlay table, not directly to the chain — see "Publishing content on-chain" below for how it actually reaches the contract.

**Map** — click **`[SELECT MAP]`** / **`[MAP #N]`** to open the map picker (thumbnail grid, same picker used everywhere else in the app). Combat nodes only.

**Turn Time / Max Score / Creator Goes First** — the same mechanical fields the underlying match uses; Combat nodes only.

**`[SAVE DETAILS]`** — writes Kind/Map/Turn Time/Max Score/Creator-Goes-First/Cost-Cap-Override on-chain in one transaction. This is separate from `[SAVE CONTENT]` — narrative and mechanics are independent writes.

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

The **on-chain content publish** panel (below) also lives in this modal — see next section.

## Publishing content on-chain

Title/Description edits (`[SAVE CONTENT]`) land in Postgres immediately and show up in-app right away — but they aren't on the chain until you explicitly publish them. The Campaign Settings modal's publish panel shows *"N nodes with unpublished edits"* and offers two actions:

- **`[SYNC FROM CHAIN]`** — pulls whatever is currently published on `NodeContentRegistry` back into Postgres bookkeeping, without touching anything you have mid-edit (a row already marked dirty is skipped, not overwritten).
- **`[PUBLISH (N)]`** — batches every dirty node in this campaign and writes them to `NodeContentRegistry` in one or more chunked transactions, signed server-side (`NODE_CONTENT_PUBLISHER_PRIVATE_KEY`). If a wallet is connected and you're not on a Web2 admin session, this also asks you to sign a message first — the server verifies that signature against `NodeContentRegistry.isNodeEditor` before it will run the publish.

If publishing stops partway through a large batch (network hiccup, one bad row), it's retry-safe — re-running `[PUBLISH]` only sends the rows still marked dirty.

## Known limitations

- **No UI to grant the content-publisher role.** `NodeContentRegistry.setNodeEditor` is `onlyOwner` and nothing in the app calls it — a wallet-only editor who can edit and save content still can't publish it until the contract owner grants that role directly (script, Etherscan, or a console call). A Web2 admin session bypasses this entirely.
- **No cycle detection** on roguelike edges — see "Linking nodes" above.
- **New-node defaults are placeholders**, not tuned game-balance numbers.
- **This guide covers the roguelike map only.** The original (non-roguelike) campaign has its own, structurally similar editor (`CampaignGraph.tsx` / `CampaignNodeEditPanel.tsx`) — prerequisites instead of children, no Kind/two-way concept, otherwise the same map/fleet/content/publish pattern.
