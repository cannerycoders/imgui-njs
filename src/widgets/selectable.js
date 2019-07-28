import {Vec2, Rect, ValRef} from "../types.js";
import {ItemFlags, NavHighlightFlags} from "../flags.js";
import {ButtonFlags} from "./button.js";
import {WindowFlags} from "../window.js";

/* -- Selectable -------------------------------------------*/
// Tip: pass a non-visible label (e.g. "##dummy") then you
// can use the space to draw other text or image. But you need
// to make sure the ID is unique, e.g. enclose calls in PushID/PopID
// or use ##unique_id.
export var SelectableFlags =
{
    None: 0,
    // Clicking this don't close parent popup window
    DontClosePopups: 1 << 0,
    // Selectable frame can span all columns (text will still fit in current column)
    SpanAllColumns: 1 << 1,
    // Generate press events on double clicks too
    AllowDoubleClick: 1 << 2,
    // Cannot be selected, display greyed out text
    Disabled: 1 << 3,

    // these are SelectableFlagsPrivate
    NoHoldingActiveID: 1 << 10,
    PressedOnClick: 1 << 11,
    PressedOnRelease: 1 << 12,
    DrawFillAvailWidth: 1 << 13,
    AllowItemOverlap: 1 << 14
};

export var ImguiSelectableMixin =
{
    Selectable(label, selected=false, flags=0, size_arg=Vec2.Zero(false))
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        let g = this.guictx;
        const style = g.Style;

        // FIXME-OPT: Avoid if vertically clipped.
        if ((flags & SelectableFlags.SpanAllColumns) && win.DC.CurrentColumns)
            this.PopClipRect();

        let id = win.GetID(label);
        let label_size = this.CalcTextSize(label, true);
        let size = new Vec2(size_arg.x != 0 ? size_arg.x : label_size.x,
                            size_arg.y != 0 ? size_arg.y : label_size.y);
        let pos = win.DC.CursorPos.Clone();
        pos.y += win.DC.CurrentLineTextBaseOffset;
        let bb_inner = new Rect(pos, Vec2.Add(pos,size));
        this.itemSize(bb_inner);

        // Fill horizontal space.
        let window_padding = win.WindowPadding.Clone();
        let max_x = (flags & SelectableFlags.SpanAllColumns) ?
            this.GetWindowContentRegionMax().x :
            this.GetContentRegionMax().x;
        let w_draw = Math.max(label_size.x,
                            win.Pos.x+max_x - window_padding.x-pos.x);
        let size_draw = new Vec2(
                (size_arg.x != 0 && !(flags & SelectableFlags.DrawFillAvailWidth)) ?
                    size_arg.x : w_draw,
                size_arg.y != 0 ? size_arg.y : size.y);
        let bb = new Rect(pos, Vec2.Add(pos, size_draw));
        if (size_arg.x == 0 || (flags & SelectableFlags.DrawFillAvailWidth))
            bb.Max.x += window_padding.x;

        // Selectables are tightly packed together, we extend the box to cover spacing between selectable.
        let spacing_L = Math.floor(style.ItemSpacing.x * 0.5);
        let spacing_U = Math.floor(style.ItemSpacing.y * 0.5);
        let spacing_R = style.ItemSpacing.x - spacing_L;
        let spacing_D = style.ItemSpacing.y - spacing_U;
        bb.Min.x -= spacing_L;
        bb.Min.y -= spacing_U;
        bb.Max.x += spacing_R;
        bb.Max.y += spacing_D;

        let item_add;
        if (flags & SelectableFlags.Disabled)
        {
            let backup_item_flags = win.DC.ItemFlags;
            win.DC.ItemFlags |= ItemFlags.Disabled | ItemFlags.NoNavDefaultFocus;
            item_add = this.itemAdd(bb, id);
            win.DC.ItemFlags = backup_item_flags;
        }
        else
        {
            item_add = this.itemAdd(bb, id);
        }
        if (!item_add)
        {
            if ((flags & SelectableFlags.SpanAllColumns) && win.DC.CurrentColumns)
                this.pushColumnClipRect();
            return false;
        }

        // We use NoHoldingActiveID on menus so user can click and _hold_ on a
        // menu then drag to browse child entries
        let button_flags = 0;
        if (flags & SelectableFlags.NoHoldingActiveID)
            button_flags |= ButtonFlags.NoHoldingActiveID;
        if (flags & SelectableFlags.PressedOnClick)
            button_flags |= ButtonFlags.PressedOnClick;
        if (flags & SelectableFlags.PressedOnRelease)
            button_flags |= ButtonFlags.PressedOnRelease;
        if (flags & SelectableFlags.Disabled)
            button_flags |= ButtonFlags.Disabled;
        if (flags & SelectableFlags.AllowDoubleClick)
            button_flags |= ButtonFlags.PressedOnClickRelease | ButtonFlags.PressedOnDoubleClick;
        if(flags & SelectableFlags.AllowItemOverlap)
            button_flags |= ButtonFlags.AllowItemOverlap;
        if (flags & SelectableFlags.Disabled)
            selected = false;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bb, id, hovered, held, button_flags);

        // Hovering selectable with mouse updates NavId accordingly so
        // navigation can be resumed with gamepad/keyboard (this doesn't
        // happen on most widgets)
        if (pressed || hovered.get())
        {
            if (!g.NavDisableMouseHover && g.NavWindow == win &&
                g.NavLayer == win.DC.NavLayerCurrent)
            {
                g.NavDisableHighlight = true;
                this.setNavID(id, win.DC.NavLayerCurrent);
            }
        }
        if (pressed)
            this.markItemEdited(id);

        if(flags & SelectableFlags.AllowItemOverlap)
            this.SetItemAllowOverlap();

        // Render
        if (hovered.get() || selected)
        {
            let col = style.GetColor((held.get() && hovered.get()) ? "HeaderActive" :
                                hovered.get() ? "HeaderHovered" :
                                "Header");
            this.renderFrame(bb.Min, bb.Max, col, false, 0);
            this.renderNavHighlight(bb, id,
                        NavHighlightFlags.TypeThin|NavHighlightFlags.NoRounding);
        }

        if ((flags & SelectableFlags.SpanAllColumns) && win.DC.CurrentColumns)
        {
            this.pushColumnClipRect();
            bb.Max.x -= (this.GetContentRegionMax().x - max_x);
        }

        if (flags & SelectableFlags.Disabled)
            this.PushStyleColor("Text", g.Style.GetColor("TextDisabled"));
        this.renderTextClipped(bb_inner.Min, bb_inner.Max, label, null,
                                style.SelectableTextAlign, bb);
        if (flags & SelectableFlags.Disabled)
            this.PopStyleColor();

        // Automatically close popups
        if (pressed && (win.Flags & WindowFlags.Popup) &&
            !(flags & SelectableFlags.DontClosePopups) &&
            !(win.DC.ItemFlags & ItemFlags.SelectableDontClosePopup))
        {
            this.CloseCurrentPopup();
        }
        return pressed;
    }
}; // end mixin