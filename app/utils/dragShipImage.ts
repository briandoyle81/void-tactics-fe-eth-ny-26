// Browsers' default HTML5 drag-ghost snapshot does not reliably respect a
// live CSS transform (confirmed the hard way — see GameGridCell.tsx's git
// history), so a mirrored (creator) ship's drag ghost shows facing the
// wrong way even though the source card and the final placed ship both
// render correctly. Bake the mirror into an actual pixel snapshot instead
// and hand that to setDragImage. Shared by GameGridCell.tsx (repositioning
// a ship already on the live-game grid) and FleetShipListPanel.tsx
// (dragging a ship from the roster list onto the fleet-placement board) —
// same underlying browser limitation, same fix, previously duplicated.
export function setMirroredDragImage(
  e: React.DragEvent,
  shipImg: HTMLImageElement,
  isFlipped: boolean,
): void {
  if (!shipImg.complete || shipImg.naturalWidth === 0) return;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (isFlipped) {
    ctx.translate(64, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(shipImg, 0, 0, 64, 64);

  const dragImage = document.createElement("img");
  dragImage.src = canvas.toDataURL();
  dragImage.style.position = "absolute";
  dragImage.style.top = "-1000px";
  dragImage.style.width = "64px";
  dragImage.style.height = "64px";
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 32, 32);
  setTimeout(() => {
    if (document.body.contains(dragImage)) {
      document.body.removeChild(dragImage);
    }
  }, 0);
}
