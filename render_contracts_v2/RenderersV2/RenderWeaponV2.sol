// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderWeaponV2 is IRenderComponent {
    IReturnSVG public immutable render0; // MainWeapon.Laser
    IReturnSVG public immutable render1; // MainWeapon.Railgun
    IReturnSVG public immutable render2; // MainWeapon.MissileLauncher
    IReturnSVG public immutable render3; // MainWeapon.PlasmaCannon

    constructor(address[] memory renderers) {
        require(renderers.length == 4, "Invalid renderers array in RenderWeaponV2");
        render0 = IReturnSVG(renderers[0]);
        render1 = IReturnSVG(renderers[1]);
        render2 = IReturnSVG(renderers[2]);
        render3 = IReturnSVG(renderers[3]);
    }

    function render(Ship memory ship) external view override returns (string memory) {
        if (ship.equipment.mainWeapon == MainWeapon.Laser) {
            return render0.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.Railgun) {
            return render1.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.MissileLauncher) {
            return render2.render(ship);
        } else if (ship.equipment.mainWeapon == MainWeapon.PlasmaCannon) {
            return render3.render(ship);
        }
        return "";
    }
}
