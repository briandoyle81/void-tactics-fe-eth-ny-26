// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderForeV2 is IRenderComponent {
    IReturnSVG public immutable render0; // RenderFore0V2
    IReturnSVG public immutable render1; // RenderFore1V2
    IReturnSVG public immutable render2; // RenderFore2V2
    IReturnSVG public immutable render3; // RenderForePerfectV2

    constructor(address[] memory renderers) {
        require(renderers.length == 4, "Invalid renderers array in RenderForeV2");
        render0 = IReturnSVG(renderers[0]);
        render1 = IReturnSVG(renderers[1]);
        render2 = IReturnSVG(renderers[2]);
        render3 = IReturnSVG(renderers[3]);
    }

    function render(Ship memory ship) external view override returns (string memory) {
        if (
            ship.traits.accuracy == 2 &&
            ship.traits.hull == 2 &&
            ship.traits.speed == 2 &&
            (ship.equipment.armor == Armor.Heavy ||
                ship.equipment.shields == Shields.Heavy)
        ) {
            return render3.render(ship);
        }
        if (ship.traits.accuracy == 0) {
            return render0.render(ship);
        } else if (ship.traits.accuracy == 1) {
            return render1.render(ship);
        } else {
            return render2.render(ship);
        }
    }
}
