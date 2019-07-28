import {CondFlags, ConfigFlags, HoveredFlags, NavMoveFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {Dir} from "../enums.js";
import {Rect, ValRef, Vec2} from "../types.js";

export var PopupPositionPolicy = // enum
{
    Default: 0,
    ComboBox: 1
};

export class PopupRef
{
    constructor()
    {
        // Resolved on BeginPopup() - may stay unresolved if user never calls OpenPopup()
        this.Window = null;

        // Set on OpenPopup
        this.PopupId = -1;   // ImGuiID
        this.ParentWindow = null;
        this.OpenFrameCount = -1;
        this.OpenParentId = -1; // we need this to differentiate multiple menu
                                // sets from each others (e.g. inside menu bar vs
                                // loose menu items)
        this.OpenPopupPos = null; // Vec2, preferred popup position (typically ==
                                  // OpenMousePos when using mouse)
        this.OpenMousePos = null; // copy of mouse position at the time of opening popup
    }
}

export var ImguiPopupMixin =
{
    // The properties of popups windows are:
    // - They block normal mouse hovering detection outside them. (*)
    // - Unless modal, they can be closed by clicking anywhere outside them, or
    //   by pressing ESCAPE.
    // - Their visibility state (~bool) is held internally by imgui instead of
    //   being held by the programmer as we are used to with regular Begin() calls.
    // User can manipulate the visibility state by calling OpenPopup().
    // (*) One can use IsItemHovered(ImGuiHoveredFlags_AllowWhenBlockedByPopup)
    //  to bypass it and detect hovering even when normally blocked by a popup.
    // Those three properties are connected. The library needs to hold their
    //  visibility state because it can close popups at any time.

    // call to mark popup as open (don't call every frame!). popups are closed
    // when user click outside, or if CloseCurrentPopup() is called within a
    // BeginPopup()/EndPopup() block. By default, Selectable()/MenuItem() are
    // calling CloseCurrentPopup(). Popup identifiers are relative to the current
    // ID-stack (so OpenPopup and BeginPopup needs to be at the same level).
    OpenPopup(str_id)
    {
        this.openPopupEx(this.guictx.CurrentWindow.GetID(str_id));
    },

    // return true if the popup is open, and you can start outputting to it.
    // only call EndPopup() if BeginPopup() returns true!
    BeginPopup(str_id, flags=0)
    {
        let g = this.guictx;
        if (g.OpenPopupStack.length <= g.BeginPopupStack.length) // Early out for performance
        {
            // We behave like Begin() and need to consume those values
            g.NextWindowData.Clear();
            return false;
        }
        flags |= WindowFlags.AlwaysAutoResize | WindowFlags.NoTitleBar |
                 WindowFlags.NoSavedSettings;
        return this.beginPopupEx(g.CurrentWindow.GetID(str_id), flags);
    },

    // modal dialog (regular window with title bar, block interactions behind
    // the modal window, can't close the modal window by clicking outside)
    BeginPopupModal(name, p_open, flags=0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        const id = win.GetID(name);
        if (!this.isPopupOpen(id))
        {
            // We behave like Begin() and need to consume those values
            g.NextWindowData.Clear();
            return false;
        }

        // Center modal windows by default
        // FIXME: Should test for (PosCond & window->SetWindowPosAllowFlags)
        // with the upcoming window.
        if (g.NextWindowData.PosCond == 0)
            this.SetNextWindowPos(Vec2.Mult(g.IO.DisplaySize, 0.5),
                                CondFlags.Appearing, new Vec2(0.5, 0.5));

        flags |= WindowFlags.Popup | WindowFlags.Modal |
                 WindowFlags.NoCollapse | WindowFlags.NoSavedSettings;
        const is_open = this.Begin(name, p_open, flags);
        // NB: is_open can be 'false' when the popup is completely clipped
        // (e.g. zero size display)
        if (!is_open || (p_open && !p_open.get()))
        {
            this.EndPopup();
            if (is_open)
                this.closePopupToLevel(g.BeginPopupStack.length, true);
            return false;
        }
        return is_open;
    },

    // only call EndPopup() if BeginPopupXXX() returns true!
    EndPopup()
    {
        let g = this.guictx;
        console.assert(g.CurrentWindow.Flags & WindowFlags.Popup,
                        "Mismatched BeginPopup()/EndPopup() calls, length:"+
                        g.BeginPopupStack.length);

        // Make all menus and popups wrap around for now, may need to expose
        // that policy.
        this.navMoveRequestTryWrapping(g.CurrentWindow, NavMoveFlags.LoopY);

        this.End();
    },

    // helper to open and begin popup when clicked on last item. if you can
    // pass a NULL str_id only if the previous item had an id. If you want to
    // use that on a non-interactive item such as Text() you need to pass in
    // an explicit ID here. read comments in .cpp!
    BeginPopupContextItem(str_id, mouse_button=1)
    {
        let win = this.guictx.CurrentWindow;
        // If user hasn't passed an ID, we can use the LastItemID.
        // Using LastItemID as a Popup ID won't conflict!
        let id = str_id ? win.GetID(str_id) : win.DC.LastItemId;
        console.assert(id != 0, "You cannot pass a NULL str_id if the last item has no identifier (e.g. a Text() item)");
        if (this.IsMouseReleased(mouse_button) &&
            this.IsItemHovered(HoveredFlags.AllowWhenBlockedByPopup))
        {
            this.openPopupEx(id);
        }
        return this.beginPopupEx(id, WindowFlags.AlwaysAutoResize|
                                    WindowFlags.NoTitleBar|
                                    WindowFlags.NoSavedSettings);
    },

    // helper to open and begin popup when clicked on current window.
    BeginPopupContextWindow(str_id, mouse_button=1, also_over_items=true)
    {
        if (!str_id) str_id = "window_context";
        let id = this.guictx.CurrentWindow.GetID(str_id);
        if (this.IsMouseReleased(mouse_button) &&
            this.IsWindowHovered(HoveredFlags.AllowWhenBlockedByPopup))
        if (also_over_items || !this.IsAnyItemHovered())
            this.openPopupEx(id);
        return this.beginPopupEx(id, WindowFlags.AlwaysAutoResize|
                                     WindowFlags.NoTitleBar|
                                     WindowFlags.NoSavedSettings);
    },

    // helper to open and begin popup when clicked in void (where there are no
    // imgui windows).
    BeginPopupContextVoid(str_id, mouse_button=1)
    {
        if (!str_id) str_id = "void_context";
        let id = this.guictx.CurrentWindow.GetID(str_id);
        if (this.IsMouseReleased(mouse_button) &&
            !this.IsWindowHovered(HoveredFlags.AnyWindow))
        {
            this.openPopupEx(id);
        }
        return this.beginPopupEx(id, WindowFlags.AlwaysAutoResize|
                                     WindowFlags.NoTitleBar|
                                     WindowFlags.NoSavedSettings);
    },

    // helper to open popup when clicked on last item (note: actually
    // triggers on the mouse _released_ event to be consistent with
    // popup behaviors). return true when just opened.
    OpenPopupOnItemClick(str_id, mouse_button=1)
    {
        let win = this.guictx.CurrentWindow;
        if (this.IsMouseReleased(mouse_button) &&
            this.IsItemHovered(HoveredFlags.AllowWhenBlockedByPopup))
        {
            // If user hasn't passed an ID, we can use the LastItemID. Using
            // LastItemID as a Popup ID won't conflict!
            let id = str_id ? win.GetID(str_id) : win.DC.LastItemId;
            console.assert(id != 0,
                "You cannot pass a NULL str_id if the last item has no identifier (e.g. a Text() item");
            this.openPopupEx(id);
            return true;
        }
        return false;
    },

    // return true if the popup is open at the current begin-ed level of the
    // popup stack.
    IsPopupOpen(id)
    {
        if(typeof(id) == "string")
            return this.isPopupOpen(this.guictx.CurrentWindow.GetID(id));
        else
            return this.isPopupOpen(id);
    },

    // close the popup we have begin-ed into. clicking on a MenuItem or
    // Selectable automatically close the current popup.
    CloseCurrentPopup()
    {
        let g = this.guictx;
        let popup_idx = g.BeginPopupStack.length - 1;
        if (popup_idx < 0 || popup_idx >= g.OpenPopupStack.length ||
            g.BeginPopupStack[popup_idx].PopupId != g.OpenPopupStack[popup_idx].PopupId)
        {
            return;
        }

        // Closing a menu closes its top-most parent popup (unless a modal)
        while (popup_idx > 0)
        {
            let popup_window = g.OpenPopupStack[popup_idx].Window;
            let parent_popup_window = g.OpenPopupStack[popup_idx - 1].Window;
            let close_parent = false;
            if (popup_window && (popup_window.Flags & WindowFlags.ChildMenu))
            {
                if (parent_popup_window == null ||
                    !(parent_popup_window.Flags & WindowFlags.Modal))
                {
                    close_parent = true;
                }
            }
            if (!close_parent)
                break;
            popup_idx--;
        }
        //IMGUI_DEBUG_LOG("CloseCurrentPopup %d -> %d\n", g.BeginPopupStack.length - 1, popup_idx);
        this.closePopupToLevel(popup_idx, true);

        // A common pattern is to close a popup when selecting a menu
        // item/selectable that will open another window.  To improve this
        // usage pattern, we avoid nav highlight for a single frame in the
        // parent window. Similarly, we could avoid mouse hover highlight
        // in this window but it is less visually problematic.
        if (g.NavWindow)
            g.NavWindow.DC.NavHideHighlightOneFrame = true;
    },

    /* ----------------------------------------------------------------*/
    isPopupOpen(id)
    {
        let g = this.guictx;
        return g.OpenPopupStack.length > g.BeginPopupStack.length &&
               g.OpenPopupStack[g.BeginPopupStack.length].PopupId == id;
    },

    getFrontMostPopupModal()
    {
        let g = this.guictx;
        for (let n = g.OpenPopupStack.length-1; n >= 0; n--)
        {
            let popup = g.OpenPopupStack[n].Window;
            if (popup && popup.Flags & WindowFlags.Modal)
                    return popup;
        }
        return null;
    },

    // Mark popup as open (toggle toward open state).
    // Popups are closed when user click outside, or activate a pressable
    // item, or CloseCurrentPopup() is called within a BeginPopup()/EndPopup()
    // block. Popup identifiers are relative to the current ID-stack (so
    // OpenPopup and BeginPopup needs to be at the same level). One open
    // popup per level of the popup hierarchy (NB: when assigning we reset
    // the Window member of ImGuiPopupRef to NULL)
    openPopupEx(id)
    {
        let g = this.guictx;
        let parent_window = g.CurrentWindow;
        let current_stack_size = g.BeginPopupStack.length;
        let popup_ref = new PopupRef(); // Tagged as new ref as Window will be set
                                        // back to null if we write this into OpenPopupStack.
        popup_ref.PopupId = id;
        popup_ref.Window = null;
        popup_ref.ParentWindow = parent_window;
        popup_ref.OpenFrameCount = g.FrameCount;
        popup_ref.OpenParentId = parent_window.IDStack.back();
        popup_ref.OpenPopupPos = this.navCalcPreferredRefPos();
        popup_ref.OpenMousePos = this.IsMousePosValid(g.IO.MousePos) ?
                                    g.IO.MousePos : popup_ref.OpenPopupPos;

        //IMGUI_DEBUG_LOG("OpenPopupEx(0x%08X)\n", g.FrameCount, id);
        if (g.OpenPopupStack.length < current_stack_size + 1)
        {
            g.OpenPopupStack.push(popup_ref);
        }
        else
        {
            // Gently handle the user mistakenly calling OpenPopup() every frame.
            // It is a programming mistake! However, if we were to run the regular
            // code path, the ui would become completely unusable because the popup
            // will always be in hidden-while-calculating-size state _while_ claiming
            // focus. Which would be a very confusing situation for the programmer.
            // Instead, we silently allow the popup to proceed, it will keep
            // reappearing and the programming error will be more obvious to understand.
            if (g.OpenPopupStack[current_stack_size].PopupId == id &&
                g.OpenPopupStack[current_stack_size].OpenFrameCount == g.FrameCount - 1)
            {
                g.OpenPopupStack[current_stack_size].OpenFrameCount = popup_ref.OpenFrameCount;
            }
            else
            {
                // Close child popups if any, then flag popup for open/reopen
                g.OpenPopupStack.resize(current_stack_size + 1);
                g.OpenPopupStack[current_stack_size] = popup_ref;
            }

            // When reopening a popup we first refocus its parent, otherwise
            // if its parent is itself a popup it would get closed by
            // ClosePopupsOverWindow(). This is equivalent to what
            // closePopupToLevel() does.
            //if (g.OpenPopupStack[current_stack_size].PopupId == id)
            //    FocusWindow(parent_window);
        }
    },

    closePopupsOverWindow(refwin)
    {
        let g = this.guictx;
        if (g.OpenPopupStack.length == 0)
            return;

        // When popups are stacked, clicking on a lower level popups puts
        // focus back to it and close popups above it. Don't close our own
        // child popup windows.
        let popup_count_to_keep = 0;
        if (refwin)
        {
            // Find the highest popup which is a descendant of the reference
            // window (generally reference window = NavWindow)
            for (; popup_count_to_keep < g.OpenPopupStack.length; popup_count_to_keep++)
            {
                let popup = g.OpenPopupStack[popup_count_to_keep];
                if (!popup.Window)
                    continue;
                console.assert((popup.Window.Flags & WindowFlags.Popup) != 0);
                if (popup.Window.Flags & WindowFlags.ChildWindow)
                    continue;

                // Trim the stack if popups are not direct descendant of the
                // reference window (which is often the NavWindow)
                let popup_or_descendent_has_focus = false;
                for (let m = popup_count_to_keep;
                     m < g.OpenPopupStack.length && !popup_or_descendent_has_focus;
                     m++)
                {
                    if (g.OpenPopupStack[m].Window &&
                        g.OpenPopupStack[m].Window.RootWindow == refwin.RootWindow)
                    {
                        popup_or_descendent_has_focus = true;
                    }
                }
                if (!popup_or_descendent_has_focus)
                    break;
            }
        }
        // This test is not required but it allows to set a convenient
        // breakpoint on the statement below
        if (popup_count_to_keep < g.OpenPopupStack.length)
        {
            //IMGUI_DEBUG_LOG("ClosePopupsOverWindow(%s) -> closePopupToLevel(%d)\n", ref_window->Name, popup_count_to_keep);
            this.closePopupToLevel(popup_count_to_keep, false);
        }
    },

    closePopupToLevel(remaining, applyFocusToWindowUnder)
    {
        console.assert(remaining >= 0);
        let g = this.guictx;
        let focus_window = (remaining > 0) ?
            g.OpenPopupStack[remaining-1].Window : g.OpenPopupStack[0].ParentWindow;
        g.OpenPopupStack.length = remaining; // resize(remaining);

        // FIXME: This code is faulty and we may want to eventually to replace
        // or remove the 'apply_focus_to_window_under=true' path completely.
        // Instead of using g.OpenPopupStack[remaining-1].Window etc. we should
        // find the highest root window that is behind the popups we are closing.
        // The current code will set focus to the parent of the popup window
        // which is incorrect. It rarely manifested until now because
        // UpdateMouseMovingWindowNewFrame() would call FocusWindow() again on
        // the clicked window, leading to a chain of focusing A (clicked window)
        // then B (parent window of the popup) then A again. However if the
        // clicked window has the _NoMove flag set we would be left with B focused.
        // For now, we have disabled this path when called from ClosePopupsOverWindow()
        // because the users of ClosePopupsOverWindow() don't need to alter focus
        // anyway, but we should inspect and fix this properly.
        if (applyFocusToWindowUnder)
        {
            if (g.NavLayer == 0)
                focus_window = this.navRestoreLastChildNavWindow(focus_window);
            this.FocusWindow(focus_window);
        }
    },

    beginPopupEx(id, flags)
    {
        console.assert(typeof(id) != "string");
        let g = this.guictx;
        if (!this.isPopupOpen(id))
        {
            // We behave like Begin() and need to consume those values
            g.NextWindowData.Clear();
            return false;
        }

        let name;
        if (flags & WindowFlags.ChildMenu)
            name = `##Menu_${g.BeginPopupStack.length}`;
        else
            name = `##Popup_${id}`; // Not recycling, so we can close/open during the same frame

        let is_open = this.Begin(name, null, flags | WindowFlags.Popup);
        // NB: Begin can return false when the popup is completely clipped
        // (e.g. zero size display)
        if (!is_open)
            this.EndPopup();
        return is_open;
    },

    findBestWindowPosForPopup(win)
    {
        let g = this.guictx;
        let r_outer = this.getWindowAllowedExtentRect(win);
        if (win.Flags & WindowFlags.ChildMenu)
        {
            // Child menus typically request _any_ position within the parent
            // menu item, and then we move the new menu outside the parent bounds.
            // This is how we end up with child menus appearing (most-commonly)
            // on the right of the parent menu.
            console.assert(g.CurrentWindow == win);
            let parent_window = g.CurrentWindowStack[g.CurrentWindowStack.length - 2];
            // We want some overlap to convey the relative depth of each menu
            //(currently the amount of overlap is hard-coded to style.ItemSpacing.x).
            let horizontal_overlap = g.Style.ItemInnerSpacing.x;
            let r_avoid;
            if (parent_window.DC.MenuBarAppending)
            {
                r_avoid = new Rect(-Number.MAX_VALUE,
                            parent_window.Pos.y + parent_window.TitleBarHeight(),
                            Number.MAX_VALUE,
                            parent_window.Pos.y + parent_window.TitleBarHeight()
                            + parent_window.MenuBarHeight());
            }
            else
            {
                r_avoid = new Rect(parent_window.Pos.x + horizontal_overlap,
                                -Number.MAX_VALUE,
                                parent_window.Pos.x + parent_window.Size.x
                                - horizontal_overlap - parent_window.ScrollbarSizes.x,
                                Number.MAX_VALUE);
            }
            let lastAutoPos = new ValRef(win.AutoPosLastDirection);
            let pos = this.findBestWindowPosForPopupEx(win.Pos, win.Size,
                            lastAutoPos, r_outer, r_avoid);
            win.AutoPosLastDirection = lastAutoPos.get();
            return pos;
        }
        if (win.Flags & WindowFlags.Popup)
        {
            let r_avoid = new Rect(win.Pos.x - 1, win.Pos.y - 1,
                                    win.Pos.x + 1, win.Pos.y + 1);
            let lastAutoPos = new ValRef(win.AutoPosLastDirection);
            let pos = this.findBestWindowPosForPopupEx(win.Pos, win.Size,
                            lastAutoPos, r_outer, r_avoid);
            win.AutoPosLastDirection = lastAutoPos.get();
            return pos;
        }
        if (win.Flags & WindowFlags.Tooltip)
        {
            // Position tooltip (always follows mouse)
            let sc = g.Style.MouseCursorScale;
            let ref_pos = this.navCalcPreferredRefPos();
            let r_avoid;
            if (!g.NavDisableHighlight && g.NavDisableMouseHover &&
                !(g.IO.ConfigFlags & ConfigFlags.NavEnableSetMousePos))
                r_avoid = new Rect(ref_pos.x-16, ref_pos.y-8, ref_pos.x+16, ref_pos.y+8);
            else
            {
                // FIXME: Hard-coded based on mouse cursor shape expectation.
                // Exact dimension not very important.
                r_avoid = new Rect(ref_pos.x-16, ref_pos.y-8, ref_pos.x+24*sc, ref_pos.y+24*sc);
            }
            let lastAutoPos = new ValRef(win.AutoPosLastDirection);
            let pos = this.findBestWindowPosForPopupEx(ref_pos, win.Size,
                                lastAutoPos, r_outer, r_avoid);
            win.AutoPosLastDirection = lastAutoPos.get();
            if (win.AutoPosLastDirection == Dir.None)
            {
                // If there's not enough room, for tooltip we prefer avoiding
                // the cursor at all cost even if it means that part of the
                // tooltip won't be visible.
                pos = Vec2.AddXY(ref_pos, 2, 2);
            }
            return pos;
        }
        console.assert(0, "shouldn't reach here");
        return win.Pos;
    },

    // returns Vec2 and modifies last_dir (of type ValRef)
    //
    // r_avoid = the rectangle to avoid (e.g. for tooltip it is a rectangle
    // around the mouse cursor which we want to avoid. for popups it's a small
    // point around the cursor.)
    //
    // r_outer = the visible area rectangle, minus safe area padding. If our
    // popup size won't fit because of safe area padding we ignore it.
    findBestWindowPosForPopupEx(ref_pos, size, last_dir, r_outer, r_avoid,
                                policy=PopupPositionPolicy.Default)
    {
        if(last_dir.value == undefined)
            console.assert(last_dir.value, "last_dir must be a ValRef");
        let base_pos_clamped = Vec2.Clamp(ref_pos, r_outer.Min,
                                        Vec2.Subtract(r_outer.Max, size));
        //GetForegroundDrawList()->AddRect(r_avoid.Min, r_avoid.Max, IM_COL32(255,0,0,255));
        //GetForegroundDrawList()->AddRect(r_outer.Min, r_outer.Max, IM_COL32(0,255,0,255));

        // Combo Box policy (we want a connecting edge)
        if (policy == PopupPositionPolicy.ComboBox)
        {
            const dirOrder = [ Dir.Down, Dir.Right, Dir.Left, Dir.Up];
            for (let n = (last_dir.get() != Dir.None) ? -1 : 0; n < dirOrder.length; n++)
            {
                const dir = (n == -1) ? last_dir.get() : dirOrder[n];
                if (n != -1 && dir == last_dir.get()) // Already tried this direction?
                    continue;
                let pos;
                switch(dir)
                {
                case Dir.Down:
                    // Below, Toward Right (default)
                    pos = new Vec2(r_avoid.Min.x, r_avoid.Max.y);
                    break;
                case Dir.Right:
                    // Above, Toward Right
                    pos = new Vec2(r_avoid.Min.x, r_avoid.Min.y - size.y);
                    break;
                case Dir.Left:
                    // Below, Toward Left
                    pos = new Vec2(r_avoid.Max.x - size.x, r_avoid.Max.y);
                    break;
                case Dir.Up:
                    // Above, Toward Left
                    pos = new Vec2(r_avoid.Max.x - size.x, r_avoid.Min.y - size.y);
                    break;
                }
                if (!r_outer.Contains(new Rect(pos, Vec2.Add(pos, size))))
                    continue;
                last_dir.set(dir);
                return pos; /// <--------------------------------- return
            }
        }

        // Default popup policy
        const dirOrder = [ Dir.Right, Dir.Down, Dir.Up, Dir.Left ];
        for (let n = (last_dir.get() != Dir.None) ? -1 : 0; n < dirOrder.length; n++)
        {
            const dir = (n == -1) ? last_dir.get() : dirOrder[n];
            if (n != -1 && dir == last_dir.get())
                continue; // Already tried this direction..
            let avail_w = (dir == Dir.Left ?
                r_avoid.Min.x : r_outer.Max.x) -
                    (dir == Dir.Right ? r_avoid.Max.x : r_outer.Min.x);
            let avail_h = (dir == Dir.Up ?
                r_avoid.Min.y : r_outer.Max.y) -
                    (dir == Dir.Down ? r_avoid.Max.y : r_outer.Min.y);
            if (avail_w < size.x || avail_h < size.y)
                continue;

            let pos = new Vec2();
            pos.x = (dir == Dir.Left) ? r_avoid.Min.x - size.x :
                    (dir == Dir.Right) ? r_avoid.Max.x : base_pos_clamped.x;
            pos.y = (dir == Dir.Up)? r_avoid.Min.y - size.y :
                    (dir == Dir.Down) ? r_avoid.Max.y : base_pos_clamped.y;
            // console.log(pos.x, pos.y, r_avoid.Max.y);
            last_dir.set(dir);
            return pos; /// <--------------------------------------- return
        }

        // Fallback, try to keep within display
        last_dir.set(Dir.None);
        let pos = ref_pos.Clone();
        pos.x = Math.max(Math.min(pos.x + size.x, r_outer.Max.x) - size.x, r_outer.Min.x);
        pos.y = Math.max(Math.min(pos.y + size.y, r_outer.Max.y) - size.y, r_outer.Min.y);
        return pos;
    },
}; // end mixin