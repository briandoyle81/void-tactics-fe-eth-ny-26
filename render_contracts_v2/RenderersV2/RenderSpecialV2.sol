// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderSpecialV2 is IRenderComponent {
    IReturnSVG public immutable render0; // Special.Slot1
    IReturnSVG public immutable render1; // Special.Slot2
    IReturnSVG public immutable render2; // Special.Slot3

    constructor(address[] memory renderers) {
        require(renderers.length == 3, "Invalid renderers array in RenderSpecialV2");
        render0 = IReturnSVG(renderers[0]);
        render1 = IReturnSVG(renderers[1]);
        render2 = IReturnSVG(renderers[2]);
    }

    function render(Ship memory ship) external view override returns (string memory) {
        if (ship.equipment.special == Special.None) {
            return "";
        } else if (ship.equipment.special == Special.Slot1) {
            return render0.render(ship);
        } else if (ship.equipment.special == Special.Slot2) {
            return render1.render(ship);
        } else if (ship.equipment.special == Special.Slot3) {
            return render2.render(ship);
        }
        return "";
    }
}
