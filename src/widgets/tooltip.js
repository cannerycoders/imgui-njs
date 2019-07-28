import {WindowFlags} from "../window.js";
import {Vec2} from "../types.js";

export var ImguiTooltipMixin =
{
    // simplest tooltip
    Tooltip(str, maxchars=20)
    {
        let imgui = this;
        imgui.SameLine();
        imgui.TextDisabled("?");
        if (imgui.IsItemHovered())
        {
            imgui.BeginTooltip();
            imgui.PushTextWrapPos(imgui.GetFontSize() * maxchars);
            imgui.TextUnformatted(str);
            imgui.PopTextWrapPos();
            imgui.EndTooltip();
        }
    },

    // begin/append a tooltip window. to create full-featured tooltip (with
    //  any kind of items).
    BeginTooltip()
    {
        let g = this.guictx;
        if (g.DragDropWithinSourceOrTarget)
        {
            // The default tooltip position is a little offset to give space to
            // see the context menu (it's also clamped within the current viewport/monitor)
            // In the context of a dragging tooltip we try to reduce that
            // offset and we enforce following the cursor. Whatever we do we
            // want to call SetNextWindowPos() to enforce a tooltip position
            // and disable clipping the tooltip without our display area,
            // like regular tooltip do.
            //ImVec2 tooltip_pos = g.IO.MousePos - g.ActiveIdClickOffset - g.Style.WindowPadding;
            let tooltip_pos = Vec2.AddXY(g.IO.MousePos,
                                        16*g.Style.MouseCursorScale,
                                        8*g.Style.MouseCursorScale);
            this.SetNextWindowPos(tooltip_pos);
            this.SetNextWindowBgAlpha(g.Style.Colors["PopupBg"].a * 0.6);
            //PushStyleVar(ImGuiStyleVar_Alpha, g.Style.Alpha * 0.60f);
            // This would be nice but e.g ColorButton with checkboard has issue with transparent colors :(
            this.beginTooltipEx(0, true);
        }
        else
        {
            this.beginTooltipEx(0, false);
        }
    },

    EndTooltip()
    {
        console.assert(this.getCurrentWindowRead().Flags & WindowFlags.Tooltip,
                        "Mismatched BeginTooltip()/EndTooltip() calls");
        this.End();
    },

    SetTooltip(txt, ...args)
    {
        let g = this.guictx;
        if (g.DragDropWithinSourceOrTarget)
            this.BeginTooltip();
        else
            this.beginTooltipEx(0, true);
        this.TextV(txt, args);
        this.EndTooltip();
    },

    beginTooltipEx(extra_flags, override_previous_tooltip=true)
    {
        let g = this.guictx;
        let window_name = "##Tooltip_" + g.TooltipOverrideCount;
        if (override_previous_tooltip)
        {
            let win = this.findWindowByName(window_name);
            if (win && win.Active)
            {
                // Hide previous tooltip from being displayed. We can't easily
                // "reset" the content of a window so we create a new one.
                win.Hidden = true;
                win.HiddenFramesCanSkipItems = 1;
                window_name = "##Tooltip_" + ++g.TooltipOverrideCount;
            }
        }
        let flags = WindowFlags.Tooltip|WindowFlags.NoInputs|
                    WindowFlags.NoTitleBar|WindowFlags.NoMove|
                    WindowFlags.NoResize|WindowFlags.NoSavedSettings|
                    WindowFlags.AlwaysAutoResize;
        this.Begin(window_name, null/*popen*/, flags|extra_flags);
    }
};