// - Widgets/scrollbar() [Internal]
import {Rect, Vec2, Vec1, ValRef} from "../types.js";
import {Axis} from "../enums.js";
import {CornerFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {ButtonFlags} from "./button.js";

let sLockedScroll = {}; // indexed by window id
export var ImguiScrollbarMixin =
{
    // Vertical/Horizontal scrollbar
    //
    // The entire piece of code below is rather confusing because:
    // - We handle absolute seeking (when first clicking outside the grab) and
    //   relative manipulation (afterward or when clicking inside the grab)
    // - We store values as normalized ratio and in a form that allows the
    //   window content to change while we are holding on a scrollbar
    // - We handle both horizontal and vertical scrollbars, which makes the
    //   terminology not ideal.
    scrollbar(axis)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;

        const horizontal = (axis == Axis.X);
        const style = g.Style;
        const id = this.getScrollbarID(win, axis);
        this.keepAliveID(id);

        // Render background
        let other_scrollbar = (horizontal ? win.ScrollbarY : win.ScrollbarX);
        let other_scrollbar_size_w = other_scrollbar ? style.ScrollbarSize : 0;
        const window_rect = win.Rect();
        const border_size = win.WindowBorderSize;
        let bb = horizontal ?
                Rect.FromXY(win.Pos.x + border_size,
                            window_rect.Max.y - style.ScrollbarSize,
                            window_rect.Max.x - other_scrollbar_size_w - border_size,
                            window_rect.Max.y - border_size) :
                Rect.FromXY(window_rect.Max.x - style.ScrollbarSize,
                            win.Pos.y + border_size,
                            window_rect.Max.x - border_size,
                            window_rect.Max.y - other_scrollbar_size_w - border_size);
        if (!horizontal)
        {
            bb.Min.y += win.TitleBarHeight() +
                ((win.Flags & WindowFlags.MenuBar) ? win.MenuBarHeight() : 0.);
        }

        const bb_height = bb.GetHeight();
        if (bb.GetWidth() <= 0 || bb_height <= 0)
            return;

        // When we are too small, start hiding and disabling the grab (this
        // reduce visual noise on very small window and facilitate using the
        // resize grab)
        let alpha = 1.;
        if ((axis == Axis.Y) && bb_height < g.FontLineHeight + g.Style.FramePadding.y * 2.)
        {
            alpha = Vec1.Saturate((bb_height - g.FontLineHeight) / (g.Style.FramePadding.y * 2));
            if (alpha <= 0.) return;
        }
        const allow_interaction = (alpha >= 1.);
        let window_rounding_corners;
        if (horizontal)
        {
            window_rounding_corners = CornerFlags.BotLeft |
                                (other_scrollbar ? 0 : CornerFlags.BotRight);
        }
        else
        {
            window_rounding_corners = (((win.Flags & WindowFlags.NoTitleBar) &&
                                        !(win.Flags & WindowFlags.MenuBar)) ?
                                        CornerFlags.TopRight : 0) |
                                    (other_scrollbar ? 0 : CornerFlags.BotRight);
        }
        win.DrawList.AddRectFilled(bb.Min, bb.Max, style.GetColor("ScrollbarBg"),
                            win.WindowRounding, window_rounding_corners);
        bb.expandXY(-Vec1.Clamp(Math.floor((bb.GetWidth() - 2) * 0.5), 0, 2),
                    -Vec1.Clamp(Math.floor((bb.GetHeight() - 2) * 0.5), 0, 2));

        // V denote the main, longer axis of the scrollbar (= height for a vertical scrollbar)
        let scrollbar_size_v = horizontal ? bb.GetWidth() : bb.GetHeight();
        let scroll_v = horizontal ? win.Scroll.x : win.Scroll.y;
        let win_size_avail_v = (horizontal ? win.SizeFull.x : win.SizeFull.y)
                                - other_scrollbar_size_w;
        let win_size_contents_v = horizontal ? win.SizeContents.x : win.SizeContents.y;

        // Calculate the height of our grabbable box. It generally represent
        // the amount visible (vs the total scrollable amount) But we maintain
        // a minimum size in pixel to allow for the user to still aim inside.
        // Adding this assert to check if the ImMax(XXX,1.0f) is still needed.
        // PLEASE CONTACT ME if this triggers.
        console.assert(Math.max(win_size_contents_v, win_size_avail_v) > 0.);
        const win_size_v = Math.max(win_size_contents_v, win_size_avail_v, 1);
        const grab_h_pixels = Vec1.Clamp(scrollbar_size_v * (win_size_avail_v / win_size_v),
                                    style.GrabMinSize, scrollbar_size_v);
        const grab_h_norm = grab_h_pixels / scrollbar_size_v;

        // Handle input right away. None of the code of Begin() is relying on
        // scrolling position before calling Scrollbar().
        let held = new ValRef(false);
        let hovered = new ValRef(false);
        const previously_held = (g.ActiveId == id);
        this.ButtonBehavior(bb, id, hovered, held, ButtonFlags.NoNavFocus);

        let scroll_max = Math.max(1, win_size_contents_v - win_size_avail_v);
        let scroll_ratio = Vec1.Saturate(scroll_v / scroll_max);
        let grab_v_norm = scroll_ratio * (scrollbar_size_v - grab_h_pixels) / scrollbar_size_v;
        if (held.get() && allow_interaction && grab_h_norm < 1)
        {
            let scrollbar_pos_v = horizontal ? bb.Min.x : bb.Min.y;
            let mouse_pos_v = horizontal ? g.IO.MousePos.x : g.IO.MousePos.y;
            let apply, getval;
            if(horizontal)
            {
                apply = function(delta) { g.ScrollbarClickDeltaToGrabCenter.x = delta; };
                getval = function() { return g.ScrollbarClickDeltaToGrabCenter.x; };
            }
            else
            {
                apply = function(delta) { g.ScrollbarClickDeltaToGrabCenter.y = delta; };
                getval = function() { return g.ScrollbarClickDeltaToGrabCenter.y; };
            }

            // Click position in scrollbar normalized space (0.0f->1.0f)
            const clicked_v_norm = Vec1.Saturate((mouse_pos_v - scrollbar_pos_v) / scrollbar_size_v);
            this.setHoveredID(id);

            let seek_absolute = false;
            if (!previously_held)
            {
                if(win.Flags & WindowFlags.LockScrollingContentSize)
                {
                    // console.info("begin locked scroll");
                    sLockedScroll[id] = win_size_contents_v;
                }
                // On initial click calculate the distance between mouse and the
                // center of the grab
                if (clicked_v_norm >= grab_v_norm &&
                    clicked_v_norm <= grab_v_norm + grab_h_norm)
                {
                    apply(clicked_v_norm - grab_v_norm - grab_h_norm*0.5);
                }
                else
                {
                    seek_absolute = true;
                    apply(0.0);
                }
            }
            else
            if(win.Flags & WindowFlags.LockScrollingContentSize)
            {
                scroll_max = Math.max(1, sLockedScroll[id] - win_size_avail_v);
                scroll_ratio = Vec1.Saturate(scroll_v / scroll_max);
                grab_v_norm = scroll_ratio * (scrollbar_size_v - grab_h_pixels) / scrollbar_size_v;
            }
            // Apply scroll
            // It is ok to modify Scroll here because we are being called in
            // Begin() after the calculation of SizeContents and before setting
            // up our starting position
            let v = (clicked_v_norm - getval() - grab_h_norm*0.5) / (1. - grab_h_norm);
            const scroll_v_norm = Vec1.Saturate(v);
            //(win_size_contents_v - win_size_v));
            scroll_v = Math.floor(0.5 + scroll_v_norm * scroll_max);
            if (horizontal)
                win.Scroll.x = scroll_v;
            else
                win.Scroll.y = scroll_v;

            // Update values for rendering
            scroll_ratio = Vec1.Saturate(scroll_v / scroll_max);
            grab_v_norm = scroll_ratio * (scrollbar_size_v - grab_h_pixels) / scrollbar_size_v;

            // Update distance to grab now that we have seeked and saturated
            if (seek_absolute)
                apply(clicked_v_norm - grab_v_norm - grab_h_norm*0.5);
        }
        else
            sLockedScroll[id] = 0;

        // Render grab
        const grab_col = style.GetColor(held.get() ? "ScrollbarGrabActive" :
                                    hovered.get() ? "ScrollbarGrabHovered" :
                                    "ScrollbarGrab", alpha);
        let grab_rect = null, min;
        if (horizontal)
        {
            min = Vec1.Lerp(bb.Min.x, bb.Max.x, grab_v_norm);
            grab_rect = Rect.FromXY(
                            min, bb.Min.y,
                            Math.min(min + grab_h_pixels, window_rect.Max.x),
                            bb.Max.y);
        }
        else
        {
            min = Vec1.Lerp(bb.Min.y, bb.Max.y, grab_v_norm);
            grab_rect = Rect.FromXY(
                            bb.Min.x, min,
                            bb.Max.x,
                            Math.min(min + grab_h_pixels, window_rect.Max.y));
        }
        win.DrawList.AddRectFilled(grab_rect.Min, grab_rect.Max, grab_col,
                                    style.ScrollbarRounding);
    },

    getScrollbarID(win, axis)
    {
        return win.GetIDNoKeepAlive(axis == Axis.X ? "#SCROLLX" : "#SCROLLY");
    }

}; // end mixin