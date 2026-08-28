// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../Types.sol";
import "../IRenderer.sol";

contract RenderAftV2 is IRenderComponent {
    IReturnSVG public immutable render0;
    IReturnSVG public immutable render1;
    IReturnSVG public immutable render2;

    constructor(address[] memory renderers) {
        require(renderers.length == 3, "Invalid renderers array in RenderAftV2");
        render0 = IReturnSVG(renderers[0]);
        render1 = IReturnSVG(renderers[1]);
        render2 = IReturnSVG(renderers[2]);
    }

    function render(Ship memory ship) external view override returns (string memory) {
        if (ship.traits.speed == 0) {
            return render0.render(ship);
        } else if (ship.traits.speed == 1) {
            return render1.render(ship);
        } else {
            return render2.render(ship);
        }
    }
}
