// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderWeapon is IRenderComponent {
    IReturnSVG public immutable renderWeapon1; // Generic
    IReturnSVG public immutable renderWeapon2; // Sniper
    IReturnSVG public immutable renderWeapon3; // Missile
    IReturnSVG public immutable renderWeapon4; // Close

    constructor(address[] memory renderers) {
        require(
            renderers.length == 4,
            "Invalid renderers array in RenderWeapon"
        );
        renderWeapon1 = IReturnSVG(renderers[0]);
        renderWeapon2 = IReturnSVG(renderers[1]);
        renderWeapon3 = IReturnSVG(renderers[2]);
        renderWeapon4 = IReturnSVG(renderers[3]);
    }

    function render(
        Ship memory ship
    ) external view override returns (string memory) {
        if (ship.equipment.mainWeapon == MainWeapon.Generic) {
            return renderWeapon1.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.Sniper) {
            return renderWeapon2.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.Missile) {
            return renderWeapon3.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.Close) {
            return renderWeapon4.render(ship);
        }
        return "";
    }
}
