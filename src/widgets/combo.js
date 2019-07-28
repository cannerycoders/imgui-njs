import {Vec2, Rect, ValRef} from "../types.js";
import {WindowFlags} from "../window.js";
import {CornerFlags} from "../flags.js";
import {Dir} from "../enums.js";
import {PopupPositionPolicy} from "./popup.js";
import {IsPowerOfTwo} from "../hashutil.js";

// Widgets: Combo Box
// - The new BeginCombo()/EndCombo() api allows you to manage your contents
//   and selection state however you want it, by creating e.g. Selectable() items.
// - The old Combo() api are helpers over BeginCombo()/EndCombo() which are
//   kept available for convenience purpose.
export var ComboFlags =
{
    None: 0,
    PopupAlignLeft: 1 << 0,
        // Align the popup toward the left by default    -
    HeightSmall: 1 << 1,
        // Max ~4 items visible. Tip: If you want your combo popup to be a
        // specific size you can use SetNextWindowSizeConstraints() prior to
        // calling BeginCombo()
    HeightRegular: 1 << 2,
        // Max ~8 items visible (default)
    HeightLarge: 1 << 3,
        // Max ~20 items visible
    HeightLargest: 1 << 4,
        // As many fitting items as possible
    NoArrowButton: 1 << 5,
        // Display on the preview box without the square arrow button
    NoPreview: 1 << 6,
        // Display only a square arrow button
};

ComboFlags.HeightMask_ = ComboFlags.HeightSmall | ComboFlags.HeightRegular |
                         ComboFlags.HeightLarge | ComboFlags.HeightLargest;

export var ImguiComboMixin =
{
    BeginCombo(label, preview_value, flags=0)
    {
        // Always consume the SetNextWindowSizeConstraint() call in our early return paths
        let g = this.guictx;
        let backup_next_window_size_constraint = g.NextWindowData.SizeConstraintCond;
        g.NextWindowData.SizeConstraintCond = 0;

        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        // Can't use both flags together
        console.assert((flags & (ComboFlags.NoArrowButton | ComboFlags.NoPreview)) !=
                                 (ComboFlags.NoArrowButton | ComboFlags.NoPreview));

        let style = g.Style;
        const id = win.GetID(label);
        const arrow_size = (flags & ComboFlags.NoArrowButton) ? 0 : this.GetFrameHeight();
        const label_size = this.CalcTextSize(label, true);
        const expected_w = this.getNextItemWidth();
        const w = (flags & ComboFlags.NoPreview) ? arrow_size : expected_w;
        const frame_bb = new Rect(win.DC.CursorPos,
                                Vec2.AddXY(win.DC.CursorPos,
                                    w, label_size.y + style.FramePadding.y*2));
        const total_bb = new Rect(frame_bb.Min,
                                Vec2.AddXY(frame_bb.Max,
                                    label_size.x > 0 ? style.ItemInnerSpacing.x + label_size.x : 0,
                                    0));
        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, id, frame_bb))
            return false;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(frame_bb, id, hovered, held);
        let popup_open = this.IsPopupOpen(id);
        const frame_col = style.GetColor(hovered.get() ? "FrameBgHovered" : "FrameBg");
        const value_x2 = Math.max(frame_bb.Min.x, frame_bb.Max.x - arrow_size);
        this.renderNavHighlight(frame_bb, id);
        if (!(flags & ComboFlags.NoPreview))
            win.DrawList.AddRectFilled(frame_bb.Min, new Vec2(value_x2, frame_bb.Max.y),
                        frame_col, style.FrameRounding, CornerFlags.Left);
        if (!(flags & ComboFlags.NoArrowButton))
        {
            win.DrawList.AddRectFilled(new Vec2(value_x2, frame_bb.Min.y), frame_bb.Max,
                style.GetColor((popup_open || hovered.get()) ?
                                "ButtonHovered" : "Button"),
                style.FrameRounding,
                (w <= arrow_size) ? CornerFlags.All : CornerFlags.Right);
            this.renderArrow(new Vec2(value_x2 + style.FramePadding.y,
                                    frame_bb.Min.y + style.FramePadding.y),
                            Dir.Down);
        }
        this.renderFrameBorder(frame_bb.Min, frame_bb.Max, style.FrameRounding);
        if (preview_value != null && !(flags & ComboFlags.NoPreview))
        {
            this.renderTextClipped(Vec2.Add(frame_bb.Min, style.FramePadding),
                                   new Vec2(value_x2, frame_bb.Max.y),
                                   preview_value, null, Vec2.Zero());
        }
        if (label_size.x > 0)
        {
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                    frame_bb.Min.y + style.FramePadding.y),
                            label);
        }

        if ((pressed || g.NavActivateId == id) && !popup_open)
        {
            if (win.DC.NavLayerCurrent == 0)
                win.NavLastIds[0] = id;
            this.openPopupEx(id);
            popup_open = true;
        }

        if (!popup_open)
        {
            return false;
        }

        if (backup_next_window_size_constraint)
        {
            g.NextWindowData.SizeConstraintCond = backup_next_window_size_constraint;
            g.NextWindowData.SizeConstraintRect.Min.x = Math.max(g.NextWindowData.SizeConstraintRect.Min.x, w);
        }
        else
        {
            if ((flags & ComboFlags.HeightMask_) == 0)
                flags |= ComboFlags.HeightRegular;
            console.assert(IsPowerOfTwo(flags & ComboFlags.HeightMask_)); // Only one
            let popup_max_height_in_items = -1;
            if (flags & ComboFlags.HeightRegular)
                popup_max_height_in_items = 8;
            else
            if (flags & ComboFlags.HeightSmall)
                popup_max_height_in_items = 4;
            else
            if (flags & ComboFlags.HeightLarge)
                popup_max_height_in_items = 20;
            let h = this.calcMaxPopupHeightFromItemCount(popup_max_height_in_items);
            this.SetNextWindowSizeConstraints(new Vec2(w, 0),
                                              new Vec2(Number.MAX_VALUE, h));
        }
        let name = "##Combo_" + g.BeginPopupStack.length; // Recycle windows based on depth

        // Peak into expected window size so we can position it
        let popup_win = this.findWindowByName(name);
        if (popup_win)
        {
            if (popup_win.WasActive)
            {
                let size_expected = this.calcWindowExpectedSize(popup_win);
                if (flags & ComboFlags.PopupAlignLeft)
                    popup_win.AutoPosLastDirection = Dir.Left;
                let r_outer = this.getWindowAllowedExtentRect(popup_win);
                let lastAutoPos = new ValRef(popup_win.AutoPosLastDirection);
                let pos = this.findBestWindowPosForPopupEx(frame_bb.GetBL(),
                                    size_expected, lastAutoPos,
                                    r_outer, frame_bb,
                                    PopupPositionPolicy.ComboBox);
                popup_win.AutoPosLastDirection = lastAutoPos.get();
                this.SetNextWindowPos(pos);
            }
        }

        // Horizontally align ourselves with the framed text
        let window_flags = WindowFlags.AlwaysAutoResize | WindowFlags.Popup |
                           WindowFlags.NoTitleBar | WindowFlags.NoResize |
                           WindowFlags.NoSavedSettings;
        this.PushStyleVar("WindowPadding", new Vec2(style.FramePadding.x, style.WindowPadding.y));
        let ret = this.Begin(name, null, window_flags);
        this.PopStyleVar();
        if (!ret)
        {
            this.EndPopup();
            console.assert(0);
            // This should never happen as we tested for IsPopupOpen() above
            return false;
        }
        return true;
    },

    // only call EndCombo() if BeginCombo() returns true!
    EndCombo()
    {
        this.EndPopup();
    },

    Combo(label, current_item, items, maxItems=-1, onChange)
    {
        let g = this.guictx;
        if(typeof(maxItems) == "function" && onChange==undefined)
        {
            onChange = maxItems;
            maxItems = -1;
        }
        console.assert(typeof(maxItems)=="number");
        let getter = function(i) {
            return items[i];
        };
        return this.ComboCB(label, current_item, getter, items.length,
                            maxItems, onChange);
    },

    // Old API, prefer using BeginCombo() nowadays if you can.
    ComboCB(label, current_item, getter, numItems, maxItems=-1, onChange)
    {
        let g = this.guictx;
        let item = current_item < 0 ? null : getter(current_item);
        console.assert(typeof(maxItems)=="number");

        // This old Combo() API exposed "popup_max_height_in_items". The new
        // more general BeginCombo() API doesn't have/need it, but we emulate it here.
        if (maxItems != -1 && !g.NextWindowData.SizeConstraintCond)
        {
            let h = this.calcMaxPopupHeightFromItemCount(maxItems);
            this.SetNextWindowSizeConstraints(new Vec2(0,0),
                                              new Vec2(Number.MAX_VALUE, h));
        }
        let value_changed = false;
        if(!this.BeginCombo(label, item!=undefined?item.toString():""))
            return value_changed;
        for (let i = 0; i < numItems; i++)
        {
            let iitem = getter(i);
            this.PushID(i);
            const item_selected = (i == current_item);
            let item_text;
            if (iitem == null || iitem == undefined)
                item_text = "*Unknown item*";
            else
                item_text = iitem.toString();
            if (this.Selectable(item_text, item_selected))
            {
                value_changed = true;
                current_item = i;
            }
            if (item_selected)
                this.SetItemDefaultFocus();
            this.PopID();
        }
        this.EndCombo();
        if(value_changed && onChange)
            onChange(current_item);
        return value_changed;
    },

    calcMaxPopupHeightFromItemCount(items_count)
    {
        let g = this.guictx;
        if (items_count <= 0)
            return Number.MAX_VALUE;
        return (g.FontLineHeight + g.Style.ItemSpacing.y) * items_count -
            g.Style.ItemSpacing.y + (g.Style.WindowPadding.y * 2);
    }
};