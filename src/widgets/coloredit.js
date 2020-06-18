import {Vec2, Rect, ValRef} from "../types.js";
import {CondFlags, CornerFlags, ItemStatusFlags} from "../flags.js";
import {Dir} from "../enums.js";
import {InputTextFlags} from "./inputtext.js";
import {Color, CSSColors} from "../color.js";
import {DragPayloads} from "./drag.js";

export var ColorEditFlags =
{
    None: 0,
    NoAlpha: 1 << 1,   // ColorEdit, ColorPicker, ColorButton: ignore Alpha component (will only read 3 components from the input pointer).
    NoPicker: 1 << 2,  // ColorEdit: disable picker when clicking on colored square.
    NoOptions: 1 << 3, // ColorEdit: disable toggling options menu when right-clicking on inputs/small preview.
    NoSmallPreview: 1 << 4, // ColorEdit, ColorPicker: disable colored square preview next to the inputs. (e.g. to show only the inputs)
    NoInputs: 1 << 5,   // ColorEdit, ColorPicker: disable inputs sliders/text widgets (e.g. to show only the small preview colored square).
    NoTooltip: 1 << 6,   // ColorEdit, ColorPicker, ColorButton: disable tooltip when hovering the preview.
    NoLabel: 1 << 7,   // ColorEdit, ColorPicker: disable display of inline text label (the label is still forwarded to the tooltip and picker).
    NoSidePreview: 1 << 8,   // ColorPicker: disable bigger color preview on right side of the picker, use small colored square preview instead.
    NoDragDrop: 1 << 9,   // ColorEdit: disable drag and drop target. ColorButton: disable drag and drop source.

    // User Options (right-click on widget to change some of them).
    AlphaBar: 1 << 16,  // ColorEdit, ColorPicker: show vertical alpha bar/gradient in picker.
    AlphaPreview: 1 << 17,  // ColorEdit, ColorPicker, ColorButton: display preview as a transparent color over a checkerboard, instead of opaque.
    AlphaPreviewHalf: 1 << 18,  // ColorEdit, ColorPicker, ColorButton: display half opaque / half checkerboard, instead of opaque.
    HDR: 1 << 19,  // (WIP) ColorEdit: Currently only disable 0.0f..1.0f limits in RGBA edition (note: you probably want to use ImGuiColorEditFlags_Float flag as well).
    DisplayRGB: 1 << 20,  // [Display]    // ColorEdit: override _display_ type among RGB/HSV/Hex. ColorPicker: select any combination using one or more of RGB/HSV/Hex.
    DisplayHSV: 1 << 21,  // [Display]    // "
    DisplayHex: 1 << 22,  // [Display]    // "
    Uint8: 1 << 23,  // [DataType]   // ColorEdit, ColorPicker, ColorButton: _display_ values formatted as 0..255.
    Float: 1 << 24,  // [DataType]   // ColorEdit, ColorPicker, ColorButton: _display_ values formatted as 0.0f..1.0f floats instead of 0..255 integers. No round-trip of value via integers.
    PickerHueBar: 1 << 25,  // [Picker]     // ColorPicker: bar for Hue, rectangle for Sat/Value.
    PickerHueWheel: 1 << 26,  // [Picker]     // ColorPicker: wheel for Hue, triangle for Sat/Value.
    InputRGB: 1 << 27,  // [Input]      // ColorEdit, ColorPicker: input and output data in RGB format.
    InputHSV: 1 << 28,  // [Input]      // ColorEdit, ColorPicker: input and output data in HSV format.
};

// Defaults Options. You can set application defaults using SetColorEditOptions().
// The intent is that you probably don't want to  override them in most of your
// calls. Let the user choose via the option menu and/or call SetColorEditOptions()
// once during startup.
let f = ColorEditFlags;
f.OptionsDefault = f.Uint8|f.DisplayRGB|f.InputRGB|f.PickerHueBar;
// [Internal] Masks
f.DisplayMask    = f.DisplayRGB|f.DisplayHSV|f.DisplayHex;
f.DataTypeMask   = f.Uint8|f.Float;
f.PickerMask     = f.PickerHueWheel|f.PickerHueBar;
f.InputMask      = f.InputRGB|f.InputHSV;

//-------------------------------------------------------------------------
// [SECTION] Widgets: ColorEdit, ColorPicker, ColorButton, etc.
//-------------------------------------------------------------------------
// - ColorEdit3()
// - ColorEdit4()
// - ColorButton()
// - SetColorEditOptions()
// - colorTooltip() [Internal]
// - colorEditOptionsPopup() [Internal]
// - colorPickerOptionsPopup() [Internal]
//-------------------------------------------------------------------------
export var ImguiColorEditMixin =
{
    // little colored preview square that can be left-clicked to open a picker,
    //  and right-clicked to open an option menu.)
    ColorEdit3(label, col, flags=ColorEditFlags.DisplayRGB)
    {
        return this.ColorEdit4(label, col, flags | ColorEditFlags.NoAlpha);
    },

    // Edit colors components (each component in 0.0f..1.0f range).
    // See enum ColorEditFlags_ for available options. e.g. Only access
    // 3 floats if ColorEditFlags.NoAlpha flag is set. With typical
    // options: Left-click on colored square to open color picker. Right-click
    // to open option menu. CTRL-Click over input fields to edit them and TAB
    // to go to next item.
    ColorEdit4(label, col, flags)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        const style = g.Style;
        const square_sz = this.GetFrameHeight();
        const w_extra = (flags & ColorEditFlags.NoSmallPreview) ? 0 :
                        (square_sz + style.ItemInnerSpacing.x);
        const w_items_all = this.CalcItemWidth() - w_extra;
        this.BeginGroup();
        this.PushID(label); // {

        label = label.split("##")[0];

        // If we're not showing any slider there's no point in doing any HSV conversions
        const flags_untouched = flags;
        if (flags & ColorEditFlags.NoInputs)
        {
            flags = (flags & (~ColorEditFlags.DisplayMask)) |
                    ColorEditFlags.DisplayRGB | ColorEditFlags.NoOptions;
        }

        // Context menu: display and modify options (before defaults are applied)
        if (!(flags & ColorEditFlags.NoOptions))
            this.colorEditOptionsPopup(col, flags);

        // Read stored options
        if (!(flags & ColorEditFlags.DisplayMask))
            flags |= (g.ColorEditOptions & ColorEditFlags.DisplayMask);
        if (!(flags & ColorEditFlags.DataTypeMask))
            flags |= (g.ColorEditOptions & ColorEditFlags.DataTypeMask);
        if (!(flags & ColorEditFlags.PickerMask))
            flags |= (g.ColorEditOptions & ColorEditFlags.PickerMask);
        if (!(flags & ColorEditFlags.InputMask))
            flags |= (g.ColorEditOptions & ColorEditFlags.InputMask);
        flags |= (g.ColorEditOptions & ~(ColorEditFlags.DisplayMask |
                                         ColorEditFlags.DataTypeMask |
                                         ColorEditFlags.PickerMask |
                                         ColorEditFlags.InputMask));

        const alpha = (flags & ColorEditFlags.NoAlpha) == 0;
        const hdr = (flags & ColorEditFlags.HDR) != 0;
        const components = alpha ? 4 : 3;

        // Convert to the formats we need
        let cedit;
        if (flags & (ColorEditFlags.DisplayRGB|ColorEditFlags.DisplayHex))
            cedit = col.AsRGB(1, true/*clone*/);
        else
        if (flags & ColorEditFlags.DisplayHSV)
            cedit = col.AsHSV();
        else
            console.assert(0, "Unimplemented color space for disply");

        if(!alpha)
            cedit = cedit.AsOpaque();

        let ca = cedit.AsArray();
        let ica = cedit.AsIArray();
        let value_changed = false;
        let value_changed_as_float = false;

        if ((flags & (ColorEditFlags.DisplayRGB | ColorEditFlags.DisplayHSV)) != 0
            && (flags & ColorEditFlags.NoInputs) == 0)
        {
            // RGB/HSV 0..255 Sliders
            const w_item_one  = Math.max(1, Math.floor((w_items_all - (style.ItemInnerSpacing.x)*(components-1))/components));
            const w_item_last = Math.max(1, Math.floor(w_items_all - (w_item_one + style.ItemInnerSpacing.x)*(components-1)));
            const tsize = this.CalcTextSize((flags & ColorEditFlags.Float) ? "M:0.000" : "M:000");
            const hide_prefix = (w_item_one <= tsize.x) ? true : false;
            const ids = [ "##X", "##Y", "##Z", "##W" ];
            const fmt_table_int =
            [
                [   "%3d",   "%3d",   "%3d",   "%3d" ], // Short display
                [ "R:%3d", "G:%3d", "B:%3d", "A:%3d" ], // Long display for RGBA
                [ "H:%3d", "S:%3d", "V:%3d", "A:%3d" ]  // Long display for HSVA
            ];
            const fmt_table_float =
            [
                [   "%0.3f",   "%0.3f",   "%0.3f",   "%0.3f" ], // Short display
                [ "R:%0.3f", "G:%0.3f", "B:%0.3f", "A:%0.3f" ], // Long display for RGBA
                [ "H:%0.3f", "S:%0.3f", "V:%0.3f", "A:%0.3f" ]  // Long display for HSVA
            ];
            const fmt_idx = hide_prefix ? 0 : (flags & ColorEditFlags.DisplayHSV) ? 2 : 1;
            this.PushItemWidth(w_item_one);
            for (let n = 0; n < components; n++)
            {
                if (n > 0)
                    this.SameLine(0, style.ItemInnerSpacing.x);
                if (n + 1 == components)
                    this.PushItemWidth(w_item_last);
                if (flags & ColorEditFlags.Float)
                {
                    value_changed |= this.DragFloat(ids[n], ca[n], 1/255,
                                            0, hdr ? 0 : 1, fmt_table_float[fmt_idx][n],
                                            function(newval) {
                                                ca[n] = newval;
                                            });
                    value_changed_as_float |= value_changed;
                }
                else
                {
                    value_changed |= this.DragInt(ids[n], ica[n], 1, 0,
                                        hdr ? 0 : 255, fmt_table_int[fmt_idx][n],
                                        function(newval) {
                                            ica[n] = newval;
                                        });
                }
                if (!(flags & ColorEditFlags.NoOptions))
                    this.OpenPopupOnItemClick("context");
            }
            this.PopItemWidth();
            this.PopItemWidth();
        }
        else
        if ((flags & ColorEditFlags.DisplayHex) != 0 &&
            (flags & ColorEditFlags.NoInputs) == 0)
        {
            // RGB Hexadecimal Input
            let buf = cedit.AsHashStr(!alpha);
            this.PushItemWidth(w_items_all);
            this.InputText("##Text", buf,
                            InputTextFlags.CharsHexadecimal |
                            InputTextFlags.CharsUppercase,
                            (newval) => {
                value_changed = true;
                ica[0] = ica[1] = ica[2] = ica[3] = 0;
                let k=0;
                for(let j=1;j<newval.length;j+=2) // skip leading #, pairs
                {
                    ica[k++] = parseInt(newval.slice(j, j+2), 16);
                }
            });
            if (!(flags & ColorEditFlags.NoOptions))
                this.OpenPopupOnItemClick("context");
            this.PopItemWidth();
        }

        let picker_active_window = null;
        if (!(flags & ColorEditFlags.NoSmallPreview))
        {
            if (!(flags & ColorEditFlags.NoInputs))
                this.SameLine(0, style.ItemInnerSpacing.x);

            const col_v4 = Color.FromArray(ca, alpha);
            if (this.ColorButton("##ColorButton", col_v4, flags))
            {
                if (!(flags & ColorEditFlags.NoPicker))
                {
                    // Store current color and open a picker
                    g.ColorPickerRef = col_v4;
                    this.OpenPopup("picker");
                    this.SetNextWindowPos(Vec2.AddXY(
                                    win.DC.LastItemRect.GetBL(),
                                    -1, style.ItemSpacing.y));
                }
            }
            if (!(flags & ColorEditFlags.NoOptions))
                this.OpenPopupOnItemClick("context");

            if (this.BeginPopup("picker"))
            {
                picker_active_window = g.CurrentWindow;
                if(label.length > 0)
                {
                    this.textEx(label);
                    this.Spacing();
                }
                let picker_flags_to_forward = ColorEditFlags.DataTypeMask |
                                              ColorEditFlags.PickerMask |
                                              ColorEditFlags.InputMask |
                                              ColorEditFlags.DIsplayRGB |
                                              ColorEditFlags.DIsplayHSV |
                                              ColorEditFlags.HDR |
                                              ColorEditFlags.NoAlpha |
                                              ColorEditFlags.AlphaBar;
                let picker_flags = (flags_untouched & picker_flags_to_forward) |
                                              ColorEditFlags.NoLabel |
                                              ColorEditFlags.AlphaPreviewHalf;
                this.PushItemWidth(square_sz * 12); // Use 256 + bar sizes?
                value_changed |= this.ColorPicker4("##picker", col, picker_flags,
                                                    g.ColorPickerRef);
                this.PopItemWidth();
                this.EndPopup();
            }
        }

        if (label.length > 0 && !(flags & ColorEditFlags.NoLabel))
        {
            this.SameLine(0, style.ItemInnerSpacing.x);
            this.textEx(label);
        }

        // Convert back
        if (value_changed && picker_active_window == null)
        {
            if (!value_changed_as_float)
            {
                for (let n = 0; n < 4; n++)
                    ca[n] = ica[n] / 255;
            }
            if ((flags & ColorEditFlags.DisplayHSV) &&
                (flags & ColorEditFlags.InputRGB))
            {
                let cc = Color.hsva(ca[0], ca[1], ca[2], ca[3]);
                let cr = cc.AsRGB();
                ca = cr.AsArray();
            }
            if ((flags & ColorEditFlags.DisplayRGB) &&
                (flags & ColorEditFlags.InputHSV))
            {
                let cc = Color.rgba(ca[0], ca[1], ca[2], ca[3]);
                let cr = cc.AsHSV();
                ca = cr.AsArray();
            }

            col.x = ca[0]; // <-----------------------
            col.y = ca[1];
            col.z = ca[2];
            if (alpha)
                col.a = ca[3];
            col.Dirty();
        }

        this.PopID(); // }
        this.EndGroup();

        // Drag and Drop Target
        // NB: The flag test is merely an optional micro-optimization,
        // BeginDragDropTarget() does the same test.
        if ((win.DC.LastItemStatusFlags & ItemStatusFlags.HoveredRect) &&
            !(flags & ColorEditFlags.NoDragDrop) &&
            this.BeginDragDropTarget())
        {
            let accepted_drag_drop = false;
            let payload = this.AcceptDragDropPayload(DragPayloads.COLOR_3F);
            if (payload)
            {
                col.Copy(payload.Data);
                value_changed = accepted_drag_drop = true;
            }
            payload = this.AcceptDragDropPayload(DragPayloads.COLOR_4F);
            if (payload )
            {
                col.Copy(payload.Data);
                value_changed = accepted_drag_drop = true;
            }

            // Drag-drop payloads are always RGB
            if (accepted_drag_drop && (flags & ColorEditFlags.InputHSV))
            {
                let c2 = col.AsHSV();
                col.Copy(c2);
            }
            this.EndDragDropTarget();
        }

        // When picker is being actively used, use its active id so IsItemActive()
        // will function on ColorEdit4().
        if (picker_active_window && g.ActiveId != 0 &&
            g.ActiveIdWindow == picker_active_window)
        {
            win.DC.LastItemId = g.ActiveId;
        }

        if (value_changed)
            this.markItemEdited(win.DC.LastItemId);

        return value_changed;
    },

    // display a colored square/button, hover for details, return true when pressed.
    // FIXME: May want to display/ignore the alpha component in the color display?
    // Yet show it in the tooltip. 'desc_id' is not called 'label' because we
    // don't display it next to the button, but only in the tooltip.
    // Note that 'col' may be encoded in HSV if ColorEditFlags.InputHSV is set.
    ColorButton(desc_id, col, flags=0, size=Vec2.Zero())
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(desc_id);
        let default_size = this.GetFrameHeight();
        if (size.x == 0)
            size.x = default_size;
        if (size.y == 0)
            size.y = default_size;
        const bb = new Rect(win.DC.CursorPos,
                            Vec2.Add(win.DC.CursorPos, size));
        this.itemSize(bb, (size.y >= default_size) ? g.Style.FramePadding.y : 0);
        if (!this.itemAdd(bb, id))
            return false;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bb, id, hovered, held);

        if (flags & ColorEditFlags.NoAlpha)
            flags &= ~(ColorEditFlags.AlphaPreview | ColorEditFlags.AlphaPreviewHalf);

        let col_rgb = col.AsRGB(1, true/*clone*/);
        let col_rgb_noalpha = col_rgb.AsOpaque();
        let grid_step = Math.min(size.x, size.y) / 2.99;
        let rounding = Math.min(g.Style.FrameRounding, grid_step * 0.5);
        let bb_inner = bb.Clone();
        let off = -0.75; // The border (using Col_FrameBg) tends to look off when
                         // color is near-opaque and rounding is enabled. This
                         // offset seemed like a good middle ground to reduce
                         // those artifacts.
        bb_inner.Expand(off);
        if ((flags & ColorEditFlags.AlphaPreviewHalf) && col_rgb.a < 1.0)
        {
            let mid_x = Math.floor((bb_inner.Min.x + bb_inner.Max.x) * 0.5 + 0.5);
            this.renderColorRectWithAlphaCheckerboard(
                new Vec2(bb_inner.Min.x + grid_step, bb_inner.Min.y),
                bb_inner.Max, col_rgb, grid_step,
                new Vec2(-grid_step + off, off), rounding,
                CornerFlags.TopRight | CornerFlags.BotRight);
            win.DrawList.AddRectFilled(bb_inner.Min, new Vec2(mid_x, bb_inner.Max.y),
                                        col_rgb_noalpha, rounding,
                                        CornerFlags.TopLeft|CornerFlags.BotLeft);
        }
        else
        {
            // Because GetColorU32() multiplies by the global style Alpha and we
            // don't want to display a checkerboard if the source code had no alpha
            let col_source = (flags & ColorEditFlags.AlphaPreview) ? col_rgb : col_rgb_noalpha;
            if (col_source.a < 1.)
                this.renderColorRectWithAlphaCheckerboard(bb_inner.Min, bb_inner.Max,
                        col_source, grid_step, new Vec2(off, off), rounding);
            else
                win.DrawList.AddRectFilled(bb_inner.Min, bb_inner.Max, col_source,
                       rounding, CornerFlags.All);
        }
        this.renderNavHighlight(bb, id);
        if (g.Style.FrameBorderSize > 0)
            this.renderFrameBorder(bb.Min, bb.Max, rounding);
        else
        {
            // Color button are often in need of some sort of border
            win.DrawList.AddRect(bb.Min, bb.Max, style.GetColor("FrameBg"), rounding);
        }

        // Drag and Drop Source
        // NB: The ActiveId test is merely an optional micro-optimization,
        // BeginDragDropSource() does the same test.
        if (g.ActiveId == id && !(flags & ColorEditFlags.NoDragDrop) &&
            this.BeginDragDropSource())
        {
            if (flags & ColorEditFlags.NoAlpha)
                this.SetDragDropPayload(DragPayloads.COLOR_3F, col_rgb_noalpha,
                                        CondFlags.Once);
            else
                this.SetDragDropPayload(DragPayloads.COLOR_4F, col_rgb,
                                        CondFlags.Once);
            this.ColorButton(desc_id, col, flags);
            this.SameLine();
            this.textEx("Color");
            this.EndDragDropSource();
        }

        // Tooltip
        if (!(flags & ColorEditFlags.NoTooltip) && hovered.get())
        {
            this.colorTooltip(desc_id, col,
                    flags & (ColorEditFlags.InputMask |
                             ColorEditFlags.NoAlpha |
                             ColorEditFlags.AlphaPreview |
                             ColorEditFlags.AlphaPreviewHalf));
        }

        if (pressed)
            this.markItemEdited(id);

        return pressed;
    },

    // Note: only access 3 floats if ImGuiColorEditFlags_NoAlpha flag is set.
    colorTooltip(text, col, flags)
    {
        let g = this.guictx;
        this.beginTooltipEx(0, true);
        let label = text.split("##")[0];
        if (label.length)
        {
            this.textEx(label);
            this.Separator();
        }

        let sz = new Vec2(g.FontSize * 3 + g.Style.FramePadding.y * 2,
                        g.FontLineHeight * 3 + g.Style.FramePadding.y * 2);
        this.ColorButton("##preview", col, (flags & (ColorEditFlags.InputMask |
                                                    ColorEditFlags.NoAlpha |
                                                    ColorEditFlags.AlphaPreview |
                                                    ColorEditFlags.AlphaPreviewHalf)) |
                                                    ColorEditFlags.NoTooltip,
                        sz);
        this.SameLine();
        this.Text(col.AsMultiStr(flags & ColorEditFlags.NoAlpha));
        this.EndTooltip();
    },

};