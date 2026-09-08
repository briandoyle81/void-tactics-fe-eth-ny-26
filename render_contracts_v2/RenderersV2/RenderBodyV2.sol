// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderBodyV2 is IRenderComponent {
    IReturnSVG public immutable render0; // RenderBaseBodyV2
    IReturnSVG public immutable render1; // RenderShield1V2
    IReturnSVG public immutable render2; // RenderShield2V2
    IReturnSVG public immutable render3; // RenderShield3V2
    IReturnSVG public immutable render4; // RenderArmor1V2
    IReturnSVG public immutable render5; // RenderArmor2V2
    IReturnSVG public immutable render6; // RenderArmor3V2

    constructor(address[] memory renderers) {
        require(renderers.length == 7, "Invalid renderers array in RenderBodyV2");
        render0 = IReturnSVG(renderers[0]);
        render1 = IReturnSVG(renderers[1]);
        render2 = IReturnSVG(renderers[2]);
        render3 = IReturnSVG(renderers[3]);
        render4 = IReturnSVG(renderers[4]);
        render5 = IReturnSVG(renderers[5]);
        render6 = IReturnSVG(renderers[6]);
    }

    function render(Ship memory ship) external view override returns (string memory) {
        if (
            ship.equipment.shields == Shields.None &&
            ship.equipment.armor == Armor.None
        ) {
            return render0.render(ship);
        }

        if (ship.equipment.shields != Shields.None) {
            if (ship.equipment.shields == Shields.Light) {
                return render1.render(ship);
            } else if (ship.equipment.shields == Shields.Medium) {
                return render2.render(ship);
            } else if (ship.equipment.shields == Shields.Heavy) {
                return render3.render(ship);
            }
        }

        if (ship.equipment.armor != Armor.None) {
            if (ship.equipment.armor == Armor.Light) {
                return render4.render(ship);
            } else if (ship.equipment.armor == Armor.Medium) {
                return render5.render(ship);
            } else if (ship.equipment.armor == Armor.Heavy) {
                return render6.render(ship);
            }
        }

        return render0.render(ship);
    }
}
