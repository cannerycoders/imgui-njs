//
// Just a way to keep miscellaneous private methods of imgui cleanly
// separated.  We employ mixins for separable/constituent parts.
//
import {InputSource, NavInput} from "./enums.js";

import {WindowFlags} from "./window.js";

import {
    CondFlags, HoveredFlags, ItemFlags,
    ItemStatusFlags,
} from "./flags.js";

import {Rect, Vec2} from  "./types.js";

export class ItemHoveredDataBackup
{
    constructor(guictx)
    {
        this.guictx = guictx;
        this.Backup();
    }
    Backup()
    {
        let win = this.guictx.CurrentWindow;
        this.LastItemId = win.DC.LastItemId;
        this.LastItemStatusFlags = win.DC.LastItemStatusFlags;
        this.LastItemRect = win.DC.LastItemRect.Clone();
        this.LastItemDisplayRect = win.DC.LastItemDisplayRect.Clone();
    }
    Restore()
    {
        let win = this.guictx.CurrentWindow;
        win.DC.LastItemId = this.LastItemId;
        win.DC.LastItemStatusFlags = this.LastItemStatusFlags;
        win.DC.LastItemRect = this.LastItemRect; // no need to clone
        win.DC.LastItemDisplayRect = this.LastItemDisplayRect; // ditto
    }
}

export var ImguiMiscMixin =
{
    // --- Init ---
    init(ctx)
    {},

    shutdown(ctx)
    {},

    // --- NewFrame ---

    startMouseMovingWindow(win)
    {
        // Set ActiveId even if the _NoMove flag is set. Without it, dragging
        // away from a window with _NoMove would activate hover on other windows.
        // We _also_ call this when clicking in a window empty space when
        // io.ConfigWindowsMoveFromTitleBarOnly is set, but clear g.MovingWindow
        // afterward. This is because we want ActiveId to be set even when the
        // window is not permitted to move.
        let g = this.guictx;
        this.FocusWindow(win);
        this.setActiveID(win.MoveId, win);
        g.NavDisableHighlight = true;
        g.ActiveIdClickOffset = Vec2.Subtract(g.IO.MousePos, win.RootWindow.Pos);

        let can_move_window = true;
        if ((win.Flags & WindowFlags.NoMove) ||
            (win.RootWindow.Flags & WindowFlags.NoMove))
        {
            can_move_window = false;
        }
        if (can_move_window)
            g.MovingWindow = win;
    },

    updateMouseMovingWindowNewFrame()
    {
        let g = this.guictx;
        if (g.MovingWindow != null)
        {
            // We actually want to move the root window.
            //  g.MovingWindow == window we clicked on (could be a child window).
            // We track it to preserve Focus and so that generally
            // ActiveIdWindow == MovingWindow and ActiveId == MovingWindow->MoveId
            // for consistency.
            this.keepAliveID(g.ActiveId);
            console.assert(g.MovingWindow && g.MovingWindow.RootWindow);
            let moving_window = g.MovingWindow.RootWindow;
            if (g.IO.MouseDown[0] && this.IsMousePosValid(g.IO.MousePos))
            {
                let pos = Vec2.Subtract(g.IO.MousePos, g.ActiveIdClickOffset);
                if (moving_window.Pos.x != pos.x || moving_window.Pos.y != pos.y)
                {
                    this.MarkIniSettingsDirty(moving_window);
                    moving_window.SetWindowPos(pos, CondFlags.Always);
                }
                this.FocusWindow(g.MovingWindow);
            }
            else
            {
                this.clearActiveID();
                g.MovingWindow = null;
            }
        }
        else
        {
            // When clicking/dragging from a window that has the _NoMove flag,
            // we still set the ActiveId in order to prevent hovering others.
            if (g.ActiveIdWindow && g.ActiveIdWindow.MoveId == g.ActiveId)
            {
                this.keepAliveID(g.ActiveId);
                if (!g.IO.MouseDown[0])
                    this.clearActiveID();
            }
        }
    },

    updateMouseMovingWindowEndFrame()
    {
        // Initiate moving window
        let g = this.guictx;
        if (g.ActiveId != 0 || g.HoveredId != 0)
            return;

        // Unless we just made a window/popup appear
        if (g.NavWindow && g.NavWindow.Appearing)
            return;

        // Click to focus window and start moving (after we're done with all our widgets)
        if (g.IO.MouseClicked[0])
        {
            if (g.HoveredRootWindow)
            {
                this.startMouseMovingWindow(g.HoveredWindow);
                if (g.IO.ConfigWindowsMoveFromTitleBarOnly &&
                    !(g.HoveredRootWindow.Flags & WindowFlags.NoTitleBar))
                {
                    if (!g.HoveredRootWindow.TitleBarRect().Contains(g.IO.MouseClickedPos[0]))
                        g.MovingWindow = null;
                }
            }
            else
            if (g.NavWindow  && !this.getFrontMostPopupModal())
            {
                // Clicking on void disable focus
                this.FocusWindow(null);
            }
        }

        // With right mouse button we close popups without changing focus
        // (The left mouse button path calls FocusWindow which will lead NewFrame->ClosePopupsOverWindow to trigger)
        if (g.IO.MouseClicked[1])
        {
            // Find the top-most window between HoveredWindow and the front most Modal Window.
            // This is where we can trim the popup stack.
            let modal = this.getFrontMostPopupModal();
            let hovered_window_above_modal = false;
            if (modal)
                hovered_window_above_modal = true;
            for (let i = g.Windows.length - 1; i >= 0 && hovered_window_above_modal == false; i--)
            {
                let win = g.Windows[i];
                if (win == modal)
                    break;
                if (win == g.HoveredWindow)
                    hovered_window_above_modal = true;
            }
            this.closePopupsOverWindow(hovered_window_above_modal ? g.HoveredWindow : modal);
        }
    },

    // Basic accessors ======
    getItemID()
    {
         return this.guictx.CurrentWindow.DC.LastItemId;
    },
    getActiveID()
    {
        return this.guictx.ActiveId;
    },
    getFocusID()
    {
        return this.guictx.NavId;
    },

    setActiveID(id, win)
    {
        let g = this.guictx;
        g.ActiveIdIsJustActivated = (g.ActiveId != id);
        if (g.ActiveIdIsJustActivated)
        {
            g.ActiveIdTimer = 0.;
            g.ActiveIdHasBeenPressed = false;
            g.ActiveIdHasBeenEdited = false;
            if (id != 0)
            {
                g.LastActiveId = id;
                g.LastActiveIdTimer = 0;
            }
        }
        g.ActiveId = id;
        g.ActiveIdAllowNavDirFlags = 0;
        g.ActiveIdBlockNavInputFlags = 0;
        g.ActiveIdAllowOverlap = false;
        g.ActiveIdWindow = win;
        if (id)
        {
            g.ActiveIdIsAlive = id;
            if(g.NavActivateId == id || g.NavInputId == id ||
                g.NavJustTabbedId == id || g.NavJustMovedToId == id)
                g.ActiveIdSource = InputSource.Nav;
            else
                g.ActiveIdSource = InputSource.Mouse;
        }
    },

    setFocusID(id, win)
    {
        let g = this.guictx;
        console.assert(id != 0);

        // Assume that SetFocusID() is called in the context where its
        // NavLayer is the current layer, which is the case everywhere we
        // call it.
        const nav_layer = win.DC.NavLayerCurrent;
        if (g.NavWindow != win)
            g.NavInitRequest = false;
        g.NavId = id;
        g.NavWindow = win;
        g.NavLayer = nav_layer;
        win.NavLastIds[nav_layer] = id;
        if(win.DC.LastItemId == id)
        {
            win.NavRectRel[nav_layer] =
                new Rect(Vec2.Subtract(win.DC.LastItemRect.Min, win.Pos),
                         Vec2.Subtract(win.DC.LastItemRect.Max, win.Pos));
        }
        if (g.ActiveIdSource == InputSource.Nav)
            g.NavDisableMouseHover = true;
        else
            g.NavDisableHighlight = true;
    },

    clearActiveID()
    {
        this.setActiveID(0, null);
    },

    getHoveredID()
    {
        let g = this.guictx;
        return g.HoveredId ? g.HoveredId : g.HoveredIdPreviousFrame;
    },

    setHoveredID(id)
    {
        let g = this.guictx;
        g.HoveredId = id;
        g.HoveredIdAllowOverlap = false;
        if (id != 0 && g.HoveredIdPreviousFrame != id)
            g.HoveredIdTimer = g.HoveredIdNotActiveTimer = 0;
    },

    keepAliveID(id)
    {
        let g = this.guictx;
        if (g.ActiveId == id)
            g.ActiveIdIsAlive = id;
        if (g.ActiveIdPreviousFrame == id)
            g.ActiveIdPreviousFrameIsAlive = true;
    },

    markItemEdited(id)
    {
        // This marking is solely to be able to provide info for
        // IsItemDeactivatedAfterEdit().  ActiveId might have been
        // released by the time we call this (as in the typical
        // press/release button behavior) but still need need to
        // fill the data.
        let g = this.guictx;
        console.assert(g.ActiveId == id || g.ActiveId == 0 || g.DragDropActive);
        //IM_ASSERT(g.CurrentWindow->DC.LastItemId == id);
        g.ActiveIdHasBeenEdited = true;
        g.CurrentWindow.DC.LastItemStatusFlags |= ItemStatusFlags.Edited;
    },

    // --- basic helpers for widget code ---

    itemHoverable(bb, id)
    {
        let g = this.guictx;
        if (g.HoveredId != 0 && g.HoveredId != id && !g.HoveredIdAllowOverlap)
            return false;
        let win = g.CurrentWindow;
        if (g.HoveredWindow != win)
            return false;
        if (g.ActiveId != 0 && g.ActiveId != id && !g.ActiveIdAllowOverlap)
            return false;
        if (!this.IsMouseHoveringRect(bb.Min, bb.Max))
            return false;
        if (g.NavDisableMouseHover ||
            !this.isWindowContentHoverable(win, HoveredFlags.None))
        {
            return false;
        }
        if (win.DC.ItemFlags & ItemFlags.Disabled)
            return false;

        this.setHoveredID(id);
        return true;
    },

    // Process TAB/Shift+TAB. Be mindful that this function may _clear_
    // the ActiveID when tabbing out.
    // Return true if focus is requested
    focusableItemRegister(win, id)
    {
        let g = this.guictx;
        // Increment counters
        const is_tab_stop = (win.DC.ItemFlags &
                           (ItemFlags.NoTabStop | ItemFlags.Disabled)) == 0;
        win.DC.FocusCounterAll++;
        if (is_tab_stop)
            win.DC.FocusCounterTab++;

        // Process TAB/Shift-TAB to tab *OUT* of the currently focused item.
        // (Note that we can always TAB out of a widget that doesn't allow tabbing in)
        if (g.ActiveId == id && g.FocusTabPressed &&
            !(g.ActiveIdBlockNavInputFlags & (1 << NavInput.KeyTab)) &&
              g.FocusRequestNextWindow == null)
        {
            g.FocusRequestNextWindow = win;
            g.FocusRequestNextCounterTab = win.DC.FocusCounterTab +
                        (g.IO.KeyShift ? (is_tab_stop ? -1 : 0) : +1);
                        // Modulo on index will be applied at the end of frame
                        // once we've got the total counter of items.
        }

        // Handle focus requests
        if (g.FocusRequestCurrWindow == win)
        {
            if (win.DC.FocusCounterAll == g.FocusRequestCurrCounterAll)
                return true;
            if (is_tab_stop && win.DC.FocusCounterTab == g.FocusRequestCurrCounterTab)
            {
                g.NavJustTabbedId = id;
                return true;
            }

            // If another item is about to be focused, we clear our own active id
            if (g.ActiveId == id)
                this.clearActiveID();
        }

        return false;
    },

    focusableItemUnregister(win)
    {
        win.DC.FocusCounterAll--;
        win.DC.FocusCounterTab--;
    },

    // ----- logging/capture ----
    logBegin(type, auto_open_depth)
    {},
    logToBuffer(auto_open_depth=-1)
    {},


    // inputs -------------------------------------------------------
    isKeyPressedMap(key, repeat=true)
    {
        const key_index = this.guictx.IO.KeyMap[key];
        return (key_index >= 0) ? this.IsKeyPressed(key_index, repeat) : false;
    },

    //  -- draw and drop --
    beginDragDropTargetCustom(bbox, id)
    {console.assert(0);},

    clearDragDrop()
    {console.assert(0);},

    isDragDropPayloadBeingAccepted()
    {console.assert(0);},

    // - Columns API -----
    beginColumns(id, count, flags)
    {console.assert(0);},
    endColumns()
    {console.assert(0);},
    pushColumnClipRect(colIndex)
    {console.assert(0);},


    // Widgets (implemented in widgets/text,scrollbar.js)
    textEx(text, textflags = 0)
    {console.assert(0);},
    scrollbar(axis)
    {console.assert(0);},
    setScrollbarID(win, axis)
    {console.assert(0);},

    //-------
    updateMouseWheel()
    {
        // we currently allow this to reside here since it modifies
        // global (non-IO) state related to scrolling, etc.
        let g = this.guictx;
        if (!g.HoveredWindow || g.HoveredWindow.Collapsed)
            return;
        if (g.IO.MouseWheel == 0. && g.IO.MouseWheelH == 0. &&
            g.IO.TouchDelta.x == 0 && g.IO.TouchDelta.y == 0)
            return;

        // If a child window has the ImGuiWindowFlags_NoScrollWithMouse flag,
        // we give a chance to scroll its parent (unless either
        // WindowFlags.NoInputs or WindowFlags.NoScrollbar are also set).
        let win = g.HoveredWindow;
        let scroll_window = win;
        while ((scroll_window.Flags & WindowFlags.ChildWindow) &&
              (scroll_window.Flags & WindowFlags.NoScrollWithMouse) &&
              !(scroll_window.Flags & WindowFlags.NoScrollbar) &&
              !(scroll_window.Flags & WindowFlags.NoMouseInputs) &&
               scroll_window.ParentWindow)
        {
            scroll_window = scroll_window.ParentWindow;
        }
        const scroll_allowed = !(scroll_window.Flags & WindowFlags.NoScrollWithMouse) &&
                               !(scroll_window.Flags & WindowFlags.NoMouseInputs);

        if (g.IO.MouseWheel != 0 || g.IO.TouchDelta.y != 0)
        {
            if (g.IO.KeyCtrl && g.IO.FontAllowUserScaling)
            {
                // Zoom / Scale window
                let new_font_scale = win.FontWindowScale + g.IO.MouseWheel * 0.1;
                if(new_font_scale < .5) new_font_scale = .5;
                else if(new_font_scale > 2.5) new_font_scale = 2.5;
                const scale = new_font_scale / win.FontWindowScale;
                win.FontWindowScale = new_font_scale;

                let dp = Vec2.Subtract(g.IO.MousePos, win.Pos);
                let iws = Vec2.Mult(win.Size, 1-scale);
                let offset = Vec2.Divide(iws, win.Size).Mult(dp);
                win.Pos.Add(offset);
                win.Size.Mult(scale);
                win.SizeFull.Mult(scale);
            }
            else
            if (!g.IO.KeyCtrl && scroll_allowed)
            {
                // Mouse wheel vertical scrolling
                let amt = 5 * scroll_window.CalcLineHeight();
                amt = Math.floor(Math.min(amt,
                            .67*(scroll_window.ContentsRegionRect.GetHeight() +
                                 scroll_window.WindowPadding.y * 2)));
                if(g.IO.MouseWheel != 0)
                    amt *= g.IO.MouseWheel;
                else
                {
                    amt *= g.IO.TouchDelta.y;
                    if(g.IO.TouchActive == 0)
                    {
                        g.IO.TouchDelta.y *= .98; // <-- vertical deceleration
                        if(Math.abs(g.IO.TouchDelta.y) < .15)
                            g.IO.TouchDelta.y = 0;
                    }
                }
                scroll_window.SetWindowScrollY(scroll_window.Scroll.y - amt);
            }
        }
        if (g.IO.MouseWheelH != 0 || g.IO.TouchDelta.x != 0 &&
            scroll_allowed && !g.IO.KeyCtrl)
        {
            // Mouse wheel horizontal scrolling (for hardware that supports it)
            let amt = scroll_window.CalcLineHeight();
            if(g.IO.MouseWheelH != 0)
                amt *= g.IO.MouseWheelH;
            else
            {
                amt *= g.IO.TouchDelta.x;
                if(g.IO.TouchActive == 0)
                {
                    g.IO.TouchDelta.x *= .75; // <-- faster horizontal deceleration
                    if(Math.abs(g.IO.TouchDelta.x) < .15)
                        g.IO.TouchDelta.x = 0;
                }
            }
            scroll_window.SetWindowScrollX(scroll_window.Scroll.x - amt);
        }
    },

    beginListBox(label, size)
    {},

    // terminate the scrolling region. only call EndListBox() if BeginListBox()
    // returned true!
    endListBox()
    {},

    modPositive(a, b)
    {
        return (a + b) % b;
    },


};

