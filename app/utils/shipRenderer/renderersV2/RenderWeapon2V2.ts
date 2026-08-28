/**
 * RenderWeapon2V2
 * Ported from RenderWeapon2V2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { blendHSLV2 } from "../utils";

const PART_1 = "<path d=\"M139 74L136 78L51 78L48 79L49 84L112 84L112 87L49 87L49 92L110 92L112 94L123 94L129 98L129 100L125 100L120 101L120 104L126 108L140 108L146 111L154 106L158 103L158 100L150 100L150 98L154 95L159 95L165 92L165 87L166 81L163 79L160 76L155 74Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_2 = ";\"/><path d=\"M140 76L138 79L133 79L133 92L135 92L134 90L137 93L142 94L141 92L139 92L135 88L137 86L137 88L140 92L139 84L141 83L141 90L144 93L150 93L155 89L155 83L153 82L153 80L156 82L157 81L156 89L155 91L157 91L158 86L158 80L145 79L140 82L144 78L157 78L159 81L160 88L160 79L156 76ZM51 79L50 81L52 83L54 81L111 81L112 80L54 80ZM113 79L113 91L116 92L114 89L117 90L117 79ZM118 79L119 91L129 92L131 89L132 79ZM119 80L124 81L130 80ZM161 80L162 89L158 94L164 88L164 81ZM137 81L137 83L135 82L136 84L138 84L139 81ZM146 81L143 85L143 87L147 90L152 88L152 84L148 81ZM119 83L125 84L131 83ZM146 83L145 84L145 88L150 87L150 86L149 83ZM147 84L146 86L147 87L149 84ZM119 86L124 87L130 86ZM50 88L50 89L111 89L99 88ZM119 89L125 90L131 89ZM50 90L52 91L53 90ZM133 95L134 97L132 102L135 98L137 101L141 100L141 98L139 99L139 95L137 98L137 95ZM135 96L135 98L137 99L138 98ZM128 102L127 103L124 104L123 104L125 107L142 107L146 111L143 105L146 106L145 103L148 105L148 103L145 102ZM151 102L151 104L153 105L152 102ZM128 103L127 105L128 105L132 106L132 104L131 105ZM150 103L146 107L147 108L151 106L150 103Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_3 = ";\"/><path d=\"M140 76L138 79L134 80L133 90L135 82L136 80L139 81L138 79L141 80L140 78L143 77L142 80L145 77L154 77L155 76ZM158 78L159 81L160 80ZM119 79L118 80L119 83L129 83L129 81L119 81L131 79ZM144 79L140 82L142 91L145 93L150 93L155 89L155 83L153 82L153 80L156 82L157 81L156 89L155 91L157 91L158 86L158 80ZM114 80L116 82L115 85L117 86L117 80ZM161 80L162 87L163 82ZM136 81L135 84L137 85L140 83L136 84L137 81ZM146 81L143 85L143 87L147 90L152 88L152 84L148 81ZM147 83L145 86L147 88L150 86L147 85L148 83ZM119 84L125 85L131 84ZM119 87L119 89L129 89L129 87ZM50 88L52 89L53 88ZM134 97L137 100L138 99ZM128 102L130 105L128 105L126 103L125 106L127 105L128 108L128 105L131 107L134 105L137 104L136 107L141 105L141 103L137 104L136 102ZM142 103L142 105L144 105L144 103ZM131 104L130 106L132 106L132 104Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_4 = ";\"/><path d=\"M135 79L137 80L138 79ZM144 79L140 82L142 91L145 93L150 93L155 89L155 83L153 82L153 80L156 82L157 81L156 89L155 91L157 91L158 86L158 80ZM133 80L133 85L134 82ZM119 81L119 83L129 83L129 81ZM146 81L143 85L143 87L147 90L152 88L152 84L148 81ZM147 83L145 86L147 85L146 88L149 87L149 85L147 85L148 83ZM119 87L119 89L129 89L129 87Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_5 = ";\"/><path d=\"M135 79L137 80L138 79ZM144 79L144 81L148 81L148 80ZM149 79L152 81L153 81L153 79ZM133 80L133 85L134 82ZM143 80L140 83L142 83L143 81ZM157 80L157 84L156 89L155 91L157 91L158 86ZM119 81L119 83L129 83L129 81ZM147 83L145 87L146 85L150 88L147 84L148 83ZM154 83L154 88L151 91L145 92L141 89L142 92L143 92L150 93L155 88ZM119 87L119 89L129 89L129 87Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_6 = ";\"/><path d=\"M135 79L137 80L138 79ZM133 80L133 85L134 82ZM144 80L146 81L149 80ZM119 81L119 83L129 83L129 81ZM147 83L145 86L148 86L148 83ZM119 87L119 89L129 89L129 87Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_7 = ";\"/><path d=\"M135 79L137 80L138 79ZM133 80L133 85L134 82ZM144 80L146 81L149 80ZM119 81L119 83L124 82L125 81ZM147 83L145 86L148 86L148 83ZM125 87L124 89L128 88L129 87Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_8 = ";\"/><path d=\"M144 80L146 81L149 80ZM119 81L119 83L124 82L125 81ZM125 87L124 89L128 88L129 87Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_9 = ";\"/><path d=\"M144 80L146 81L149 80ZM122 81L124 82L125 81Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_10 = ";\"/><path d=\"M144 80L146 81L149 80Z\" fill-rule=\"evenodd\" style=\"fill:";
const PART_11 = ";\"/>";

const COLOR_1 = "hsl(30, 8%, 5%)";
const COLOR_2 = "hsl(45, 3%, 27%)";
const COLOR_3 = "hsl(27, 4%, 48%)";
const COLOR_4 = "hsl(20, 95%, 42%)";
const COLOR_5 = "hsl(15, 97%, 23%)";
const COLOR_6 = "hsl(188, 100%, 54%)";
const COLOR_7 = "hsl(14, 11%, 77%)";
const COLOR_8 = "hsl(193, 87%, 45%)";
const COLOR_9 = "hsl(184, 100%, 70%)";
const COLOR_10 = "hsl(31, 100%, 65%)";

export function renderWeapon2V2(ship: ShipVisual): string {
  return (
    PART_1 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_1
        )
      : COLOR_1) +
    PART_2 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_2
        )
      : COLOR_2) +
    PART_3 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_3
        )
      : COLOR_3) +
    PART_4 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_4
        )
      : COLOR_4) +
    PART_5 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_5
        )
      : COLOR_5) +
    PART_6 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_6
        )
      : COLOR_6) +
    PART_7 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_7
        )
      : COLOR_7) +
    PART_8 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_8
        )
      : COLOR_8) +
    PART_9 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_9
        )
      : COLOR_9) +
    PART_10 +
    (ship.shipData.shiny
      ? blendHSLV2(
          ship.traits.colors.h1,
          ship.traits.colors.s1,
          ship.traits.colors.l1,
          COLOR_10
        )
      : COLOR_10) +
    PART_11
  );
}
