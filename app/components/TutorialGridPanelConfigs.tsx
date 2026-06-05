import React from "react";

const TUTORIAL_RESCUE_PANEL_MAX_ROWS = 6;

/**
 * Branch final steps: max panel height as a fraction of the grid when the panel
 * is content-sized (`panelFitToContent`). Must be ≤ grid row count (11).
 */
const TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS = 10;

/** Step 1 (welcome): in-grid narrative with emphasis and map-theme colors. */
const TUTORIAL_WELCOME_GRID_BRIEF = (
  <>
    <p>
      <span className="font-bold text-cyan">Admiral</span>
      {", you're late. We've traded losses with the "}
      <span className="font-semibold text-warning-red">enemy</span>
      {", and we're "}
      <span className="font-semibold text-amber">behind on the board</span>
      {", but with "}
      <span className="font-bold text-cyan">you on station</span>
      {" we can turn this around."}
    </p>
    <p>
      {"We're fighting through the "}
      <span className="font-semibold text-amber/70">outer dust belts</span>
      {" over "}
      <span className="font-semibold text-amber">sparse resources</span>
      {". Under "}
      <span className="font-semibold text-amber">space law</span>
      {
        ", whoever exploits a site first keeps it. Out here, that's the rule that matters."
      }
    </p>
  </>
);

/** Step 2 (goals): same wording as before, with emphasis only. */
const TUTORIAL_GOALS_GRID_BRIEF = (
  <>
    <p>
      Each round, ships can mine the resources in the area they control.{" "}
      <span className="font-semibold text-cyan">Central</span> has set the
      claim minimum at <span className="font-bold text-amber">100</span>{" "}
      tons for this{" "}
      <span className="font-semibold text-amber/70">resource cluster</span>.
      {"  "}
      Whoever gets there first gets{" "}
      <span className="font-semibold text-amber">legal control</span> of
      the site.
    </p>
    <p>
      Current tally: <span className="font-semibold text-cyan">60</span>{" "}
      tons us, <span className="font-semibold text-warning-red">70</span> tons them.
      We&apos;re{" "}
      <span className="font-semibold text-amber">in the hole</span>, but{" "}
      <span className="font-bold text-cyan">
        the fight is still yours to take
      </span>
      .
    </p>
  </>
);

/** Step 3 (select-ship): narrative in-grid; orders under Orders. */
const TUTORIAL_SELECT_SHIP_GRID_BRIEF = (
  <>
    <p>
      <span className="font-semibold text-amber">What&apos;s left of</span>{" "}
      our <span className="font-semibold text-cyan">fleet</span> is ready
      for your <span className="font-semibold text-amber">inspection</span>
      .
    </p>
    <p>
      The{" "}
      <span className="font-semibold text-cyan">FLEET STATUS</span> panel
      on the left shows all ships at a glance — yours in{" "}
      <span className="font-semibold text-cyan">blue</span>, enemies in{" "}
      <span className="font-semibold text-warning-red">red</span>.
    </p>
  </>
);

const TUTORIAL_SELECT_SHIP_GRID_TASKS: React.ReactNode[] = [
  <>
    Hover over a ship thumbnail in the{" "}
    <span className="font-semibold text-cyan">FLEET STATUS</span> panel to
    highlight it on the grid.
  </>,
  <>
    Click a ship in <span className="font-semibold text-cyan">FLEET STATUS</span>{" "}
    or directly on the grid to select it and see its{" "}
    <span className="font-semibold text-phosphor-green">movement</span>
    {" and "}
    <span className="font-semibold text-amber">threat range</span>.
  </>,
  <>
    Click a selected ship again to see its{" "}
    <span className="font-semibold text-amber">weapons range</span> from
    the current position.
  </>,
];

/** Step 4 (view-enemy): narrative in-grid; orders under Orders. */
const TUTORIAL_VIEW_ENEMY_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-warning-red">enemy</span> holds the{" "}
      <span className="font-semibold text-amber/70">right side</span> of the
      map. Our sensors can show us their stats and abilities.
    </p>
    <p>
      Enemy ships appear in{" "}
      <span className="font-semibold text-warning-red">red</span> in the{" "}
      <span className="font-semibold text-cyan">FLEET STATUS</span> panel
      — use it to quickly locate them on the grid.
    </p>
  </>
);

const TUTORIAL_VIEW_ENEMY_GRID_TASKS: React.ReactNode[] = [
  <>
    Hover over an enemy thumbnail in{" "}
    <span className="font-semibold text-cyan">FLEET STATUS</span> to
    highlight them on the grid.
  </>,
  <>
    Click an enemy ship in <span className="font-semibold text-cyan">FLEET STATUS</span>{" "}
    or on the grid to see their{" "}
    <span className="font-semibold text-phosphor-green">movement</span>
    {" and "}
    <span className="font-semibold text-amber">threat range</span>.
  </>,
  <>
    Click an enemy ship again to see its{" "}
    <span className="font-semibold text-amber">weapons range</span>.
  </>,
];

/** Step 5 (move-ship): narrative in-grid; orders under Orders. */
const TUTORIAL_MOVE_SHIP_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-cyan">Sentinel</span> is
      damaged. You can protect it by moving it into a{" "}
      <span className="font-semibold text-purple">nebula</span>.
    </p>
    <p>
      Nebula tiles block line of sight. Inside a nebula, ships can only shoot or
      be shot by ships exactly{" "}
      <span className="font-semibold text-amber">1 tile</span> away.
    </p>
  </>
);

const TUTORIAL_MOVE_SHIP_GRID_TASKS: React.ReactNode[] = [
  <>Select the Sentinel.</>,
  <>
    With it selected, click a highlighted tile to stage a move.{" "}
    <span className="font-semibold text-phosphor-green">Green</span> tiles show{" "}
    <span className="font-semibold text-phosphor-green">movement</span> range.
  </>,
  <>
    <span className="font-semibold text-phosphor-green">Submit</span> the move from
    the left panel and approve the transaction.
  </>,
];

/** Step 6 (wait-for-opponent): narrative in-grid; orders under Orders. */
const TUTORIAL_WAIT_FOR_OPPONENT_GRID_BRIEF = (
  <>
    <p>
      After a ship moves, both you and your opponent can see the{" "}
      <span className="font-semibold text-purple">Last Move</span> of the
      ship on the map.
    </p>
    <p>
      This helps you track how ships moved during the turn so you can see what
      changed.
    </p>
  </>
);

const TUTORIAL_WAIT_FOR_OPPONENT_GRID_TASKS: React.ReactNode[] = [
  <>
    Your move is in. In a live match you wait on the opponent. Click{" "}
    <span className="font-semibold text-cyan">Next</span> to advance and see
    their response.
  </>,
];

/** Step 7 (score-points): narrative in-grid; orders under Orders. */
const TUTORIAL_SCORE_POINTS_GRID_BRIEF = (
  <>
    <p>
      At round end, each scoring zone we{" "}
      <span className="font-semibold text-amber">controlled</span> by a
      functioning ship (not disabled) counts toward points.
    </p>
    <p>
      The enemy destroyer moved to capture a resource. Respond by moving the{" "}
      <span className="font-semibold text-cyan">Resolute</span> to claim one
      for us.
    </p>
  </>
);

const TUTORIAL_SCORE_POINTS_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan">Resolute</span> and
    move it to the highlighted central scoring tile.
  </>,
  <>
    <span className="font-semibold text-phosphor-green">Submit</span> the move and
    approve the transaction.
  </>,
];

/** Step 8 (shoot): narrative in-grid; orders under Orders. */
const TUTORIAL_SHOOT_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-warning-red">Hammer</span> just hit
      the <span className="font-semibold text-cyan">Resolute</span> with a
      plasma shot! Answer with the{" "}
      <span className="font-semibold text-cyan">Vigilant</span>: move to a
      resource and shoot back.
    </p>
  </>
);

const TUTORIAL_SHOOT_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan">Vigilant</span> and
    stage a move to the highlighted tile.
  </>,
  <>
    Click the <span className="font-semibold text-warning-red">Hammer</span> to
    target it.
  </>,
  <>
    <span className="font-semibold text-phosphor-green">Submit</span> to confirm move
    and shot together.
  </>,
];

/** Step 9 (end-of-round): narrative in-grid; orders under Orders. */
const TUTORIAL_END_OF_ROUND_GRID_BRIEF = (
  <>
    <p>
      When <span className="font-semibold text-amber">both sides</span>{" "}
      have moved all their ships, the round ends, and points are awarded for
      resources held. Movement markers clear and the{" "}
      <span className="font-semibold text-cyan">first player</span> swaps:
      whoever went second last round leads this one.
    </p>
  </>
);

const TUTORIAL_END_OF_ROUND_GRID_TASKS: React.ReactNode[] = [
  <>
    You must wait for the opponent to open the new round. Click{" "}
    <span className="font-semibold text-cyan">Next</span> to see their move.
  </>,
];

/** Step 10 (special-emp): narrative in-grid; orders under Orders. */
const TUTORIAL_SPECIAL_EMP_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-warning-red">Anvil</span> just blasted
      the <span className="font-semibold text-cyan">Resolute</span>!
    </p>
    <p>
      We have a powerful gun, but we still can&apos;t knock it out in one hit.
      Luckily, the <span className="font-semibold text-warning-red">Anvil</span> has{" "}
      <span className="font-semibold text-purple">reactor damage</span> (💀)
      from earlier in the fight. We can bypass its defenses and kill it
      instantly with an <span className="font-semibold text-cyan">EMP</span>
      !
    </p>
  </>
);

const TUTORIAL_SPECIAL_EMP_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan">Resolute</span> and
    target the <span className="font-semibold text-warning-red">Anvil</span>.
  </>,
  <>
    In the action bar, switch from{" "}
    <span className="font-semibold text-cyan/80">Plasma</span> to{" "}
    <span className="font-semibold text-cyan/80">EMP</span>.
  </>,
  <>
    <span className="font-semibold text-phosphor-green">Submit</span>, then approve
    the transaction.
  </>,
];

/** Step 11 (ship-destruction): narrative in-grid; orders under Orders. */
const TUTORIAL_SHIP_DESTRUCTION_GRID_BRIEF = (
  <>
    <p>
      Resolute&apos;s EMP rammed the{" "}
      <span className="font-semibold text-warning-red">Anvil</span>
      &apos;s reactor past{" "}
      <span className="font-semibold text-amber">
        three overload points
      </span>
      . The stack detonates in a blinding flash and the ship is destroyed!
    </p>
    <p>
      No ship survives once its reactor reaches three overload points (💀). The{" "}
      <span className="font-semibold text-cyan">owner</span> may recycle the
      NFT and take half the usual UTC recycle value. The player who{" "}
      <span className="font-semibold text-cyan">destroyed it</span> gets the
      matching half.
    </p>
  </>
);

const TUTORIAL_SHIP_DESTRUCTION_GRID_TASKS: React.ReactNode[] = [
  <>
    Click <span className="font-semibold text-cyan">Next</span> when you are
    ready.
  </>,
];

/** Step 12 (rescue): narrative in-grid; orders under Orders. */
const TUTORIAL_RESCUE_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-warning-red">enemy</span> retaliated
      by disabling the{" "}
      <span className="font-semibold text-cyan">Resolute</span>. It also has{" "}
      <span className="font-semibold text-purple">reactor damage</span>{" "}
      (💀), so one more hit and it&apos;s gone! Even worse, your repair ship is
      too far away to reach it in time.
    </p>
    <p>
      We&apos;re at the end: Whoever holds the center wins. What matters the
      most to you?
    </p>
  </>
);

const TUTORIAL_RESCUE_GRID_TASKS: React.ReactNode[] = [
  <>
    <span className="font-semibold text-cyan">Save your ship:</span> select
    the Resolute and{" "}
    <span className="font-semibold text-phosphor-green">submit</span> Retreat to
    leave the map.
  </>,
  <>
    <span className="font-semibold text-cyan">Sacrifice for victory:</span>{" "}
    select the Vigilant, target the{" "}
    <span className="font-semibold text-warning-red">Hammer</span>, then{" "}
    <span className="font-semibold text-phosphor-green">submit</span> the shot.
  </>,
];

/** Step 13 (rescue-outcome-sniper): sacrifice branch, seize center with fighter. */
const TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_BRIEF = (
  <>
    <p>
      As expected, the{" "}
      <span className="font-semibold text-warning-red">Hammer</span> destroyed the{" "}
      <span className="font-semibold text-cyan">Resolute</span>.
    </p>
    <p>
      You traded that ship for the ability to retake the center resource. The
      resource point is open now. Take it with the{" "}
      <span className="font-semibold text-cyan">Sentinel</span>.
    </p>
  </>
);

const TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan">Sentinel</span> and
    stage a move to the highlighted tile.
  </>,
  <>
    Optionally click the{" "}
    <span className="font-semibold text-warning-red">Hammer</span> to stage a shot.
  </>,
  <>
    <span className="font-semibold text-phosphor-green">Submit</span> to confirm the
    move, with or without the shot.
  </>,
];

/** Step 13 (rescue-outcome-retreat): Resolute saved; center open for Hammer. */
const TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-cyan">Resolute</span> is
      safely off the map!
    </p>
    <p>
      You spent your action to save the hull, but the center resource tile is
      undefended. The <span className="font-semibold text-warning-red">Hammer</span>{" "}
      can step in and secure it.
    </p>
    <p>
      That puts them over the threshold and central will award them control of
      this region.
    </p>
  </>
);

const TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_TASKS: React.ReactNode[] = [
  <>
    Click <span className="font-semibold text-cyan">Next</span> when you are
    ready to see the opponent&apos;s response.
  </>,
];

/** Step 14 victory path (completion-sniper): debrief only; CTA lives in TutorialGridTaskPanel.primaryCta. */
const TUTORIAL_COMPLETION_SNIPER_GRID_BRIEF = (
  <>
    <p>
      <span className="font-semibold text-phosphor-green">Victory</span>! You secured
      the the center resource and guaranteed the win!
    </p>
    <p>
      You gave up the{" "}
      <span className="font-semibold text-cyan">Resolute</span> to earn that
      opening. In the outer dust clouds, victory comes at a cost.
    </p>
  </>
);

export const TUTORIAL_COMPLETION_SNIPER_PRIMARY_CTA_SUPPORTING = (
  <>
    You held the line in the battle. Claim{" "}
    <span className="font-semibold text-amber">2 free ships</span>, put
    this win on your record, and join the fight against other admirals.
  </>
);

/** Step 14 loss path (completion-retreat): mirrors victory slide; board shows enemy on center. */
const TUTORIAL_COMPLETION_RETREAT_GRID_BRIEF = (
  <>
    <p>
      <span className="font-semibold text-amber">Live to fight again.</span>{" "}
      The <span className="font-semibold text-warning-red">Hammer</span> claimed the
      center resource, which puts the{" "}
      <span className="font-semibold text-warning-red">enemy</span> over the
      threshold.
    </p>
    <p>
      You <span className="font-semibold text-amber">lost</span> this
      engagement, but you kept your most{" "}
      <span className="font-semibold text-cyan">powerful ship</span>.
      Sometimes you must accept the loss of a battle to win the war.
    </p>
  </>
);

export const TUTORIAL_COMPLETION_RETREAT_PRIMARY_CTA_SUPPORTING = (
  <>
    You banked power when it mattered.{" "}
    <span className="font-semibold text-cyan">Log in</span> to claim{" "}
    <span className="font-semibold text-amber">3 free ships</span>, fight,
    log this loss on your record, and join the fight against other admirals.
  </>
);

export type TutorialGridPanelConfig = {
  title: string;
  brief: React.ReactNode;
  tasks?: React.ReactNode[];
  tasksSectionLabel?: React.ReactNode;
  primaryCta?: {
    eyebrow: string;
    headline: string;
    supporting: React.ReactNode;
    buttonLabel: string;
    onClick: () => void;
  };
  /**
   * Max panel height as a fraction of the grid (11 rows). Branch finals use
   * `TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS` with `panelFitToContent`;
   * rescue (Hard choice) uses `TUTORIAL_RESCUE_PANEL_MAX_ROWS`.
   */
  panelBottomRowExclusive?: number;
  /** Branch finals: size panel to content, capped by `panelBottomRowExclusive`. */
  panelFitToContent?: boolean;
};

export function getTutorialGridPanelConfig(
  stepId: string,
): TutorialGridPanelConfig | null {
  switch (stepId) {
    case "welcome":
      return { title: "Welcome aboard", brief: TUTORIAL_WELCOME_GRID_BRIEF };
    case "goals":
      return { title: "How we win", brief: TUTORIAL_GOALS_GRID_BRIEF };
    case "select-ship":
      return {
        title: "Select a Ship",
        brief: TUTORIAL_SELECT_SHIP_GRID_BRIEF,
        tasks: TUTORIAL_SELECT_SHIP_GRID_TASKS,
      };
    case "view-enemy":
      return {
        title: "Inspect Enemy Ships",
        brief: TUTORIAL_VIEW_ENEMY_GRID_BRIEF,
        tasks: TUTORIAL_VIEW_ENEMY_GRID_TASKS,
      };
    case "move-ship":
      return {
        title: "Move Your Ship",
        brief: TUTORIAL_MOVE_SHIP_GRID_BRIEF,
        tasks: TUTORIAL_MOVE_SHIP_GRID_TASKS,
      };
    case "wait-for-opponent":
      return {
        title: "Previous Position",
        brief: TUTORIAL_WAIT_FOR_OPPONENT_GRID_BRIEF,
        tasks: TUTORIAL_WAIT_FOR_OPPONENT_GRID_TASKS,
      };
    case "score-points":
      return {
        title: "Scoring zones",
        brief: TUTORIAL_SCORE_POINTS_GRID_BRIEF,
        tasks: TUTORIAL_SCORE_POINTS_GRID_TASKS,
      };
    case "shoot":
      return {
        title: "Move and Return Fire",
        brief: TUTORIAL_SHOOT_GRID_BRIEF,
        tasks: TUTORIAL_SHOOT_GRID_TASKS,
      };
    case "end-of-round":
      return {
        title: "End of round",
        brief: TUTORIAL_END_OF_ROUND_GRID_BRIEF,
        tasks: TUTORIAL_END_OF_ROUND_GRID_TASKS,
      };
    case "special-emp":
      return {
        title: "EMP",
        brief: TUTORIAL_SPECIAL_EMP_GRID_BRIEF,
        tasks: TUTORIAL_SPECIAL_EMP_GRID_TASKS,
      };
    case "ship-destruction":
      return {
        title: "Aftermath",
        brief: TUTORIAL_SHIP_DESTRUCTION_GRID_BRIEF,
        tasks: TUTORIAL_SHIP_DESTRUCTION_GRID_TASKS,
      };
    case "rescue":
      return {
        title: "Hard choice",
        brief: TUTORIAL_RESCUE_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_GRID_TASKS,
        tasksSectionLabel: (
          <span
            className="text-warning-red animate-tutorial-decision-label font-black"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              filter: "drop-shadow(0 0 14px color-mix(in srgb, var(--color-warning-red) 80%, transparent))",
            }}
          >
            Make your decision
          </span>
        ),
        panelBottomRowExclusive: TUTORIAL_RESCUE_PANEL_MAX_ROWS,
      };
    case "rescue-outcome-sniper":
      return {
        title: "Accepting a Sacrifice",
        brief: TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_TASKS,
      };
    case "rescue-outcome-retreat":
      return {
        title: "The Resolute is Safe",
        brief: TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_TASKS,
      };
    case "completion-retreat":
      return {
        title: "Planning Ahead",
        brief: TUTORIAL_COMPLETION_RETREAT_GRID_BRIEF,
        panelBottomRowExclusive: TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS,
        panelFitToContent: true,
      };
    case "completion-sniper":
      return {
        title: "Victory Achieved!",
        brief: TUTORIAL_COMPLETION_SNIPER_GRID_BRIEF,
        panelBottomRowExclusive: TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS,
        panelFitToContent: true,
      };
    default:
      return null;
  }
}
