import {Axis, Dir, InputReadMode, InputSource} from "../enums.js";
import {DataType} from "../datatype.js";
import {NavDirSourceFlags} from "../flags.js";
import {Vec1, Vec2, Rect} from "../types.js";
import {FormatValues, GetMinStepAtFloatPrecision,
        RoundScalarToPrecision, ParseFormatPrecision} from "../datatype.js";

export var DragPayloads =
{
    "COLOR_3F": "_COL3F",
    "COLOR_4F": "_COL4F",
};

export var DragFlags =
{
    None: 0,
    Vertical: 1,
    AsHyperText: 2,
    LongPress: 4, // only register drag after IO.LongPressInterval
                  //  we used the same id as ButtonFlags 
};

const FFmt = "%.3f";
const IFmt = "%d";

export var ImguiDragMixin =
{
    // - CTRL+Click on any drag box to turn them into an input box. Manually
    //   input values aren't clamped and can go off-bounds.
    // - For all the Float2/Float3/Float4/Int2/Int3/Int4 versions of every
    //   functions, note that a 'float v[X]' function argument is the same
    //   as 'float* v', the array syntax is just a way to document the number
    //   of elements that are expected to be accessible. You can pass address
    //   of your first element out of a contiguous set, e.g. &myvector.x
    // - Adjust format string to decorate the value with a prefix, a suffix,
    //   or adapt the editing and display precision e.g. "%.3f" -> 1.234;
    //   "%5.2f secs" -> 01.23 secs; "Biscuit: %.0f" -> Biscuit: 1; etc.
    // - Speed are per-pixel of mouse movement (v_speed=0.2f: mouse needs to
    //   move by 5 pixels to increase value by 1). For gamepad/keyboard
    //   navigation, minimum speed is Max(v_speed, minimum_step_at_given_precision).
    DragFloat(label, val, v_speed=1, v_min=0, v_max=0, format=null,
            power=1, onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=FFmt;
        return this.DragScalar(label, DataType.Float, val, v_speed, v_min, v_max,
                            format, power, onChange, onDone, flags);
    },

    DragVec2(label, val, v_speed=1, v_min=0, v_max=0, format=null,
            power=1, onChange=null, onDone=null, flags=0)
    {
        let value_changed = this.DragFloat2(label, [val.x, val.y],
                                        v_speed, v_min, v_max, format,
                                        power, (newval => {
                                            val.x = newval[0];
                                            val.y = newval[1];
                                        }), onDone, flags);
        if(value_changed && onChange)
            onChange(val);
        return value_changed;
    },

    // If v_min >= v_max we have no bound
    DragFloat2(label, val, v_speed=1, v_min=0, v_max=0, format=null,
                power=1, onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=FFmt;
        return this.DragScalarN(label, DataType.Float, val, 2,
                                v_speed, v_min, v_max, format, power, 
                                onChange, onDone, flags);
    },

    DragFloat3(label, val, v_speed=1, v_min=0, v_max=0, format=null,
                power=1, onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=FFmt;
        return this.DragScalarN(label, DataType.Float, val, 3,
                                v_speed, v_min, v_max, format, power, 
                                onChange, onDone, flags);
    },

    DragFloat4(label, val, v_speed=1, v_min=0, v_max=0, format=null,
                power=1, onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=FFmt;
        if(val.AsArray != undefined)
        {
            let va = val.AsArray();
            return this.DragScalarN(label, DataType.Float, va, 4,
                            v_speed, v_min, v_max, format, 1,
                            function(newval)
                            {
                                val.CopyArray(newval);
                                if(onChange)
                                    onChange(val);
                            }, onDone, flags);
        }
        else
        {
            return this.DragScalarN(label, DataType.Float, val, 4,
                                v_speed, v_min, v_max, format, power, 
                                onChange, onDone, flags);
        }
    },

    DragFloatRange2(label, v_current_min, v_current_max, v_speed=1,
                v_min=0, v_max=0, format=null, format_max=null, power=1, 
                onChange=null, onDone=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        this.PushID(label);
        this.BeginGroup();
        this.PushMultiItemsWidths(2, this.getNextItemWidth());

        let value_changed = this.DragFloat("##min", v_current_min, v_speed,
            (v_min >= v_max) ? -Number.MAX_VALUE : v_min,
            (v_min >= v_max) ? v_current_max : Math.min(v_max, v_current_max),
            format, power, 
            (newval)=>v_current_min = newval, onDone, flags);

        this.PopItemWidth();
        this.SameLine(0, g.Style.ItemInnerSpacing.x);
        value_changed |= this.DragFloat("##max", v_current_max, v_speed,
            (v_min >= v_max) ? v_current_min : Math.max(v_min, v_current_min),
            (v_min >= v_max) ? Number.MAX_VALUE : v_max,
            format_max ? format_max : format, power, 
            (newval)=>v_current_max=newval, onDone, flags);
        this.PopItemWidth();
        this.SameLine(0, g.Style.ItemInnerSpacing.x);

        this.textEx(label.split("##")[0]);
        this.EndGroup();
        this.PopID();

        if(value_changed && onChange)
        {
            onChange(v_current_min, v_current_max);
        }
        return value_changed;
    },

    DragInt(label, v, v_speed=1, v_min=0, v_max=0, format=null, 
            onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=IFmt;
        return this.DragScalar(label, DataType.S32, v, v_speed, v_min, v_max,
                            format, 1, onChange, onDone, flags);
    },

    // If v_min >= v_max we have no bound
    DragInt2(label, v, v_speed=1, v_min=0, v_max=0, format=null, 
            onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=IFmt;
        return this.DragScalarN(label, DataType.S32, v, 2, v_speed, v_min, v_max,
                            format, 1, onChange, onDone, flags);
    },

    // If v_min >= v_max we have no bound
    DragInt3(label, v, v_speed=1, v_min=0, v_max=0, format=null, 
            onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=IFmt;
        return this.DragScalarN(label, DataType.S32, v, 3, v_speed, v_min, v_max,
                            format, 1, onChange, onDone, flags);
    },

    // If v_min >= v_max we have no bound
    DragInt4(label, v, v_speed=1, v_min=0, v_max=0, format=null, 
                            onChange=null, onDone=null, flags=0)
    {
        if(format==null) format=IFmt;
        return this.DragScalarN(label, DataType.S32, v, 4, v_speed,
                                v_min, v_max, format, 1, 
                                onChange, onDone, flags);
    },

    // If v_min >= v_max we have no bound
    DragIntRange2(label, v_current_min, v_current_max,
                  v_speed=1, v_min=0, v_max=0,
                  format=null, format_max=null, 
                  onChange=null, onDone=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        this.PushID(label);
        this.BeginGroup();
        this.PushMultiItemsWidths(2, this.getNextItemWidth());
        let value_changed = this.DragInt("##min", v_current_min, v_speed,
            (v_min >= v_max) ? -Number.MAX_SAFE_INTEGER : v_min,
            (v_min >= v_max) ? v_current_max : Math.min(v_max, v_current_max),
            format,
            (newval)=>{v_current_min = newval;}, onDone, flags);
        this.PopItemWidth();
        this.SameLine(0, g.Style.ItemInnerSpacing.x);
        value_changed |= this.DragInt("##max", v_current_max, v_speed,
            (v_min >= v_max) ? v_current_min : Math.max(v_min, v_current_min),
            (v_min >= v_max) ? Number.MAX_SAFE_INTEGER : v_max,
            format_max ? format_max : format,
            (newval)=>v_current_max=newval, onDone, flags);
        this.PopItemWidth();
        this.SameLine(0, g.Style.ItemInnerSpacing.x);

        this.textEx(label.split("##")[0]);
        this.EndGroup();
        this.PopID();

        if(value_changed && onChange)
        {
            onChange(v_current_min, v_current_max);
        }
        return value_changed;
    },

    DragScalar(label, data_type, v, v_speed=1, v_min=0, v_max=0, format=null,
                power=1, onChange=null, onDone=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        if (power != 1)
        {
            // When using a power curve the drag needs to have known bounds
            console.assert(v_min != null && v_max != null);
        }

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);
        const w = this.CalcItemWidth();
        const label_size = this.CalcTextSize(label, true);
        let frame_bb, total_bb;
        let text_pos;
        if(flags & DragFlags.AsHyperText)
        {
            text_pos = new Vec2(win.DC.CursorPos.x, 
                        win.DC.CursorPos.y + win.DC.CurrentLineTextBaseOffset);

            frame_bb = new Rect(text_pos, Vec2.AddXY(text_pos, w, label_size.y));
            total_bb = new Rect(frame_bb.Min,
                            Vec2.AddXY(frame_bb.Max,
                                label_size.x>0 ? style.ItemInnerSpacing.x + label_size.x : 0,
                                0));
            this.itemSize(total_bb);
            if (!this.itemAdd(total_bb, id, frame_bb))
                return false;
        }
        else
        {
            frame_bb = new Rect(win.DC.CursorPos,
                                   Vec2.AddXY(win.DC.CursorPos,
                                            w, label_size.y+style.FramePadding.y*2));
            total_bb = new Rect(frame_bb.Min,
                                  Vec2.AddXY(frame_bb.Max,
                                    label_size.x > 0 ? 
                                        style.ItemInnerSpacing.x + label_size.x
                                        : 0,
                                    0));
            this.itemSize(total_bb, style.FramePadding.y);
            if (!this.itemAdd(total_bb, id, frame_bb))
                return false;
        }

        const hovered = this.itemHoverable(frame_bb, id);

        // Tabbing or CTRL-clicking on Drag turns it into an input box
        let start_text_input = false;
        const focus_requested = this.focusableItemRegister(win, id);
        if (focus_requested ||
            (hovered && (g.IO.MouseClicked[0] || g.IO.MouseDoubleClicked[0])) ||
            g.NavActivateId == id ||
            (g.NavInputId == id && g.ScalarAsInputTextId != id))
        {
            this.setActiveID(id, win);
            this.setFocusID(id, win);
            this.FocusWindow(win);
            g.ActiveIdAllowNavDirFlags = (1 << Dir.Up) | (1 << Dir.Down);
            if (focus_requested || g.IO.KeyCtrl ||
                g.IO.MouseDoubleClicked[0] || g.NavInputId == id)
            {
                start_text_input = true;
                g.ScalarAsInputTextId = 0;
            }
        }
        if (start_text_input || (g.ActiveId == id && g.ScalarAsInputTextId == id))
        {
            win.DC.CursorPos = frame_bb.Min.Clone();
            this.focusableItemUnregister(win);
            return this.inputScalarAsWidgetReplacement(frame_bb, id, label,
                                                    data_type, v, format);
        }

        // Actual drag behavior
        const value_changed = this.dragBehavior(id, data_type, v, v_speed, v_min,
                                        v_max, format, power, flags,
                                        function(newval)
                                        {
                                            v = newval;
                                            if(onChange)
                                                onChange(v);
                                        },
                                        function()
                                        {
                                            if(onDone)
                                                onDone();
                                        });
        if (value_changed)
            this.markItemEdited(id);


        // Display value using user-provided display format so user 
        // can add prefix/suffix/decorations to the value.
        let valstr = FormatValues(format, [v]);

        if(flags & DragFlags.AsHyperText)
        {
            this.renderFrameBorder(frame_bb.Min, frame_bb.Max, 0, .5);

            let active = g.ActiveId == id && 
                         g.ActiveIdSource == InputSource.Mouse && 
                         g.IO.MouseDown[0];

            let col = style.GetColor((active||hovered) ? "LinkHovered" : "Link");
            this.PushStyleColor("Text", col);
            this.renderTextClipped(frame_bb.Min, frame_bb.Max, valstr, null,
                                new Vec2(0.5, 0.5));
            this.PopStyleColor();
        }
        else
        {
            const frame_col = style.GetColor(g.ActiveId == id ? "FrameBgActive" :
                    g.HoveredId == id ? "FrameBgHovered" : "FrameBg");
            this.renderNavHighlight(frame_bb, id);
            this.renderFrame(frame_bb.Min, frame_bb.Max, frame_col, true,
                            style.FrameRounding);

            // Display value using user-provided display format so user can add prefix/suffix/decorations to the value.
            this.renderTextClipped(frame_bb.Min, frame_bb.Max, valstr, null,
                                new Vec2(0.5, 0.5));

        }
        if (label_size.x > 0)
        {
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                        frame_bb.Min.y + style.FramePadding.y),
                                label);
        }

        return value_changed;
    },

    DragScalarN(label, data_type, v, components, v_speed=1, v_min=0, v_max=0,
                format=null, power=1, onChange=null, onDone=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        let value_changed = false;
        this.BeginGroup();
        this.PushID(label);
        this.PushMultiItemsWidths(components, this.getNextItemWidth());
        for (let i = 0; i < components; i++)
        {
            this.PushID(i);
            this.DragScalar("", data_type, v[i], v_speed, v_min, v_max,
                            format, power, function(newval)
                            {
                                v[i] = newval;
                                value_changed = true;
                            }, onDone, flags);
            this.SameLine(0, g.Style.ItemInnerSpacing.x);
            this.PopID();
            this.PopItemWidth();
        }
        this.PopID();
        this.textEx(label.split("##")[0]);
        this.EndGroup();
        if(value_changed && onChange)
        {
            onChange(v);
        }
        return value_changed;
    },

    /*-------------------------------------------------------------*/
    // used by drag-text widgets
    dragBehavior(id, data_type, v, v_speed, v_min, v_max, format, power, 
                flags, onChange, onDone)
    {
        let g = this.guictx;
        if(g.ActiveId == id)
        {
            if(g.ActiveIdSource == InputSource.Mouse && !g.IO.MouseDown[0])
            {
                this.clearActiveID();
                if(onDone) onDone();
            }
            else
            if(g.ActiveIdSource == InputSource.Nav &&
                g.NavActivatePressedId == id && g.ActiveIdIsJustActivated)
            {
                this.clearActiveID();
                if(onDone) onDone();
            }
        }
        if(g.ActiveId != id)
            return false;

        const axis = (flags & DragFlags.Vertical) ? Axis.Y : Axis.X;
        const axisS = (flags & DragFlags.Vertical) ? "y" : "x";
        const isfloat = (data_type == DataType.Float);
        const has_min_max = (v_min != v_max);
        const is_power = (power != 1 && isfloat && has_min_max &&
                           (v_max - v_min < Number.MAX_VALUE));
        let precision = isfloat ? ParseFormatPrecision(format) : 0;

        // Default tweak speed
        if (v_speed == 0. && has_min_max && (v_max - v_min < Number.MAX_VALUE))
            v_speed = (v_max - v_min) * g.DragSpeedDefaultRatio;

        // Inputs accumulates into g.DragCurrentAccum, which is flushed into
        // the current value as soon as it makes a difference with our precision
        // settings
        let adjust_delta = 0.;
        if (g.ActiveIdSource == InputSource.Mouse && this.IsMousePosValid()
            && g.IO.MouseDragMaxDistanceSqr[0] > 1.)
        {
            if(!(flags & DragFlags.LongPress) ||
                 g.IO.MouseDownDuration[0] >= g.IO.LongPressInterval)
            {
                adjust_delta = g.IO.MouseDelta[axisS];
                if (g.IO.KeyAlt)
                    adjust_delta *= 1. / 100;
                if (g.IO.KeyShift)
                    adjust_delta *= 10;
            }
        }
        else
        if (g.ActiveIdSource == InputSource.Nav)
        {
            adjust_delta = this.getNavInputAmount2d(
                            NavDirSourceFlags.Keyboard | NavDirSourceFlags.PadDPad,
                            InputReadMode.RepeatFast, 1./10, 10)[axisS];
            v_speed = Math.max(v_speed, GetMinStepAtFloatPrecision(precision));
        }
        adjust_delta *= v_speed;

        // For vertical drag we currently assume that Up=higher value (like we
        // do with vertical sliders). This may become a parameter.
        if (axis == Axis.Y)
            adjust_delta = -adjust_delta;

        // Clear current value on activation
        // Avoid altering values and clamping when we are _already_ past the
        // limits and heading in the same direction, so e.g. if range is 0..255,
        // current value is 300 and we are pushing to the right side, keep the 300.
        let is_just_activated = g.ActiveIdIsJustActivated;
        let is_already_past_limits_and_pushing_outward = has_min_max &&
            ((v >= v_max && adjust_delta > 0) || (v <= v_min && adjust_delta < 0.));
        let is_drag_direction_change_with_power = is_power &&
            ((adjust_delta < 0 && g.DragCurrentAccum > 0) ||
             (adjust_delta > 0 && g.DragCurrentAccum < 0));
        if (is_just_activated || is_already_past_limits_and_pushing_outward
            || is_drag_direction_change_with_power)
        {
            g.DragCurrentAccum = 0.;
            g.DragCurrentAccumDirty = false;
        }
        else
        if (adjust_delta != 0.)
        {
            g.DragCurrentAccum += adjust_delta;
            g.DragCurrentAccumDirty = true;
        }

        if (!g.DragCurrentAccumDirty)
            return false;

        let v_cur = v;
        let v_old_ref_for_accum_remainder = 0.;

        if (is_power)
        {
            // Offset + round to user desired precision, with a curve on the
            // v_min..v_max range to get more precision on one side of the range
            let v_old_norm_curved = Math.pow((v_cur - v_min) / (v_max - v_min), 1/power);
            let v_new_norm_curved = v_old_norm_curved + (g.DragCurrentAccum / (v_max - v_min));
            v_cur = v_min + Math.pow(Vec1.Saturate(v_new_norm_curved), power) * (v_max - v_min);
            v_old_ref_for_accum_remainder = v_old_norm_curved;
        }
        else
        {
            v_cur += g.DragCurrentAccum;
        }

        // Round to user desired precision based on format string
        v_cur = RoundScalarToPrecision(v_cur, precision);

        // Preserve remainder after rounding has been applied. This also
        // allow slow tweaking of values.
        g.DragCurrentAccumDirty = false;
        if (is_power)
        {
            let v_cur_norm_curved = Math.pow((v_cur - v_min) /(v_max - v_min), 1./power);
            g.DragCurrentAccum -= (v_cur_norm_curved - v_old_ref_for_accum_remainder);
        }
        else
        {
            g.DragCurrentAccum -= (v_cur - v); //XXX: sloppy for signed types?
        }

        // Clamp values (+ handle overflow/wrap-around for integer types)
        if (v != v_cur && has_min_max)
        {
            if (v_cur < v_min || (v_cur > v && adjust_delta < 0 && !isfloat))
                v_cur = v_min;
            if (v_cur > v_max || (v_cur < v && adjust_delta > 0 && !isfloat))
                v_cur = v_max;
        }

        if (v == v_cur)
            return false;
        // Apply result
        if(onChange)
            onChange(v_cur);
        return true;
    },
};