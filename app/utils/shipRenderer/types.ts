import { ShipVisual } from "../../types/shipVisual";

export interface IRenderComponent {
  render(ship: ShipVisual): string;
}

export interface IReturnSVG {
  render(ship: ShipVisual): string;
}

export type ShipRendererInput = ShipVisual;
