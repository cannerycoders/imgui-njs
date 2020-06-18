import {IsPowerOfTwo} from "../hashutil.js";
import {ColorEditFlags} from "./coloredit.js";
import {Vec1, Vec2, Rect} from "../types.js";
import {HueRampStr, Colors, Color} from "../color.js";
import {ItemFlags} from "../flags.js";
import {Dir} from "../enums.js";

// - ColorPicker3()
// - ColorPicker4()
export var ImguiColorPickerMixin =
{
    // here
    ColorPicker3(label, col, flags, onChange)
    {
        let col4 = col.Clone();
        col4.a = 1;
        if (!this.ColorPicker4(label, col4, flags | ColorEditFlags.NoAlpha, onChange))
            return false;
        col.x = col4.x; col.y = col4; col.z = col4.z;
        return true;
    },

    // nb: since we're working on canvas where we don't have vertex colors
    //   we adopt a simpler approach using combinations of linear gradients.
    //   This means our color picker offers a subset of the capabilities
    //   of the dear-imgui solution. Currnetly we don't support the
    //   Hue Wheel + SV variant, only the Hue Bar.

    ColorPicker4(label, col, flags, ref_col=null, onChange=null)
    {
        let g = this.guictx;
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let draw_list = win.DrawList;
        let style = g.Style;
        let io = g.IO;

        this.PushID(label);
        this.BeginGroup();

        if (!(flags & ColorEditFlags.NoSidePreview))
            flags |= ColorEditFlags.NoSmallPreview;

        // Context menu: display and store options.
        if (!(flags & ColorEditFlags.NoOptions)|| true)
            this.colorPickerOptionsPopup(col, flags);

        // Read stored options
        if (!(flags & ColorEditFlags.PickerMask))
            flags |= ((g.ColorEditOptions & ColorEditFlags.PickerMask) ?
                        g.ColorEditOptions : ColorEditFlags.OptionsDefault) &
                        ColorEditFlags.PickerMask;
        if (!(flags & ColorEditFlags.InputMask))
        {
            flags |= ((g.ColorEditOptions & ColorEditFlags.InputMask) ?
                        g.ColorEditOptions : ColorEditFlags.OptionsDefault) &
                        ColorEditFlags.InputMask;
        }
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.PickerMask));
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.InputMask));
        if (!(flags & ColorEditFlags.NoOptions))
            flags |= (g.ColorEditOptions & ColorEditFlags.AlphaBar);

        // Setup
        let components = (flags & ColorEditFlags.NoAlpha) ? 3 : 4;
        let alpha_bar = (flags & ColorEditFlags.AlphaBar) &&
                         !(flags & ColorEditFlags.NoAlpha);
        let picker_pos = win.DC.CursorPos.Clone();
        let square_sz = this.GetFrameHeight();
        let bars_width = square_sz; // Arbitrary smallish width of Hue/Alpha picking bars
                                    // Saturation/Value picking box
        let sv_picker_size = Math.max(bars_width * 1, this.CalcItemWidth() -
                        (alpha_bar?2:1)*(bars_width+style.ItemInnerSpacing.x));
        let bar0_pos_x = picker_pos.x + sv_picker_size + style.ItemInnerSpacing.x;
        let bar1_pos_x = bar0_pos_x + bars_width + style.ItemInnerSpacing.x;
        let bars_triangles_half_sz = Math.floor(bars_width * 0.2);
        let backup_initial_col = col.Clone();
        let hsv, rgb;
        if (flags & ColorEditFlags.InputRGB)
        {
            rgb = col;
            hsv = col.AsHSV();
        }
        else
        if (flags & ColorEditFlags.InputHSV)
        {
            hsv = col;
            rgb = col.AsRGB();
        }

        let value_changed = false;
        let value_changed_h = false;
        let value_changed_sv = false;

        this.PushItemFlag(ItemFlags.NoNav, true);
        if (flags & ColorEditFlags.PickerHueWheel)
        {
            console.assert("picker hue wheel not supported");
        }
        else
        if (flags & ColorEditFlags.PickerHueBar)
        {
            // SV rectangle logic
            this.InvisibleButton("sv", new Vec2(sv_picker_size, sv_picker_size));
            if (this.IsItemActive())
            {
                hsv.y = Vec1.Saturate((io.MousePos.x - picker_pos.x) / (sv_picker_size-1));
                hsv.z = 1. - Vec1.Saturate((io.MousePos.y - picker_pos.y) / (sv_picker_size-1));
                value_changed = value_changed_sv = true;
            }
            if (false && !(flags & ColorEditFlags.NoOptions))
                this.OpenPopupOnItemClick("context");

            // Hue bar logic
            this.SetCursorScreenPos(new Vec2(bar0_pos_x, picker_pos.y));
            this.InvisibleButton("hue", new Vec2(bars_width, sv_picker_size));
            if (this.IsItemActive())
            {
                hsv.x = Vec1.Saturate((io.MousePos.y - picker_pos.y) / (sv_picker_size-1));
                value_changed = value_changed_h = true;
            }
        }

        // Alpha bar logic
        if (alpha_bar)
        {
            this.SetCursorScreenPos(new Vec2(bar1_pos_x, picker_pos.y));
            this.InvisibleButton("alpha", new Vec2(bars_width, sv_picker_size));
            if (this.IsItemActive())
            {
                col.a = 1. - Vec1.Saturate((io.MousePos.y - picker_pos.y) / (sv_picker_size-1));
                value_changed = true;
            }
        }
        this.PopItemFlag(); // ItemFlags.NoNav

        if (!(flags & ColorEditFlags.NoSidePreview))
        {
            this.SameLine(0, style.ItemInnerSpacing.x);
            this.BeginGroup();
        }

        if (!(flags & ColorEditFlags.NoLabel))
        {
            let title = label.split("##")[0];
            if (title.length)
            {
                if ((flags & ColorEditFlags.NoSidePreview))
                    this.SameLine(0, style.ItemInnerSpacing.x);
                this.textEx(title);
            }
        }
        if (!(flags & ColorEditFlags.NoSidePreview))
        {
            // hm: this appears to be "behind" one edit since that happens
            // below
            this.PushItemFlag(ItemFlags.NoNavDefaultFocus, true);
            let col_v4 = col.Clone();
            if(flags & ColorEditFlags.NoAlpha)
                col_v4.a = 1.;
            if ((flags & ColorEditFlags.NoLabel))
                this.Text("Current");

            let sub_flags_to_forward = ColorEditFlags.InputMask |
                                      ColorEditFlags.HDR |
                                      ColorEditFlags.AlphaPreview |
                                      ColorEditFlags.AlphaPreviewHalf |
                                      ColorEditFlags.NoTooltip;
            this.ColorButton("##current", col_v4, (flags & sub_flags_to_forward),
                            new Vec2(square_sz * 3, square_sz * 2));
            if (ref_col != null)
            {
                this.Text("Original");
                let ref_col_v4 = ref_col.Clone();
                if(flags & ColorEditFlags.NoAlpha)
                    ref_col_v4.a = 1.;
                if (this.ColorButton("##original", ref_col_v4, (flags & sub_flags_to_forward),
                                     new Vec2(square_sz * 3, square_sz * 2)))
                {
                    col.Copy(ref_col);
                    value_changed = true;
                }
            }
            this.PopItemFlag();
            this.EndGroup();
        }

        // Convert back color to RGB
        if (value_changed_h || value_changed_sv)
        {
            if (flags & ColorEditFlags.InputRGB)
            {
                col.Copy(hsv.AsRGB());
            }
            else
            if (flags & ColorEditFlags.InputHSV)
            {
                col.Copy(hsv);
            }
        }

        // R,G,B and H,S,V slider color editor
        let value_changed_fix_hue_wrap = false;
        if ((flags & ColorEditFlags.NoInputs) == 0)
        {
            this.PushItemWidth((alpha_bar ? bar1_pos_x : bar0_pos_x) + bars_width - picker_pos.x);
            let sub_flags_to_forward = ColorEditFlags.DataTypeMask |
                                       ColorEditFlags.InputMask |
                                       ColorEditFlags.HDR |
                                       ColorEditFlags.NoAlpha |
                                       ColorEditFlags.NoOptions |
                                       ColorEditFlags.NoSmallPreview |
                                       ColorEditFlags.AlphaPreview |
                                       ColorEditFlags.AlphaPreviewHalf;
            let sub_flags = (flags & sub_flags_to_forward) | ColorEditFlags.NoPicker;
            if (flags & ColorEditFlags.DisplayRGB || (flags & ColorEditFlags.DisplayMask) == 0)
            {
                if (this.ColorEdit4("##rgb", col, sub_flags | ColorEditFlags.DisplayRGB))
                {
                    // FIXME: Hackily differentiating using the DragInt
                    //  (ActiveId != 0 && !ActiveIdAllowOverlap) vs. using the
                    //  InputText or DropTarget.
                    // For the later we don't want to run the hue-wrap canceling
                    // code. If you are well versed in HSV picker please provide
                    // your input! (See #2050)
                    value_changed_fix_hue_wrap = (g.ActiveId != 0 && !g.ActiveIdAllowOverlap);
                    value_changed = true;
                }
            }
            if (flags & ColorEditFlags.DisplayHSV || (flags & ColorEditFlags.DisplayMask) == 0)
            {
                value_changed |= this.ColorEdit4("##hsv", col, sub_flags | ColorEditFlags.DisplayHSV);
            }
            if (flags & ColorEditFlags.DisplayHex || (flags & ColorEditFlags.DisplayMask) == 0)
            {
                value_changed |= this.ColorEdit4("##hex", col, sub_flags | ColorEditFlags.DisplayHex);
            }
            this.PopItemWidth();
        }
        // Try to cancel hue wrap (after ColorEdit4 call), if any
        if (value_changed_fix_hue_wrap && (flags & ColorEditFlags.InputRGB))
        {
            let newhsv = col.AsHSV();
            if (newhsv.x <= 0 && hsv.x > 0)
            {
                console.assert(0, "unverified");
                if (newhsv.z <= 0 && hsv.z != newhsv.z)
                {
                    newhsv.x = hsv.x;
                    newhsv.y = hsv.y;
                    newhsv.z = hsv.z * .5; // Value wrap
                    col = newhsv.AsRGB();
                }
                else
                if (newhsv.y <= 0) // Sat
                {
                    newhsv.x = hsv.x;
                    newhsv.y = hsv.y * .5;
                    col = newhsv.AsRGB();
                }
            }
        }

        if (value_changed)
        {
            if (flags & ColorEditFlags.InputRGB)
            {
                hsv = col.AsHSV();
            }
            else
            if (flags & ColorEditFlags.InputHSV)
            {
                rgb = col.AsRGB();
            }
        }

        // draw---------------------------------------------------------
        let hue_color = new Color(hsv.x, 1, 1, 1, "hsv").AsRGB();
        let colOpaque = rgb.AsOpaque();
        let colClear = Colors.clear;
        let sv_cursor_pos = new Vec2();
        if (flags & ColorEditFlags.PickerHueWheel)
        {
            // Render Hue Wheel
            console.assert(0, "hue wheel not implemented");
        }
        else
        if (flags & ColorEditFlags.PickerHueBar)
        {
            // Render SV Square
            let svRect = new Rect(picker_pos, Vec2.AddXY(picker_pos, sv_picker_size, sv_picker_size));
            // uleft, uright, bright, bleft
            // first we have a hue ramp left-to right
            draw_list.AddRectFilledMultiColor(svRect.Min, svRect.Max,
                                            Colors.white, hue_color,
                                            hue_color, Colors.white);
            // next we have a brightness ramp top to bottom
            draw_list.AddRectFilledMultiColor(svRect.Min, svRect.Max,
                                            Colors.clear, Colors.clear,
                                            Colors.black, Colors.black);
            this.renderFrameBorder(svRect.Min, svRect.Max, 0);

            // Sneakily prevent the circle to stick out too much
            sv_cursor_pos.x = Vec1.Clamp(Math.floor(picker_pos.x + Vec1.Saturate(hsv.y) * sv_picker_size + 0.5),
                                        picker_pos.x + 2, picker_pos.x + sv_picker_size - 2);
            sv_cursor_pos.y = Vec1.Clamp(Math.floor(picker_pos.y + Vec1.Saturate(1 - hsv.z) * sv_picker_size + 0.5),
                                         picker_pos.y + 2, picker_pos.y + sv_picker_size - 2);

            // Render Hue Bar
            let hueBarR = new Rect(new Vec2(bar0_pos_x, picker_pos.y),
                                  new Vec2(bar0_pos_x+bars_width, picker_pos.y+sv_picker_size));
            draw_list.AddRectRamp(hueBarR.Min, hueBarR.Max,
                                  HueRampStr, true/*top-to-bottom*/);
            let bar0_line_y = Math.floor(picker_pos.y + hsv.x * sv_picker_size + 0.5);
            this.renderFrameBorder(hueBarR.Min, hueBarR.Max,
                                   0/*no rounding*/);
            this.renderArrowsForVerticalBar(draw_list,
                                    new Vec2(bar0_pos_x - 1, bar0_line_y),
                                    new Vec2(bars_triangles_half_sz + 1, bars_triangles_half_sz),
                                    bars_width + 2.0);
        }

        // Render cursor/preview circle (clamp S/V within 0..1 range because
        // floating points colors may lead HSV values to be out of range)
        let sv_cursor_rad = value_changed_sv ? 4 : 2;
        draw_list.AddCircleFilled(sv_cursor_pos, sv_cursor_rad, colOpaque);
        draw_list.AddCircle(sv_cursor_pos, sv_cursor_rad+1, Colors.gray);
        draw_list.AddCircle(sv_cursor_pos, sv_cursor_rad, Colors.white);

        // Render alpha bar
        if (alpha_bar)
        {
            let alpha = Vec1.Saturate(col.a);
            let bar1_bb = Rect.FromXY(bar1_pos_x, picker_pos.y,
                                     bar1_pos_x + bars_width,
                                     picker_pos.y + sv_picker_size);
            this.renderColorRectWithAlphaCheckerboard(bar1_bb.Min, bar1_bb.Max,
                    Colors.clear, bar1_bb.GetWidth() / 2, Vec2.Zero());
            draw_list.AddRectFilledMultiColor(bar1_bb.Min, bar1_bb.Max,
                    colOpaque, colOpaque,
                    colClear, colClear);
            let bar1_line_y = Math.floor(picker_pos.y + (1-alpha) * sv_picker_size + 0.5);
            this.renderFrameBorder(bar1_bb.Min, bar1_bb.Max, 0);
            this.renderArrowsForVerticalBar(draw_list,
                    new Vec2(bar1_pos_x - 1, bar1_line_y),
                    new Vec2(bars_triangles_half_sz + 1, bars_triangles_half_sz),
                    bars_width + 2.);
        }

        this.EndGroup();

        if (value_changed && backup_initial_col.Equals(col))
            value_changed = false;
        if (value_changed)
            this.markItemEdited(win.DC.LastItemId);

        this.PopID();
        return value_changed;
    },

    // initialize current options (generally on application startup) if you
    // want to select a default format, picker type, etc. User will be able to
    // change many settings, unless you pass the _NoOptions flag to your calls.
    SetColorEditOptions(flags)
    {
        let g = this.guictx;
        if ((flags & ColorEditFlags.DisplayMask) == 0)
            flags |= ColorEditFlags.OptionsDefault & ColorEditFlags.DisplayMask;
        if ((flags & ColorEditFlags.DataTypeMask) == 0)
            flags |= ColorEditFlags.OptionsDefault & ColorEditFlags.DataTypeMask;
        if ((flags & ColorEditFlags.PickerMask) == 0)
            flags |= ColorEditFlags.OptionsDefault & ColorEditFlags.PickerMask;
        if ((flags & ColorEditFlags.InputMask) == 0)
            flags |= ColorEditFlags.OptionsDefault & ColorEditFlags.InputMask;
        // Check only 1 option is selected
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.DisplayMask));
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.DataTypeMask));
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.PickerMask));
        console.assert(IsPowerOfTwo(flags & ColorEditFlags.InputMask));
        g.ColorEditOptions = flags;
    },

    /*-----------------------------------------------------------------*/
    colorEditOptionsPopup(col, flags)
    {
        let allow_opt_inputs = !(flags & ColorEditFlags.DisplayMask);
        let allow_opt_datatype = !(flags &ColorEditFlags.DataTypeMask);
        if ((!allow_opt_inputs && !allow_opt_datatype) ||
            !this.BeginPopup("context"))
        {
            return;
        }
        let g = this.guictx;
        let opts = g.ColorEditOptions;
        if (allow_opt_inputs)
        {
            if (this.RadioButton("RGB", (opts & ColorEditFlags.DisplayRGB) != 0))
                opts = (opts & ~ColorEditFlags.DisplayMask) | ColorEditFlags.DisplayRGB;
            if (this.RadioButton("HSV", (opts & ColorEditFlags.DisplayHSV) != 0))
                opts = (opts & ~ColorEditFlags.DisplayMask) | ColorEditFlags.DisplayHSV;
            if (this.RadioButton("Hex", (opts & ColorEditFlags.DisplayHex) != 0))
                opts = (opts & ~ColorEditFlags.DisplayMask) | ColorEditFlags.DisplayHex;
        }
        if (allow_opt_datatype)
        {
            if (allow_opt_inputs)
                this.Separator();
            if (this.RadioButton("0..255",     (opts & ColorEditFlags.Uint8) != 0))
                opts = (opts & ~ColorEditFlags.DataTypeMask)|ColorEditFlags.Uint8;
            if (this.RadioButton("0.00..1.00", (opts & ColorEditFlags.Float) != 0))
                opts = (opts & ~ColorEditFlags.DataTypeMask) | ColorEditFlags.Float;
        }

        if (allow_opt_inputs || allow_opt_datatype)
            this.Separator();
        if (this.Button("Copy as..", new Vec2(-1,0)))
            this.OpenPopup("Copy");
        if (this.BeginPopup("Copy"))
        {
            let cc = col.Array();
            let buf = cc.AsFloatStr();
            if (this.Selectable(buf))
                this.SetClipboardText(buf);
            buf = cc.AsIntStr();
            if (this.Selectable(buf))
                this.SetClipboardText(buf);
            buf = cc.asHexStr(flags & ColorEditFlags.NoAlpha);
            if (this.Selectable(buf))
                this.SetClipboardText(buf);
            this.EndPopup();
        }

        g.ColorEditOptions = opts;
        this.EndPopup();
    },

    // Helper for ColorPicker4()
    renderArrowsForVerticalBar(draw_list, pos, half_sz, bar_w)
    {

        this.renderArrowPointingAt(draw_list,
                            new Vec2(pos.x + half_sz.x + 1, pos.y),
                            new Vec2(half_sz.x + 2, half_sz.y + 1),
                            Dir.Right,
                            Colors.black);
        this.renderArrowPointingAt(draw_list,
                            new Vec2(pos.x + half_sz.x, pos.y),
                            half_sz,
                            Dir.Right,
                            Colors.white);
        this.renderArrowPointingAt(draw_list,
                            new Vec2(pos.x + bar_w - half_sz.x - 1, pos.y),
                            new Vec2(half_sz.x + 2, half_sz.y + 1),
                            Dir.Left,
                            Colors.black);
        this.renderArrowPointingAt(draw_list,
                            new Vec2(pos.x + bar_w - half_sz.x, pos.y),
                            half_sz,
                            Dir.Left,
                            Colors.white);
    },

    colorPickerOptionsPopup()
    {
        // unimplemented
    }
};