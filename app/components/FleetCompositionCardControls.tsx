"use client";

// Used by both ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) to build
// the shared ShipCard.tsx's `fleetCompositionControls` render-prop slot —
// the add/remove-from-active-fleet buttons shown per ship card, ported
// verbatim from ManageNavy.tsx.
// Callers decide whether to render this at all (vs. `undefined`, e.g. for
// unconstructed ships) since that gates a wrapper element in the card.
interface FleetCompositionCardControlsProps {
  destroyedAndInComposition: boolean;
  inComposition: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function FleetCompositionCardControls({
  destroyedAndInComposition,
  inComposition,
  onAdd,
  onRemove,
}: FleetCompositionCardControlsProps) {
  const addBtn = (
    <button
      type="button"
      className="w-full px-2 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
      style={{ borderRadius: 0 }}
      onClick={onAdd}
    >
      [ADD TO FLEET]
    </button>
  );
  const removeBtn = (
    <button
      type="button"
      className="w-full px-2 py-2 rounded-none border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
      style={{ borderRadius: 0 }}
      onClick={onRemove}
    >
      [REMOVE FROM FLEET]
    </button>
  );

  if (destroyedAndInComposition) {
    return (
      <div className="text-center py-3 px-2 space-y-2">
        <div className="text-warning-red text-xs font-mono">
          Destroyed: remove from preset
        </div>
        {removeBtn}
      </div>
    );
  }
  return <div className="text-center py-3 px-2">{inComposition ? removeBtn : addBtn}</div>;
}
