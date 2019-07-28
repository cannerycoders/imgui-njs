import {ImguiDragDropMixin} from "./dragdrop.js";
import {ImguiLoggingMixin} from "./logging.js";
import {ImguiMiscMixin} from "./misc.js";
import {ImguiNavMixin} from "./nav.js";
import {ImguiRenderMixin} from "./render.js";
import {ImguiSettingsMixin} from "./settings.js";
import {ImguiWinMgrMixin} from "./winmgr.js";

import {ImguiButtonMixin} from "./widgets/button.js";
import {ImguiColorEditMixin} from "./widgets/coloredit.js";
import {ImguiColorPickerMixin} from "./widgets/colorpicker.js";
import {ImguiColumnMixin} from "./widgets/column.js";
import {ImguiComboMixin} from "./widgets/combo.js";
import {ImguiDragMixin} from "./widgets/drag.js";
import {ImguiInputMixin} from "./widgets/inputtext.js";
import {ImguiLayoutMixin} from "./widgets/layout.js";
import {ImguiListboxMixin} from "./widgets/listbox.js";
import {ImguiMenuMixin} from "./widgets/menu.js";
import {ImguiPlotMixin} from "./widgets/plot.js";
import {ImguiPopupMixin} from "./widgets/popup.js";
import {ImguiScrollbarMixin} from "./widgets/scrollbar.js";
import {ImguiSelectableMixin} from "./widgets/selectable.js";
import {ImguiSliderMixin} from "./widgets/slider.js";
import {ImguiTabBarMixin} from "./widgets/tab.js";
import {ImguiTextMixin} from "./widgets/text.js";
import {ImguiTooltipMixin} from "./widgets/tooltip.js";
import {ImguiTreeMixin} from "./widgets/tree.js";

// Our job is to compose extra files' worth of methods for the
// (gigantic) ImgGui class.
export class ImguiMixins
{
    constructor()
    {
    }
}

let mixins = [
    // support for internal/provate methods
    ImguiDragDropMixin,
    ImguiLoggingMixin,
    ImguiMiscMixin,
    ImguiNavMixin,
    ImguiRenderMixin,
    ImguiSettingsMixin,
    ImguiWinMgrMixin,

    // external widget support
    ImguiButtonMixin,
    ImguiColorEditMixin,
    ImguiColorPickerMixin,
    ImguiColumnMixin,
    ImguiComboMixin,
    ImguiDragMixin,
    ImguiInputMixin,
    ImguiLayoutMixin,
    ImguiListboxMixin,
    ImguiMenuMixin,
    ImguiPopupMixin,
    ImguiPlotMixin,
    ImguiScrollbarMixin,
    ImguiSelectableMixin,
    ImguiSliderMixin,
    ImguiTabBarMixin,
    ImguiTextMixin,
    ImguiTooltipMixin,
    ImguiTreeMixin,
];

for(let m of mixins)
    Object.assign(ImguiMixins.prototype, m);
