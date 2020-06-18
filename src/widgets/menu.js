import {Dir, LayoutType, NavForward, NavLayer} from "../enums.js";
import {Vec1, Vec2, Rect} from "../types.js";
import {CondFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {SelectableFlags} from "./selectable.js";
import {TriangleContainsPoint} from "../geoutil.js";

//-------------------------------------------------------------------------
// [SECTION] MenuItem, BeginMenu, EndMenu, etc.
//-------------------------------------------------------------------------
// - ImGuiMenuColumns [Internal]
// - BeginMainMenuBar()
// - EndMainMenuBar()
// - BeginMenuBar()
// - EndMenuBar()
// - BeginMenu()
// - EndMenu()
// - MenuItem()
//-------------------------------------------------------------------------

/**
 * Used to track three columns associated with menu:
 *    0: label offset
 *    1: hot-key text (optional)
 *    2: selected checkbox (or pullaside) (optional)
 */
export class MenuColumns
{
    constructor()
    {
        this.Spacing = 0;
        this.Width = 0;
        this.NextWidth = 0;
        this.Pos = [0, 0, 0];
        this.NextWidths = [0, 0, 0];
    }

    Update(count, spacing, clear)
    {
        this.Pos.length = count;
        this.NextWidths.length = count;
        this.Width = 0;
        this.NextWidth = 0;
        this.Spacing = spacing;
        if(clear)
            this.NextWidths = [0, 0, 0];
        for(let i=0;i<this.Pos.length;i++)
        {
            if(i > 0 && this.NextWidths[i] > 0)
                this.Width += this.Spacing;
            this.Pos[i] = Math.floor(this.Width);
            this.Width += this.NextWidths[i];
            this.NextWidths[i] = 0;
        }
    }

    DeclColumns(w0, w1, w2)
    {
        this.NextWidth = 0.;
        this.NextWidths[0] = Math.max(this.NextWidths[0], w0);
        this.NextWidths[1] = Math.max(this.NextWidths[1], w1);
        this.NextWidths[2] = Math.max(this.NextWidths[2], w2);
        for (let i=0; i<this.Pos.length; i++)
        {
            this.NextWidth += this.NextWidths[i] +
                ((i > 0 && this.NextWidths[i] > 0.) ? this.Spacing : 0.);
        }
        return Math.max(this.Width, this.NextWidth);
    }

    CalcExtraSpace(availW)
    {
        return Math.max(0, availW - this.Width);
    }
}

export var ImguiMenuMixin =
{
    BeginMainMenuBar()
    {
        let g = this.guictx;
        g.NextWindowData.MenuBarOffsetMinVal =
            new Vec2(g.Style.DisplaySafeAreaPadding.x,
                Math.max(g.Style.DisplaySafeAreaPadding.y - g.Style.FramePadding.y, 0));
        this.SetNextWindowPos(new Vec2(0, 0));
        this.SetNextWindowSize(new Vec2(g.IO.DisplaySize.x,
            g.NextWindowData.MenuBarOffsetMinVal.y + g.FontBaseSize + g.Style.FramePadding.y));
        this.PushStyleVar("WindowRounding", 0);
        this.PushStyleVar("WindowMinSize", Vec2.Zero());
        let window_flags = WindowFlags.NoTitleBar | WindowFlags.NoResize |
                        WindowFlags.NoMove | WindowFlags.NoScrollbar |
                        WindowFlags.NoSavedSettings | WindowFlags.MenuBar;
        let is_open = this.Begin("##MainMenuBar", null, window_flags) && this.BeginMenuBar();
        this.PopStyleVar(2);
        g.NextWindowData.MenuBarOffsetMinVal = new Vec2(0, 0);
        if (!is_open)
        {
            this.End();
            return false;
        }
        return true; //-V1020
    },

    EndMainMenuBar()
    {
        this.EndMenuBar();

        // When the user has left the menu layer (typically: closed menus through
        // activation of an item), we restore focus to the previous window
        let g = this.guictx;
        if (g.CurrentWindow == g.NavWindow && g.NavLayer == 0)
            this.focusPreviousWindowIgnoringOne(g.NavWindow);
        this.End();
    },

    BeginMenuBar()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        if (!(win.Flags & WindowFlags.MenuBar))
            return false;

        console.assert(!win.DC.MenuBarAppending);
        this.BeginGroup(); // Backup position on layer 0
        this.PushID("##menubar");

        // We don't clip with current window clipping rectangle as it is already
        // set to the area below. However we clip with window full rect.
        // We remove 1 worth of rounding to max.x to that text in long menus
        // and small windows don't tend to display over the lower-right rounded
        // area, which looks particularly glitchy.
        let bar_rect = win.MenuBarRect();
        let clip_rect = Rect.FromXY(
            Math.floor(bar_rect.Min.x + 0.5),
            Math.floor(bar_rect.Min.y + win.WindowBorderSize + 0.5),
            Math.floor(Math.max(bar_rect.Min.x, bar_rect.Max.x - win.WindowRounding) + 0.5),
            Math.floor(bar_rect.Max.y + 0.5));
        clip_rect.ClipWith(win.OuterRectClipped);
        this.PushClipRect(clip_rect.Min, clip_rect.Max, false);

        win.DC.CursorPos = new Vec2(bar_rect.Min.x + win.DC.MenuBarOffset.x,
                                    bar_rect.Min.y + win.DC.MenuBarOffset.y);
        win.DC.LayoutType = LayoutType.Horizontal;
        win.DC.NavLayerCurrent = NavLayer.Menu;
        win.DC.NavLayerCurrentMask = (1 << NavLayer.Menu);
        win.DC.MenuBarAppending = true;
        this.AlignTextToFramePadding();
        return true;
    },

    EndMenuBar()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;
        let g = this.guictx;

        // Nav: When a move request within one of our child menu failed, capture
        // the request to navigate among our siblings.
        if (this.navMoveRequestButNoResultYet() &&
            (g.NavMoveDir == Dir.Left || g.NavMoveDir == Dir.Right) &&
            (g.NavWindow.Flags & WindowFlags.ChildMenu))
        {
            let nav_earliest_child = g.NavWindow;
            while (nav_earliest_child.ParentWindow &&
                    (nav_earliest_child.ParentWindow.Flags & WindowFlags.ChildMenu))
            {
                nav_earliest_child = nav_earliest_child.ParentWindow;
            }
            if (nav_earliest_child.ParentWindow == win &&
                nav_earliest_child.DC.ParentLayoutType == LayoutType.Horizontal &&
                g.NavMoveRequestForward == NavForward.None)
            {
                // To do so we claim focus back, restore NavId and then process
                // the movement request for yet another frame. This involve a
                // one-frame delay which isn't very problematic in this situation.
                // We could remove it by scoring in advance for multiple window
                // (probably not worth the hassle/cost)
                console.assert(win.DC.NavLayerActiveMaskNext & 0x02); // Sanity check
                this.FocusWindow(win);
                this.setNavIDWithRectRel(win.NavLastIds[1], 1, win.NavRectRel[1]);
                g.NavLayer = NavLayer.Menu;
                // Hide highlight for the current frame so we don't see the
                // intermediary selection.
                g.NavDisableHighlight = true;
                g.NavMoveRequestForward = NavForward.ForwardQueued;
                this.navMoveRequestCancel();
            }
        }

        console.assert(win.Flags & WindowFlags.MenuBar);
        console.assert(win.DC.MenuBarAppending);
        this.PopClipRect();
        this.PopID();
        // Save horizontal position so next append can reuse it. This is kinda
        // equivalent to a per-layer CursorPos.
        win.DC.MenuBarOffset.x = win.DC.CursorPos.x - win.MenuBarRect().Min.x;
        let grp = win.DC.GroupStack[win.DC.GroupStack.length-1];
        grp.AdvanceCursor = false;
        this.EndGroup(); // Restore position on layer 0
        win.DC.LayoutType = LayoutType.Vertical;
        win.DC.NavLayerCurrent = NavLayer.Main;
        win.DC.NavLayerCurrentMask = (1 << NavLayer.Main);
        win.DC.MenuBarAppending = false;
    },

    BeginMenu(label, enabled=true)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        let style = g.Style;
        const id = win.GetID(label);

        let label_size = this.CalcTextSize(label, true);
        let pressed;
        let menu_is_open = this.isPopupOpen(id);
        let menuset_is_open = !(win.Flags & WindowFlags.Popup) &&
                        (g.OpenPopupStack.length > g.BeginPopupStack.length &&
                        g.OpenPopupStack[g.BeginPopupStack.length].OpenParentId ==
                            win.IDStack[win.IDStack.length-1]);
        let backed_nav_window = g.NavWindow;
        if (menuset_is_open)
        {
            // Odd hack to allow hovering across menus of a same menu-set
            // (otherwise we wouldn't be able to hover parent)
            g.NavWindow = win;
        }

        // The reference position stored in popup_pos will be used by Begin()
        // to find a suitable position for the child menu, However the final
        // position is going to be different! It is choosen by FindBestWindowPosForPopup().
        // e.g. Menus tend to overlap each other horizontally to amplify relative Z-ordering.
        let popup_pos, pos = win.DC.CursorPos.Clone();
        if (win.DC.LayoutType == LayoutType.Horizontal)
        {
            // Menu inside an horizontal menu bar
            // Selectable extend their highlight by half ItemSpacing in each direction.
            // For ChildMenu, the popup position will be overwritten by the call
            // to FindBestWindowPosForPopup() in Begin()
            popup_pos = new Vec2(pos.x - 1 - Math.floor(style.ItemSpacing.x * 0.5),
                                pos.y - style.FramePadding.y + win.MenuBarHeight());
            win.DC.CursorPos.x += Math.floor(style.ItemSpacing.x * 0.5);
            this.PushStyleVar("ItemSpacing", Vec2.Mult(style.ItemSpacing, 2.));
            let w = label_size.x;
            pressed = this.Selectable(label, menu_is_open,
                            SelectableFlags.NoHoldingActiveID |
                            SelectableFlags.PressedOnClick |
                            SelectableFlags.DontClosePopups |
                            (!enabled ? SelectableFlags.Disabled : 0),
                            new Vec2(w, 0));
            this.PopStyleVar();
            win.DC.CursorPos.x += Math.floor(style.ItemSpacing.x * (-1. + 0.5));
            // -1 spacing to compensate the spacing added when Selectable() did
            // a SameLine(). It would also work to call SameLine() ourselves after
            // the PopStyleVar().
        }
        else
        {
            // Menu inside a menu
            popup_pos = new Vec2(pos.x, pos.y - style.WindowPadding.y);
            let w = win.MenuColumns.DeclColumns(label_size.x, 0,
                                            Math.floor(g.FontSize * 1.2));
                                            // Feedback to next frame
            let extra_w = Math.max(0., this.GetContentRegionAvail().x - w);
            pressed = this.Selectable(label, menu_is_open,
                            SelectableFlags.NoHoldingActiveID |
                            SelectableFlags.PressedOnClick |
                            SelectableFlags.DontClosePopups |
                            SelectableFlags.DrawFillAvailWidth |
                            (!enabled ? SelectableFlags.Disabled : 0),
                            new Vec2(w, 0));
            if (!enabled)
                this.PushStyleColor("Text", g.Style.Colors["TextDisabled"]);
            this.renderArrow(Vec2.AddXY(pos,
                        win.MenuColumns.Pos[2] + extra_w + g.FontSize * 0.30, 0.),
                        Dir.Right);
            if (!enabled)
                this.PopStyleColor();
        }

        const hovered = enabled && this.itemHoverable(win.DC.LastItemRect, id);
        if (menuset_is_open)
            g.NavWindow = backed_nav_window;

        let want_open = false, want_close = false;
        if (win.DC.LayoutType == LayoutType.Vertical) // (win.Flags & (WindowFlags.Popup|WindowFlags.ChildMenu))
        {
            // Implement http://bjk5.com/post/44698559168/breaking-down-amazons-mega-dropdown
            // to avoid using timers, so menus feels more reactive.
            let inOpenTri = false;
            if (g.HoveredWindow == win &&
                g.OpenPopupStack.length > g.BeginPopupStack.length &&
                g.OpenPopupStack[g.BeginPopupStack.length].ParentWindow == win &&
                !(win.Flags & WindowFlags.MenuBar))
            {
                let next_window = g.OpenPopupStack[g.BeginPopupStack.length].Window;
                if (next_window)
                {
                    // FIXME-DPI: Values should be derived from a master "scale" factor.
                    let next_window_rect = next_window.Rect();
                    let ta = Vec2.Subtract(g.IO.MousePos, g.IO.MouseDelta);
                    let tb = (win.Pos.x < next_window.Pos.x) ?
                            next_window_rect.GetTL() : next_window_rect.GetTR();
                    let tc = (win.Pos.x < next_window.Pos.x) ?
                            next_window_rect.GetBL() : next_window_rect.GetBR();
                    let extra = Vec1.Clamp(Math.abs(ta.x - tb.x) * 0.3, 5., 30.); // add a bit of extra slack.
                    ta.x += (win.Pos.x < next_window.Pos.x) ? -0.5 : +0.5;    // to avoid numerical issues
                    tb.y = ta.y + Math.max((tb.y - extra) - ta.y, -100.);
                    // triangle is maximum 200 high to limit the slope and the bias
                    // toward large sub-menus // FIXME: Multiply by fb_scale?
                    tc.y = ta.y + Math.min((tc.y + extra) - ta.y, +100.);
                    inOpenTri = TriangleContainsPoint(ta, tb, tc, g.IO.MousePos);
                    // win.DrawList.PushClipRectFullScreen();
                    // win.DrawList.AddTriangleFilled(ta, tb, tc, inOpenTri ? IM_COL32(0,128,0,128) : IM_COL32(128,0,0,128));
                    // win.DrawList.PopClipRect(); // Debug
                }
            }

            want_close = (menu_is_open && !hovered && g.HoveredWindow == win &&
                    g.HoveredIdPreviousFrame != 0 && g.HoveredIdPreviousFrame != id &&
                    !inOpenTri);
            want_open = (!menu_is_open && hovered && !inOpenTri) ||
                    (!menu_is_open && hovered && pressed);

            if (g.NavActivateId == id)
            {
                want_close = menu_is_open;
                want_open = !menu_is_open;
            }
            if (g.NavId == id && g.NavMoveRequest && g.NavMoveDir == Dir.Right) // Nav-Right to open
            {
                want_open = true;
                this.navMoveRequestCancel();
            }
        }
        else
        {
            // Menu bar
            // Click an open menu again to close it
            if (menu_is_open && pressed && menuset_is_open)
            {
                want_close = true;
                want_open = menu_is_open = false;
            }
            else
            // First click to open, then hover to open others
            if (pressed || (hovered && menuset_is_open && !menu_is_open))
            {
                want_open = true;
            }
            else
            if (g.NavId == id && g.NavMoveRequest && g.NavMoveDir == Dir.Down) // Nav-Down to open
            {
                want_open = true;
                this.navMoveRequestCancel();
            }
        }

        if (!enabled)
        {
            // explicitly close if an open menu becomes disabled, facilitate users
            // code a lot in pattern such as
            //  'if (BeginMenu("options", has_object)) { ..use object.. }'
            want_close = true;
        }
        if (want_close && this.isPopupOpen(id))
            this.closePopupToLevel(g.BeginPopupStack.length, true);

        if (!menu_is_open && want_open &&
            g.OpenPopupStack.length > g.BeginPopupStack.length)
        {
            // Don't recycle same menu level in the same frame, first close the other menu and yield for a frame.
            this.OpenPopup(label);
            return false;
        }

        menu_is_open |= want_open;
        if (want_open)
            this.OpenPopup(label);

        if (menu_is_open)
        {
            // Sub-menus are ChildWindow so that mouse can be hovering across them
            // (otherwise top-most popup menu would steal focus and not allow hovering
            // on parent menu)
            this.SetNextWindowPos(popup_pos, CondFlags.Always);
            let flags = WindowFlags.ChildMenu | WindowFlags.AlwaysAutoResize |
                        WindowFlags.NoMove | WindowFlags.NoTitleBar |
                        WindowFlags.NoSavedSettings | WindowFlags.NoNavFocus;
            if (win.Flags & (WindowFlags.Popup|WindowFlags.ChildMenu))
                flags |= WindowFlags.ChildWindow;
            // menu_is_open can be 'false' when the popup is completely clipped
            // (e.g. zero size display)
            menu_is_open = this.beginPopupEx(id, flags);
        }
        return menu_is_open;
    },

    EndMenu()
    {
        // Nav: When a left move request _within our child menu_ failed, close ourselves (the _parent_ menu).
        // A menu doesn't close itself because EndMenuBar() wants the catch the last Left<>Right inputs.
        // However, it means that with the current code, a BeginMenu() from outside another menu or a menu-bar won't be closable with the Left direction.
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (g.NavWindow && g.NavWindow.ParentWindow == win &&
            g.NavMoveDir == Dir.Left && this.navMoveRequestButNoResultYet() &&
            win.DC.LayoutType == LayoutType.Vertical)
        {
            this.closePopupToLevel(g.BeginPopupStack.length, true);
            this.navMoveRequestCancel();
        }
        this.EndPopup();
    },

    /**
    * 
    * @param {*} label 
    * @param {*} shortcut 
    * @param {*} selected 
    * @param {*} enabled 
    * 
    * return true when activated. shortcuts are displayed for convenience but
    * not processed by ImGui at the moment. 'selected' can be either a
    * boolean or a ValRef.
    */
    MenuItem(label, shortcut=null, selected=false, enabled=true)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        let style = g.Style;
        let pos = win.DC.CursorPos.Clone();
        let label_size = this.CalcTextSize(label, true);
        let flags = SelectableFlags.PressedOnRelease | (enabled ? 0 : SelectableFlags.Disabled);
        let pressed;
        if (win.DC.LayoutType == LayoutType.Horizontal)
        {
            // Mimic the exact layout spacing of BeginMenu() to allow MenuItem()
            // inside a menu bar, which is a little misleading but may be useful
            // Note that in this situation we render neither the shortcut neither o
            // the selected tick mark
            let w = label_size.x;
            win.DC.CursorPos.x += Math.floor(style.ItemSpacing.x * 0.5);
            this.PushStyleVar("ItemSpacing", style.ItemSpacing * 2.);
            pressed = this.Selectable(label, false, flags, new Vec2(w, 0));
            this.PopStyleVar();
            // -1 spacing to compensate the spacing added when Selectable() did a
            // SameLine(). It would also work to call SameLine() ourselves after
            // the PopStyleVar().
            win.DC.CursorPos.x += Math.floor(style.ItemSpacing.x * (-1.+ 0.5));
        }
        else
        {
            // Vertical menu
            let shortcut_size = shortcut ? this.CalcTextSize(shortcut) : Vec2.Zero();
            let w = win.MenuColumns.DeclColumns(label_size.x, shortcut_size.x,
                                                    Math.floor(g.FontSize * 1.2)); // Feedback for next frame
            let extra_w = Math.max(0., this.GetContentRegionAvail().x - w);
            pressed = this.Selectable(label, false, flags | SelectableFlags.DrawFillAvailWidth,
                                new Vec2(w, 0.0));
            if (shortcut_size.x > 0.)
            {
                this.PushStyleColor("Text", g.Style.Colors["TextDisabled"]);
                this.renderText(Vec2.AddXY(pos, win.MenuColumns.Pos[1] + extra_w, 0),
                                shortcut, false);
                this.PopStyleColor();
            }

            let sel = typeof(selected) === "boolean" ? selected : selected.get();
            if (sel)
            {
                this.renderCheckMark(Vec2.AddXY(pos,
                                                win.MenuColumns.Pos[2]+extra_w+g.FontSize*0.4,
                                                g.FontLineHeight * 0.134 * 0.5),
                                        g.Style.GetColor(enabled ? "Text" : "TextDisabled"),
                                        g.FontSize  * 0.866);
            }
        }
        if(pressed && typeof(selected) !== "boolean")
        {
            // pressed means toggle
            selected.set(!selected.get());
        }
        return pressed;
    }
}; // end mixin