import {Rect, Vec1, Vec2} from "../types.js";
import {Axis, Dir, InputReadMode, InputSource, NavInput} from "../enums.js";
import {NavDirSourceFlags} from "../flags.js";
import {FormatValues, ParseFormatPrecision, RoundScalarToPrecision} from "../datatype.js";

//-------------------------------------------------------------------------
// [SECTION] Widgets: SliderScalar, SliderFloat, SliderInt, etc.
//-------------------------------------------------------------------------
// - SliderBehaviorT<>() [Internal]
// - SliderBehavior() [Internal]
// - SliderScalar()
// - SliderScalarN()
// - SliderFloat()
// - SliderFloat2()
// - SliderFloat3()
// - SliderFloat4()
// - SliderAngle()
// - SliderInt()
// - SliderInt2()
// - SliderInt3()
// - SliderInt4()
// - VSliderScalar()
// - VSliderFloat()
// - VSliderInt()

export var SliderFlags =
{
    None: 0,
    Vertical: 1
};

const FFmt = "%0.2f";
const IFmt = "%d";

export var ImguiSliderMixin =
{
    /**
    // - CTRL+Click on any slider to turn them into an input box. Manually
    //   input values aren't clamped and can go off-bounds.
    // - Adjust format string to decorate the value with a prefix, a suffix,
    //  or adapt the editing and display precision e.g.
    //      "%.3f" -> 1.234; "%5.2f secs" -> 01.23 secs;
    //      "Biscuit: %.0f" -> Biscuit: 1; etc.
    */
    SliderFloat(label, v, v_min, v_max, format=null, power=1, onChange=null)
    {
        if(format == null) format = FFmt;
        return this.SliderScalar(label, v, v_min, v_max, format, power, onChange);
    },

    // adjust format to decorate the value with a prefix or a suffix for
    // in-slider labels or unit display. Use power!=1.0 for power curve sliders
    SliderFloat2(label, v, v_min, v_max, format=null, power=1, onChange=null)
    {
        if(format == null) format = FFmt;
        return this.SliderScalarN(label, 2, v, v_min, v_max, format, power, onChange);
    },

    SliderFloat3(label, v, v_min, v_max, format=null, power=1, onChange=null)
    {
        if(format == null) format = FFmt;
        return this.SliderScalarN(label, 3, v, v_min, v_max, format, power, onChange);
    },

    SliderFloat4(label, v, v_min, v_max, format=null, power=1, onChange=null)
    {
        if(format == null) format = FFmt;
        return this.SliderScalarN(label, 4, v, v_min, v_max, format, power, onChange);
    },

    SliderAngle(label, v_rad, v_degrees_min, v_degrees_max, format=null, onChange)
    {
        if(format == null) format = IFmt;
        let v_deg = v_rad * 360 / (2 * Math.PI);
        let value_changed =
            this.SliderFloat(label, v_deg, v_degrees_min, v_degrees_max, format, 1,
                function(deg) {
                    v_rad = deg * 2 * Math.PI / 360;
                    if(onChange) onChange(v_rad);
                });
        return value_changed;
    },

    SliderInt(label, v, v_min, v_max, format=null, onChange=null)
    {
        if(format == null) format = IFmt;
        return this.SliderScalar(label, v, v_min, v_max, format, 1, onChange);
    },

    SliderInt2(label, v, v_min, v_max, format=null, onChange=null)
    {
        if(format == null) format = IFmt;
        return this.SliderScalarN(label, 2, v, v_min, v_max, format, 1, onChange);
    },

    SliderInt3(label, v, v_min, v_max, format=null, onChange=null)
    {
        if(format == null) format = IFmt;
        return this.SliderScalarN(label, 3, v, v_min, v_max, format, 1, onChange);
    },

    SliderInt4(label, v, v_min, v_max, format=null, onChange=null)
    {
        if(format == null) format = IFmt;
        return this.SliderScalarN(label, 4, v, v_min, v_max, format, 1, onChange);
    },

    SliderScalar(label, v, v_min, v_max, format, power=1, onChange=null)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);
        const w = this.CalcItemWidth();
        const label_size = this.CalcTextSize(label, true);
        const frame_bb = new Rect(win.DC.CursorPos,
                            Vec2.AddXY(win.DC.CursorPos,
                                    w, label_size.y + style.FramePadding.y*2));
        const total_bb = new Rect(frame_bb.Min,
                            Vec2.AddXY(frame_bb.Max,
                                label_size.x > 0 ? style.ItemInnerSpacing.x+label_size.x: 0,
                                0.0));

        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, id, frame_bb))
            return false;

        // Tabbing or CTRL-clicking on Slider turns it into an input box
        let start_text_input = false;
        const focus_requested = this.focusableItemRegister(win, id);
        const hovered = this.itemHoverable(frame_bb, id);
        if (focus_requested || (hovered && g.IO.MouseClicked[0]) ||
            g.NavActivateId == id ||
            (g.NavInputId == id && g.ScalarAsInputTextId != id))
        {
            this.setActiveID(id, win);
            this.setFocusID(id, win);
            this.FocusWindow(win);
            g.ActiveIdAllowNavDirFlags = (1 << Dir.Up) | (1 << Dir.Down);
            if (focus_requested || g.IO.KeyCtrl || g.NavInputId == id)
            {
                start_text_input = true;
                g.ScalarAsInputTextId = 0;
            }
        }
        if (start_text_input || (g.ActiveId == id && g.ScalarAsInputTextId == id))
        {
            win.DC.CursorPos = frame_bb.Min;
            this.focusableItemUnregister(win);
            return this.inputScalarAsWidgetReplacement(frame_bb, id, label,
                                                        v, format, onChange);
        }

        // Draw frame
        const  frame_col = style.GetColor(g.ActiveId == id ? "FrameBgActive" :
                                        g.HoveredId == id ? "FrameBgHovered" :
                                        "FrameBg");
        this.renderNavHighlight(frame_bb, id);
        this.renderFrame(frame_bb.Min, frame_bb.Max, frame_col, true,
                            g.Style.FrameRounding);

        // Slider behavior
        let grab_bb = new Rect();
        let valstr = FormatValues(format, [v]);
        let value_changed = this.sliderBehavior(frame_bb, id, v,
                                            v_min, v_max, format, power,
                                            SliderFlags.None, grab_bb,
                                            function(newVal) {
                                                valstr = FormatValues(format, [newVal]);
                                                if(onChange)
                                                    onChange(newVal);
                                            });
        if (value_changed)
            this.markItemEdited(id);

        // Render grab
        win.DrawList.AddRectFilled(grab_bb.Min, grab_bb.Max,
                    style.GetColor(g.ActiveId == id ?
                                "SliderGrabActive" : "SliderGrab"),
                    style.GrabRounding);

        // Display value using user-provided display format so user can add
        // prefix/suffix/decorations to the value.
        this.renderTextClipped(frame_bb.Min, frame_bb.Max, valstr, null, new Vec2(0.5,0.5));
        if (label_size.x > 0)
        {
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                     frame_bb.Min.y + style.FramePadding.y),
                                     label);
        }
        return value_changed;
    },

    SliderScalarN(label, components, v, v_min, v_max, format, power=1, onChange=null)
    {
        let saveV = null;
        if(!Array.isArray(v))
        {
            if(v.x != undefined)
            {
                saveV = v;
                v = [saveV.x];
            }
            if(saveV.y != undefined)
                v.push(saveV.y);
            if(saveV.z != undefined)
                v.push(saveV.z);
            if(saveV.a != undefined)
                v.push(saveV.a);
        }
        console.assert(v.length >= components);

        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        let value_changed = false;
        this.BeginGroup();
        this.PushID(label);
        this.pushMultiItemsWidths(components);
        for (let i = 0; i < components; i++)
        {
            this.PushID(i);
            value_changed |= this.SliderScalar("", v[i], v_min, v_max, format, power,
                                            (newVal) => v[i] = newVal);
            this.SameLine(0, g.Style.ItemInnerSpacing.x);
            this.PopID();
            this.PopItemWidth();
        }
        this.PopID();
        this.textEx(label);
        this.EndGroup();
        if(value_changed)
        {
            if(saveV != null)
            {
                saveV.x = v[0];
                if(saveV.y != undefined)
                    saveV.y = v[1];
                if(saveV.z != undefined)
                    saveV.z = v[2];
                if(saveV.a != undefined)
                    saveV.a = v[3];
            }
            if(onChange)
                onChange(v);
        }
        return value_changed;
    },

    // Vertical slider
    VSliderFloat(label, size, v, v_min, v_max, format=null, power=1, onChange=null)
    {
        if(format==null) format = FFmt;
        this.VSliderScalar(label, size, v, v_min, v_max, format, power, onChange);
    },

    VSliderInt(label, size, v, v_min, v_max, format=null, onChange=null)
    {
        if(format == null) format = IFmt;
        this.VSliderScalar(label, size, v, v_min,v_max, format, 1, onChange);
    },

    VSliderScalar(label, size, v, v_min, v_max, format, power, onChange)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);
        const label_size = this.CalcTextSize(label, true);
        const frame_bb = new Rect(win.DC.CursorPos,
                                Vec2.Add(win.DC.CursorPos, size));
        const bb = new Rect(frame_bb.Min,
                        Vec2.AddXY(frame_bb.Max,
                            (label_size.x > 0 ? style.ItemInnerSpacing.x+label_size.x : 0),
                            0));

        this.itemSize(bb, style.FramePadding.y);
        if (!this.itemAdd(frame_bb, id))
            return false;

        const hovered = this.itemHoverable(frame_bb, id);
        if ((hovered && g.IO.MouseClicked[0]) || g.NavActivateId == id ||
            g.NavInputId == id)
        {
            this.setActiveID(id, win);
            this.setFocusID(id, win);
            this.FocusWindow(win);
            g.ActiveIdAllowNavDirFlags = (1 << Dir.Left) | (1 << Dir.Right);
        }

        // Draw frame
        const frame_col = style.GetColor(g.ActiveId == id ? "FrameBgActive" :
                            g.HoveredId == id ? "FrameBgHovered" : "FrameBg");
        this.renderNavHighlight(frame_bb, id);
        this.renderFrame(frame_bb.Min, frame_bb.Max, frame_col, true,
                            g.Style.FrameRounding);

        // Slider behavior
        let grab_bb = new Rect();
        let valstr = FormatValues(format, [v]);
        const value_changed = this.sliderBehavior(frame_bb, id, v, v_min, v_max,
                                    format, power, SliderFlags.Vertical,
                                    grab_bb, function(newval) {
                                        valstr = FormatValues(format, [newval]);
                                        if(onChange) onChange(newval);
                                    });
        if (value_changed)
            this.markItemEdited(id);

        // Render grab
        if (grab_bb.Max.y > grab_bb.Min.y)
        {
            win.DrawList.AddRectFilled(grab_bb.Min, grab_bb.Max,
                    style.GetColor(g.ActiveId == id ? "SliderGrabActive" : "SliderGrab"),
                    style.GrabRounding);
            }

        // Display value using user-provided display format so user can add
        // prefix/suffix/decorations to the value. For the vertical slider we
        // allow centered text to overlap the frame padding
        this.renderTextClipped(new Vec2(frame_bb.Min.x, frame_bb.Min.y + style.FramePadding.y),
                                frame_bb.Max, valstr, null, new Vec2(0.5,0.));

        if (label_size.x > 0)
        {
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                     frame_bb.Min.y + style.FramePadding.y),
                            label);
        }
        return value_changed;
    },

    /*---------------------------------------------------------------*/
    // returns true/false
    sliderBehavior(bb, id, v, v_min, v_max, format, power, flags,
                  out_grab_bb, onChange=null)
    {
        let g = this.guictx;
        const style = g.Style;
        let data_type = typeof(v);
        console.assert(data_type == "number");
        let precision = ParseFormatPrecision(format);

        const axis = (flags & SliderFlags.Vertical) ? "y" : "x"; // Axis.Y : Axis.X;
        const is_decimal = precision != 0;
        const is_power = (power != 1) && is_decimal;

        const grab_padding = 2;
        const slider_sz = (bb.Max[axis] - bb.Min[axis]) - grab_padding * 2;
        let grab_sz = style.GrabMinSize;
        let v_range = (v_min < v_max ? v_max - v_min : v_min - v_max);
        if (!is_decimal && v_range >= 0) // v_range < 0 may happen on integer overflows
        {
            // For integer sliders: if possible have the grab size represent 1 unit
            grab_sz = Math.max((slider_sz / (v_range + 1)), style.GrabMinSize);
        }
        grab_sz = Math.min(grab_sz, slider_sz);
        const slider_usable_sz = slider_sz - grab_sz;
        const slider_usable_pos_min = bb.Min[axis] + grab_padding + grab_sz*0.5;
        const slider_usable_pos_max = bb.Max[axis] - grab_padding - grab_sz*0.5;

        // For power curve sliders that cross over sign boundary we want the
        // curve to be symmetric around 0
        let linear_zero_pos;   // 0->1.
        if (is_power && v_min * v_max < 0)
        {
            // Different sign
            const minToZero = Math.pow(v_min >= 0 ? v_min : -v_min, 1.0/power);
            const maxToZero = Math.pow(v_max >= 0 ? v_max : -v_max, 1.0/power);
            linear_zero_pos = (minToZero / (minToZero + maxToZero));
        }
        else
        {
            // Same sign
            linear_zero_pos = v_min < 0 ? 1 : 0;
        }
        // Process interacting with the slider
        let value_changed = false;
        if (g.ActiveId == id)
        {
            let set_new_value = false;
            let clicked_t = 0.0;
            if (g.ActiveIdSource == InputSource.Mouse)
            {
                if (!g.IO.MouseDown[0])
                {
                    this.clearActiveID();
                }
                else
                {
                    const mouse_abs_pos = g.IO.MousePos[axis];
                    clicked_t = (slider_usable_sz > 0) ?
                            Vec1.Clamp((mouse_abs_pos-slider_usable_pos_min) /
                            slider_usable_sz, 0, 1)
                            : 0.0;
                    if (axis == "y")
                        clicked_t = 1 - clicked_t;
                    set_new_value = true;
                }
            }
            else
            if (g.ActiveIdSource == InputSource.Nav)
            {
                const delta2 = this.getNavInputAmount2d(NavDirSourceFlags.Keyboard |
                                                        NavDirSourceFlags.PadDPad,
                                                        InputReadMode.RepeatFast,
                                                        0, 0);
                let delta = (axis == Axis.X) ? delta2.x : -delta2.y;
                if (g.NavActivatePressedId == id && !g.ActiveIdIsJustActivated)
                {
                    this.clearActiveID();
                }
                else
                if (delta != 0)
                {
                    clicked_t = this.sliderCalcRatioFromValue(v, v_min, v_max, power, linear_zero_pos);
                    const decimal_precision = ParseFormatPrecision(format);
                    if ((decimal_precision > 0) || is_power)
                    {
                        delta /= 100;    // Gamepad/keyboard tweak speeds in % of slider bounds
                        if(this.isNavInputDown(NavInput.TweakSlow))
                            delta /= 10;
                    }
                    else
                    {
                        if ((v_range >= -100 && v_range <= 100) ||
                            this.isNavInputDown(NavInput.TweakSlow))
                        {
                            // Gamepad/keyboard tweak speeds in integer steps
                            delta = ((delta < 0.0) ? -1.0 : +1.0) / v_range;
                        }
                        else
                            delta /= 100.;
                    }
                    if (this.isNavInputDown(NavInput.TweakFast))
                        delta *= 10.;
                    set_new_value = true;
                    if ((clicked_t >= 1. && delta > 0.) ||
                        (clicked_t <= 0. && delta < 0.))
                    {
                        // This is to avoid applying the saturation when already
                        // past the limits
                        set_new_value = false;
                    }
                    else
                        clicked_t = Vec1.Saturate(clicked_t + delta);
                }
            }
            if (set_new_value)
            {
                let v_new;
                if (is_power)
                {
                    // Account for power curve scale on both sides of the zero
                    if (clicked_t < linear_zero_pos)
                    {
                        // Negative: rescale to the negative range before powering
                        let a = 1.0 - (clicked_t / linear_zero_pos);
                        a = Math.pow(a, power);
                        v_new = Vec1.Lerp(Math.min(v_max, 0), v_min, a);
                    }
                    else
                    {
                        // Positive: rescale to the positive range before powering
                        let a;
                        if (Math.abs(linear_zero_pos - 1) > 1.e-6)
                            a = (clicked_t-linear_zero_pos) / (1.0-linear_zero_pos);
                        else
                            a = clicked_t;
                        a = Math.pow(a, power);
                        v_new = Vec1.Lerp(Math.max(v_min, 0), v_max, a);
                    }
                }
                else
                {
                    // Linear slider
                    if (is_decimal)
                    {
                        v_new = Vec1.Lerp(v_min, v_max, clicked_t);
                    }
                    else
                    {
                        // For integer values we want the clicking position to
                        // match the grab box so we round above  This code is
                        // carefully tuned to work with large values (e.g. high
                        // ranges of U64) while preserving this property..
                        // XXX: is this okay for "floats"?
                        let v_new_off_f = (v_max - v_min) * clicked_t;
                        let v_new_off_floor = Math.floor(v_new_off_f);
                        let v_new_off_round = Math.round(v_new_off_f);
                        if (!is_decimal && v_new_off_floor < v_new_off_round)
                            v_new = v_min + v_new_off_round;
                        else
                            v_new = v_min + v_new_off_floor;
                    }
                }

                // Round to user desired precision based on format string
                v_new = RoundScalarToPrecision(v_new, precision);

                // Apply result
                if (v != v_new)
                {
                    v = v_new;
                    value_changed = true;
                }
            }
        }
        // Output grab position so it can be displayed by the caller
        let grab_t = this.sliderCalcRatioFromValue(v, v_min, v_max, power, linear_zero_pos);
        if (axis == "y")
            grab_t = 1. - grab_t;
        const grab_pos = Vec1.Lerp(slider_usable_pos_min, slider_usable_pos_max, grab_t);
        if(out_grab_bb != null)
        {
            let min, max;
            if (axis == "x")
            {
                min = new Vec2(grab_pos - grab_sz*0.5, bb.Min.y + grab_padding);
                max = new Vec2(grab_pos + grab_sz*0.5, bb.Max.y - grab_padding);
            }
            else
            {
                min = new Vec2(bb.Min.x + grab_padding, grab_pos - grab_sz*0.5);
                max = new Vec2(bb.Max.x - grab_padding, grab_pos + grab_sz*0.5);
            }
            out_grab_bb.Min = min;
            out_grab_bb.Max = max;
        }
        if(value_changed && onChange)
            onChange(v);
        return value_changed;
    },

    sliderCalcRatioFromValue(v, v_min, v_max, power, linear_zero_pos)
    {
        if (v_min == v_max)
            return 0;
        const is_power = (power != 1);
        const v_clamped = (v_min < v_max) ? Vec1.Clamp(v, v_min, v_max) :
                                            Vec1.Clamp(v, v_max, v_min);
        if (is_power)
        {
            if (v_clamped < 0)
            {
                const f = 1 - ((v_clamped - v_min) / (Math.min(0, v_max) - v_min));
                return (1 - Math.pow(f, 1/power)) * linear_zero_pos;
            }
            else
            {
                const f = (v_clamped - Math.max(0, v_min)) / (v_max - Math.max(0, v_min));
                return linear_zero_pos + Math.pow(f, 1/power) * (1 - linear_zero_pos);
            }
        }

        // Linear slider
        return (v_clamped - v_min) / (v_max - v_min);
    },

};