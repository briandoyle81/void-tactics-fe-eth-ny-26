// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Types.sol";
import "./IRenderer.sol";
import "./RenderersV2/RenderSpecialV2.sol";
import "./RenderersV2/RenderAftV2.sol";
import "./RenderersV2/RenderWeaponV2.sol";
import "./RenderersV2/RenderBodyV2.sol";
import "./RenderersV2/RenderForeV2.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract ImageRendererV2 is IImageRenderer {
    using Strings for string;

    string private constant BASE_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">';
    string private constant SVG_END = "</svg>";

    string private constant UNCONSTRUCTED_IMAGE =
        "ipfs://bafkreibc3fdrdsw4l7zy4wjrgalvfhg6kfd3wmijwefny3nxj5244x2tr4";
    string private constant DESTROYED_IMAGE =
        "ipfs://bafkreige3z6iopsmgyzefidhydbaikpipxwrstqzuylw2y2c4rvwnn6yvm";

    IRenderComponent public immutable renderSpecial;
    IRenderComponent public immutable renderAft;
    IRenderComponent public immutable renderWeapon;
    IRenderComponent public immutable renderBody;
    IRenderComponent public immutable renderFore;

    constructor(
        address _renderSpecial,
        address _renderAft,
        address _renderWeapon,
        address _renderBody,
        address _renderFore
    ) {
        renderSpecial = IRenderComponent(_renderSpecial);
        renderAft = IRenderComponent(_renderAft);
        renderWeapon = IRenderComponent(_renderWeapon);
        renderBody = IRenderComponent(_renderBody);
        renderFore = IRenderComponent(_renderFore);
    }

    function renderShip(Ship memory ship) public view override returns (string memory) {
        if (ship.shipData.timestampDestroyed > 0) {
            return DESTROYED_IMAGE;
        } else if (!ship.shipData.constructed) {
            return UNCONSTRUCTED_IMAGE;
        }

        string memory svg = BASE_SVG;
        svg = string.concat(svg, renderSpecial.render(ship));
        svg = string.concat(svg, renderAft.render(ship));
        svg = string.concat(svg, renderWeapon.render(ship));
        svg = string.concat(svg, renderBody.render(ship));
        svg = string.concat(svg, renderFore.render(ship));
        svg = string.concat(svg, SVG_END);

        string memory base64Svg = Base64.encode(bytes(svg));
        return
            string(abi.encodePacked("data:image/svg+xml;base64,", base64Svg));
    }
}
