// ImguiNav is a subset of ImguiPrivate that has been migrated into
// this virtual class because that file is too large/unwieldy.
// We assume/require that ImguiPrivate be extended by us and reference
// ImguiPrivate's private parts conspicuously.
import {Dir, Key, InputSource, InputReadMode,
        NavForward, NavInput, NavLayer,
} from "./enums.js";
import {WindowFlags} from "./window.js";
import { BackendFlags, CondFlags, ConfigFlags,
    ItemFlags, NavDirSourceFlags, NavMoveFlags,
} from "./flags.js";
import {Rect, Vec2, Vec1} from  "./types.js";

const NavWinHighlightDelay = .2; // time before highlight an and screen dimming
const NavWinAppearDelay = .15;

export class NavMoveResult
{
    constructor()
    {
        this.Clear();
    }

    Clear()
    {
        this.ID = 0; // Best candiate
        this.SelectScopeId = 0; // Best candidate window current selectable groupID
        this.Window = null; // Best candidate window
        this.DistBox = Number.MAX_VALUE; // dist to current NavId
        this.DistCenter = Number.MAX_VALUE; // center dist to current NavId
        this.DistAxial = Number.MAX_VALUE;
        this.RectRel = null; // best candidate bbox in window-relative coords
    }
}

export var ImguiNavMixin =
{
    isNavInputPressed(n, mode) { return this.getNavInputAmount(n, mode) > 0; },

    isNavInputPressedAnyOfTwo(n1, n2, mode)
    {
        let sum = this.getNavInputAmount(n1, mode) +
                  this.getNavInputAmount(n2, mode);
        return sum > 0;
    },

    isNavInputDown(n)
    {
        return this.guictx.IO.NavInputs[n] > 0;
    },

    navInitWindow(win, forceReinit)
    {
        let g = this.guictx;
        console.assert(win == g.NavWindow);
        let init_for_nav = false;
        if (!(win.Flags & WindowFlags.NoNavInputs))
        {
            if (!(win.Flags & WindowFlags.ChildWindow) ||
                    (win.Flags & WindowFlags.Popup) ||
                    (win.NavLastIds[0] == 0) || forceReinit)
                init_for_nav = true;
        }
        if (init_for_nav)
        {
            this.setNavID(0, g.NavLayer);
            g.NavInitRequest = true;
            g.NavInitRequestFromMove = false;
            g.NavInitResultId = 0;
            g.NavInitResultRectRel = new Rect();
            this.navUpdateAnyRequestFlag();
        }
        else
        {
            g.NavId = win.NavLastIds[0];
        }
    },

    navMapKey(g, k, navinput)
    {
        if (this.IsKeyDown(g.IO.KeyMap[k]))
        {
            g.IO.NavInputs[navinput] = 1;
            g.NavInputSource = InputSource.NavKeyboard;
        }
    },

    navUpdate()
    {
        let g = this.guictx;
        g.IO.WantSetMousePos = false;

        // Set input source as Gamepad when buttons are pressed before we map
        // Keyboard (some features differs when used with Gamepad vs Keyboard)
        let nav_keyboard_active = (g.IO.ConfigFlags & ConfigFlags.NavEnableKeyboard) != 0;
        let nav_gamepad_active = (g.IO.ConfigFlags & ConfigFlags.NavEnableGamepad) != 0 &&
                                    (g.IO.BackendFlags & BackendFlags.HasGamepad) != 0;
        if (nav_gamepad_active)
        {
            if (g.IO.NavInputs[NavInput.Activate] > 0 ||
                g.IO.NavInputs[NavInput.Input] > 0 ||
                g.IO.NavInputs[NavInput.Cancel] > 0 ||
                g.IO.NavInputs[NavInput.Menu] > 0)
            {
                g.NavInputSource = InputSource.NavGamepad;
            }
        }

        // Update Keyboard->Nav inputs mapping
        if (nav_keyboard_active)
        {
            this.navMapKey(g, Key.Space, NavInput.Activate);
            this.navMapKey(g, Key.Enter, NavInput.Input);
            this.navMapKey(g, Key.Escape, NavInput.Cancel);
            this.navMapKey(g, Key.LeftArrow, NavInput.KeyLeft_);
            this.navMapKey(g, Key.RightArrow,NavInput.KeyRight_);
            this.navMapKey(g, Key.UpArrow, NavInput.KeyUp_);
            this.navMapKey(g, Key.DownArrow, NavInput.KeyDown_);
            this.navMapKey(g, Key.Tab, NavInput.KeyTab_);
            if (g.IO.KeyCtrl)
                g.IO.NavInputs[NavInput.TweakSlow] = 1;
            if (g.IO.KeyShift)
                g.IO.NavInputs[NavInput.TweakFast] = 1;
            if (g.IO.KeyAlt && !g.IO.KeyCtrl) // AltGR is Alt+Ctrl, also even on keyboards without AltGR we don't want Alt+Ctrl to open menu.
                g.IO.NavInputs[NavInput.KeyMenu_]  = 1;
        }
        g.IO.NavInputsDownDurationPrev = g.IO.NavInputsDownDuration.slice(); // copy
        for (let i = 0; i < g.IO.NavInputs.length; i++)
        {
            g.IO.NavInputsDownDuration[i] = (g.IO.NavInputs[i] > 0) ?
                        (g.IO.NavInputsDownDuration[i] < 0 ? 0 :
                            g.IO.NavInputsDownDuration[i] + g.IO.DeltaTime) : -1;
        }

        // Process navigation init request (select first/default focus)
        if (g.NavInitResultId != 0 &&
            (!g.NavDisableHighlight || g.NavInitRequestFromMove))
        {
            // Apply result from previous navigation init request (will typically
            // select the first item, unless SetItemDefaultFocus() has been called)
            console.assert(g.NavWindow);
            if (g.NavInitRequestFromMove)
                this.setNavIDWithRectRel(g.NavInitResultId, g.NavLayer, g.NavInitResultRectRel);
            else
                this.setNavID(g.NavInitResultId, g.NavLayer);
            g.NavWindow.NavRectRel[g.NavLayer] = g.NavInitResultRectRel;
        }
        g.NavInitRequest = false;
        g.NavInitRequestFromMove = false;
        g.NavInitResultId = 0;
        g.NavJustMovedToId = 0;

        // Process navigation move request
        if (g.NavMoveRequest)
            this.navUpdateMoveResult();

        // When a forwarded move request failed, we restore the highlight that
        // we disabled during the forward frame
        if (g.NavMoveRequestForward == NavForward.ForwardActive)
        {
            console.assert(g.NavMoveRequest);
            if (g.NavMoveResultLocal.ID == 0 && g.NavMoveResultOther.ID == 0)
                g.NavDisableHighlight = false;
            g.NavMoveRequestForward = NavForward.None;
        }

        // Apply application mouse position movement, after we had a chance to
        // process move request result.
        if (g.NavMousePosDirty && g.NavIdIsAlive)
        {
            // Set mouse position given our knowledge of the navigated item
            // position from last frame
            if ((g.IO.ConfigFlags & ConfigFlags.NavEnableSetMousePos) &&
                (g.IO.BackendFlags & BackendFlags.HasSetMousePos))
            {
                if (!g.NavDisableHighlight && g.NavDisableMouseHover && g.NavWindow)
                {
                    g.IO.MousePos = this.navCalcPreferredRefPos();
                    g.IO.MousePosPrev = g.IO.MousePos.Clone();
                    g.IO.WantSetMousePos = true;
                }
            }
            g.NavMousePosDirty = false;
        }
        g.NavIdIsAlive = false;
        g.NavJustTabbedId = 0;
        console.assert(g.NavLayer == 0 || g.NavLayer == 1);

        // Store our return window (for returning from Layer 1 to Layer 0) and
        // clear it as soon as we step back in our own Layer 0
        if (g.NavWindow)
            this.navSaveLastChildNavWindowIntoParent(g.NavWindow);
        if (g.NavWindow && g.NavWindow.NavLastChildNavWindow != null && g.NavLayer == 0)
            g.NavWindow.NavLastChildNavWindow = null;

        // Update CTRL+TAB and Windowing features (hold Square to move/resize/etc.)
        this.navUpdateWindowing();

        // Set output flags for user application
        g.IO.NavActive = (nav_keyboard_active || nav_gamepad_active) &&
                g.NavWindow && !(g.NavWindow.Flags & WindowFlags.NoNavInputs);
        g.IO.NavVisible = (g.IO.NavActive && g.NavId != 0 && !g.NavDisableHighlight)
                        || (g.NavWindowingTarget != null);

        // Process NavCancel input (to close a popup, get back to parent,
        // clear focus)
        if (this.isNavInputPressed(NavInput.Cancel, InputReadMode.Pressed))
        {
            if (g.ActiveId != 0)
            {
                if (!(g.ActiveIdBlockNavInputFlags & (1 << NavInput.Cancel)))
                    this.clearActiveID();
            }
            else
            if (g.NavWindow &&
                (g.NavWindow.Flags & WindowFlags.ChildWindow) &&
                 !(g.NavWindow.Flags & WindowFlags.Popup) &&
                g.NavWindow.ParentWindow)
            {
                // Exit child window
                let child_window = g.NavWindow;
                let parent_window = g.NavWindow.ParentWindow;
                console.assert(child_window.ChildId != 0);
                this.FocusWindow(parent_window);
                this.setNavID(child_window.ChildId, 0);
                g.NavIdIsAlive = false;
                if (g.NavDisableMouseHover)
                    g.NavMousePosDirty = true;
            }
            else
            if (g.OpenPopupStack.length > 0)
            {
                // Close open popup/menu
                let p = g.OpenPopupStack[g.OpenPopupStack.length-1];
                if (!(p.Window.Flags & WindowFlags.Modal))
                    this.closePopupToLevel(g.OpenPopupStack.length - 1, true);
            }
            else
            if (g.NavLayer != 0)
            {
                // Leave the "menu" layer
                this.navRestoreLayer(NavLayer.Main);
            }
            else
            {
                // Clear NavLastId for popups but keep it for regular child
                // window so we can leave one and come back where we were
                if (g.NavWindow &&
                    ((g.NavWindow.Flags & WindowFlags.Popup) ||
                     !(g.NavWindow.Flags & WindowFlags.ChildWindow)))
                {
                    g.NavWindow.NavLastIds[0] = 0;
                }
                g.NavId = 0;
            }
        }

        // Process manual activation request
        g.NavActivateId = g.NavActivateDownId = 0;
        g.NavActivatePressedId = g.NavInputId = 0;
        if (g.NavId != 0 && !g.NavDisableHighlight && !g.NavWindowingTarget &&
            g.NavWindow && !(g.NavWindow.Flags & WindowFlags.NoNavInputs))
        {
            let activate_down = this.isNavInputDown(NavInput.Activate);
            let activate_pressed = activate_down &&
                this.isNavInputPressed(NavInput.Activate, InputReadMode.Pressed);
            if (g.ActiveId == 0 && activate_pressed)
                g.NavActivateId = g.NavId;
            if ((g.ActiveId == 0 || g.ActiveId == g.NavId) && activate_down)
                g.NavActivateDownId = g.NavId;
            if ((g.ActiveId == 0 || g.ActiveId == g.NavId) && activate_pressed)
                g.NavActivatePressedId = g.NavId;
            if ((g.ActiveId == 0 || g.ActiveId == g.NavId) &&
                this.isNavInputPressed(NavInput.Input, InputReadMode.Pressed))
                g.NavInputId = g.NavId;
        }
        if (g.NavWindow && (g.NavWindow.Flags & WindowFlags.NoNavInputs))
            g.NavDisableHighlight = true;
        if (g.NavActivateId != 0)
            console.assert(g.NavActivateDownId == g.NavActivateId);
        g.NavMoveRequest = false;

        // Process programmatic activation request
        if (g.NavNextActivateId != 0)
        {
            g.NavActivateId = g.NavActivateDownId =
            g.NavActivatePressedId = g.NavInputId = g.NavNextActivateId;
        }
        g.NavNextActivateId = 0;

        // Initiate directional inputs request
        const allowed_dir_flags = (g.ActiveId == 0) ? ~0 : g.ActiveIdAllowNavDirFlags;
        if (g.NavMoveRequestForward == NavForward.None)
        {
            g.NavMoveDir = Dir.None;
            g.NavMoveRequestFlags = NavMoveFlags.None;
            if (g.NavWindow && !g.NavWindowingTarget && allowed_dir_flags &&
                !(g.NavWindow.Flags & WindowFlags.NoNavInputs))
            {
                if ((allowed_dir_flags & (1<<Dir.Left))  &&
                    this.isNavInputPressedAnyOfTwo(NavInput.DpadLeft, NavInput.KeyLeft_,
                                                   InputReadMode.Repeat))
                {
                    g.NavMoveDir = Dir.Left;
                }
                if ((allowed_dir_flags & (1<<Dir.Right)) &&
                    this.isNavInputPressedAnyOfTwo(NavInput.DpadRight, NavInput.KeyRight_,
                                                   InputReadMode.Repeat))
                {
                    g.NavMoveDir = Dir.Right;
                }
                if ((allowed_dir_flags & (1<<Dir.Up)) &&
                    this.isNavInputPressedAnyOfTwo(NavInput.DpadUp, NavInput.KeyUp_,
                                                   InputReadMode.Repeat))
                {
                    g.NavMoveDir = Dir.Up;
                }
                if ((allowed_dir_flags & (1<<Dir.Down)) &&
                    this.isNavInputPressedAnyOfTwo(NavInput.DpadDown, NavInput.KeyDown_,
                                                   InputReadMode.Repeat))
                {
                    g.NavMoveDir = Dir.Down;
                }
            }
            g.NavMoveClipDir = g.NavMoveDir;
        }
        else
        {
            // Forwarding previous request (which has been modified, e.g. wrap
            // around menus rewrite the requests with a starting rectangle at
            // the other side of the window)
            // (Preserve g.NavMoveRequestFlags, g.NavMoveClipDir which were set
            // by the navMoveRequestForward() function)
            console.assert(g.NavMoveDir != Dir.None && g.NavMoveClipDir != Dir.None);
            console.assert(g.NavMoveRequestForward == NavForward.ForwardQueued);
            g.NavMoveRequestForward = NavForward.ForwardActive;
        }

        // Update PageUp/PageDown scroll
        let nav_scoring_rect_offset_y = 0;
        if (nav_keyboard_active)
            nav_scoring_rect_offset_y = this.navUpdatePageUpPageDown(allowed_dir_flags);

        // If we initiate a movement request and have no current NavId, we
        // initiate a InitDefautRequest that will be used as a fallback if
        // the direction fails to find a match
        if (g.NavMoveDir != Dir.None)
        {
            g.NavMoveRequest = true;
            g.NavMoveDirLast = g.NavMoveDir;
        }
        if (g.NavMoveRequest && g.NavId == 0)
        {
            g.NavInitRequest = g.NavInitRequestFromMove = true;
            g.NavInitResultId = 0;
            g.NavDisableHighlight = false;
        }
        this.navUpdateAnyRequestFlag();

        // Scrolling
        if (g.NavWindow && !(g.NavWindow.Flags & WindowFlags.NoNavInputs)
            && !g.NavWindowingTarget)
        {
            // *Fallback* manual-scroll with Nav directional keys when window
            // has no navigable item
            let win = g.NavWindow;
            // We need round the scrolling speed because sub-pixel scroll isn't
            // reliably supported.
            const scroll_speed = Math.floor(win.CalcLineHeight()*100*g.IO.DeltaTime + 0.5);
            if (win.DC.NavLayerActiveMask == 0x00 &&
                win.DC.NavHasScroll && g.NavMoveRequest)
            {
                if (g.NavMoveDir == Dir.Left || g.NavMoveDir == Dir.Right)
                {
                    win.SetWindowScrollX(Math.floor(win.Scroll.x +
                            ((g.NavMoveDir == Dir.Left) ? -1 : 1) * scroll_speed));
                }
                if (g.NavMoveDir == Dir.Up || g.NavMoveDir == Dir.Down)
                {
                    win.SetWindowScrollY(Math.floor(win.Scroll.y +
                             ((g.NavMoveDir == Dir.Up) ? -1 : 1) * scroll_speed));
                }
            }

            // *Normal* Manual scroll with NavScrollXXX keys
            // Next movement request will clamp the NavId reference rectangle
            // to the visible area, so navigation will resume within those bounds.
            let scroll_dir = this.getNavInputAmount2d(NavDirSourceFlags.PadLStick,
                                        InputReadMode.Down, 1.0/10.0, 10.0);
            if (scroll_dir.x != 0 && win.ScrollbarX)
            {
                win.SetWindowScrollX(Math.floor(win.Scroll.x + scroll_dir.x * scroll_speed));
                g.NavMoveFromClampedRefRect = true;
            }
            if (scroll_dir.y != 0)
            {
                win.SetWindowScrollY(Math.floor(win.Scroll.y + scroll_dir.y * scroll_speed));
                g.NavMoveFromClampedRefRect = true;
            }
        }
        // Reset search results
        g.NavMoveResultLocal.Clear();
        g.NavMoveResultLocalVisibleSet.Clear();
        g.NavMoveResultOther.Clear();

        // When we have manually scrolled (without using navigation) and
        // NavId becomes out of bounds, we project its bounding box to the
        // visible area to restart navigation within visible items
        if (g.NavMoveRequest && g.NavMoveFromClampedRefRect && g.NavLayer == 0)
        {
            let win = g.NavWindow;
            let window_rect_rel = new Rect(
                    Vec2.SubtractXY(Vec2.Subtract(win.InnerMainRect.Min, win.Pos),1,1),
                    Vec2.AddXY(Vec2.Subtract(win.InnerMainRect.Max, win.Pos),1,1));
            if (!window_rect_rel.Contains(win.NavRectRel[g.NavLayer]))
            {
                // Terrible approximation for the intent of starting navigation
                // from first fully visible item
                let pad = win.CalcLineHeight() * .5;
                window_rect_rel.expandXY(-Math.min(window_rect_rel.GetWidth(), pad),
                                        -Math.min(window_rect_rel.GetHeight(), pad));
                win.NavRectRel[g.NavLayer].ClipWith(window_rect_rel);
                g.NavId = 0;
            }
            g.NavMoveFromClampedRefRect = false;
        }

        // For scoring we use a single segment on the left side our current
        // item bounding box (not touching the edge to avoid box overlap with
        // zero-spaced items)
        let nav_rect_rel;
        if(g.NavWindow && !g.NavWindow.NavRectRel[g.NavLayer].IsInverted())
            nav_rect_rel = g.NavWindow.NavRectRel[g.NavLayer];
        else
            nav_rect_rel = Rect.FromXY(0,0,0,0);
        if(g.NavWindow)
        {
            g.NavScoringRectScreen = new Rect(
                                Vec2.Add(g.NavWindow.Pos, nav_rect_rel.Min),
                                Vec2.Add(g.NavWindow.Pos, nav_rect_rel.Max));
        }
        else
        {
            g.NavScoringRectScreen = this.getViewportRect().Clone();
        }
        g.NavScoringRectScreen.TranslateY(nav_scoring_rect_offset_y);
        g.NavScoringRectScreen.Min.x = Math.min(g.NavScoringRectScreen.Min.x+1,
                                                g.NavScoringRectScreen.Max.x);
        g.NavScoringRectScreen.Max.x = g.NavScoringRectScreen.Min.x;
        // Ensure if we have a finite, non-inverted bounding box here will
        // allows us to remove extraneous ImFabs() calls in NavScoreItem().
        console.assert(!g.NavScoringRectScreen.IsInverted());
        //GetForegroundDrawList()->AddRect(g.NavScoringRectScreen.Min,
        // g.NavScoringRectScreen.Max, IM_COL32(255,200,0,255)); // [DEBUG]
        g.NavScoringCount = 0;

        if(false) // DEBUG_NAV_RECTS
        {
            if (g.NavWindow)
            {
                let draw_list = this.GetForegroundDrawList(g.NavWindow);
                for (let layer = 0; layer < 2; layer++)
                {
                    draw_list.AddRect(g.NavWindow.Pos + g.NavWindow.NavRectRel[layer].Min,
                                      g.NavWindow.Pos + g.NavWindow.NavRectRel[layer].Max,
                                      g.Style.GetColor("_DEBUG1"));
                } // [DEBUG]
                let col = (!g.NavWindow.Hidden) ? g.Style.GetColor("_DEBUG2") :
                                g.Style.GetColor("_DEBUG3");
                let p = this.navCalcPreferredRefPos();
                let  buf = g.NavLayer.toFixed(0);
                draw_list.AddCircleFilled(p, 3., col);
                draw_list.AddText(buf, Vec2.AddXY(p, 8,-4), g.Font, g.FontLineHeight, col);
            }
        }
    }, // end navUpdate

    // We get here when either NavId == id, or when g.NavAnyRequest is set
    // (which is updated by NavUpdateAnyRequestFlag above)
    navProcessItem(win, nav_bb, id)
    {
        let g = this.guictx;

        // if (!g.IO.NavActive)
        //    return;
        // [2017/10/06] Removed this possibly redundant test but I am not sure
        // of all the side-effects yet. Some of the feature here will need to work
        // regardless of using a _NoNavInputs flag.

        let item_flags = win.DC.ItemFlags;
        let nav_bb_rel = new Rect(Vec2.Subtract(nav_bb.Min, win.Pos),
                                    Vec2.Subtract(nav_bb.Max, win.Pos));

        // Process Init Request
        if (g.NavInitRequest && g.NavLayer == win.DC.NavLayerCurrent)
        {
            // Even if 'ItemFlags.NoNavDefaultFocus' is on (typically
            // collapse/close button) we record the first ResultId so they
            // can be used as a fallback
            if (!(item_flags & ItemFlags.NoNavDefaultFocus) ||
                g.NavInitResultId == 0)
            {
                g.NavInitResultId = id;
                g.NavInitResultRectRel = nav_bb_rel;
            }
            if (!(item_flags & ItemFlags.NoNavDefaultFocus))
            {
                g.NavInitRequest = false; // Found a match, clear request
                this.navUpdateAnyRequestFlag();
            }
        }

        // Process Move Request (scoring for navigation)
        // FIXME-NAV: Consider policy for double scoring (scoring from
        // NavScoringRectScreen + scoring from a rect wrapped according to
        // current wrapping policy)
        if ((g.NavId != id ||
            (g.NavMoveRequestFlags & NavMoveFlags.AllowCurrentNavId)) &&
            !(item_flags & (ItemFlags.Disabled|ItemFlags.NoNav)))
        {
            let result = (win == g.NavWindow) ? g.NavMoveResultLocal : g.NavMoveResultOther;
            let new_best = g.NavMoveRequest && this.navScoreItem(result, nav_bb);
            if (new_best)
            {
                result.ID = id;
                result.SelectScopeId = g.MultiSelectScopeId;
                result.Window = win;
                result.RectRel = nav_bb_rel;
            }

            const VISIBLE_RATIO = 0.7;
            if ((g.NavMoveRequestFlags & NavMoveFlags.AlsoScoreVisibleSet) &&
                win.ClipRect.Overlaps(nav_bb))
            {
                if (Vec1.Clamp(nav_bb.Max.y, win.ClipRect.Min.y, win.ClipRect.Max.y) -
                    Vec1.Clamp(nav_bb.Min.y, win.ClipRect.Min.y, win.ClipRect.Max.y) >=
                    (nav_bb.Max.y - nav_bb.Min.y) * VISIBLE_RATIO)
                {
                    if (this.navScoreItem(g.NavMoveResultLocalVisibleSet, nav_bb))
                    {
                        result = g.NavMoveResultLocalVisibleSet;
                        result.ID = id;
                        result.SelectScopeId = g.MultiSelectScopeId;
                        result.Window = win;
                        result.RectRel = nav_bb_rel;
                    }
                }
            }
        }

        // Update window-relative bounding box of navigated item
        if (g.NavId == id)
        {
            // Always refresh g.NavWindow, because some operations such as
            // focusItem() don't have a window.
            console.assert(win);
            g.NavWindow = win;
            g.NavLayer = win.DC.NavLayerCurrent;
            g.NavIdIsAlive = true;
            g.NavIdTabCounter = win.DC.FocusCounterTab;
            // Store item bounding box (relative to window position)
            win.NavRectRel[win.DC.NavLayerCurrent] = nav_bb_rel;
        }
    },

    navMoveRequestButNoResultYet()
    {
        let g = this.guictx;
        return g.NavMoveRequest && g.NavMoveResultLocal.ID == 0 &&
                g.NavMoveResultOther.ID == 0;
    },

    navMoveRequestCancel()
    {
        let g = this.guictx;
        g.NavMoveRequest = false;
        this.navUpdateAnyRequestFlag();
    },

    navMoveRequestForward(move_dir, clip_dir, bb_rel, move_flags)
    {
        let g = this.guictx;
        console.assert(g.NavMoveRequestForward == NavForward.None);
        this.navMoveRequestCancel();
        g.NavMoveDir = move_dir;
        g.NavMoveClipDir = clip_dir;
        g.NavMoveRequestForward = NavForward.ForwardQueued;
        g.NavMoveRequestFlags = move_flags;
        g.NavWindow.NavRectRel[g.NavLayer] = bb_rel.Clone();
    },

    navMoveRequestTryWrapping(win, move_flags)
    {
        let g = this.guictx;
        if (g.NavWindow != win ||
            !this.navMoveRequestButNoResultYet() ||
            g.NavMoveRequestForward != NavForward.None || g.NavLayer != 0)
        {
            return;
        }
        console.assert(move_flags != 0); // No points calling this with no wrapping
        let bb_rel = win.NavRectRel[0].Clone();
        let clip_dir = g.NavMoveDir;
        if (g.NavMoveDir == Dir.Left &&
            (move_flags & (NavMoveFlags.WrapX | NavMoveFlags.LoopX)))
        {
            bb_rel.Min.x = bb_rel.Max.x =
                Math.max(win.SizeFull.x, win.SizeContents.x) - win.Scroll.x;
            if (move_flags & NavMoveFlags.WrapX)
            {
                bb_rel.TranslateY(-bb_rel.GetHeight());
                clip_dir = Dir.Up;
            }
            this.navMoveRequestForward(g.NavMoveDir, clip_dir, bb_rel, move_flags);
        }
        if (g.NavMoveDir == Dir.Right &&
            (move_flags & (NavMoveFlags.WrapX | NavMoveFlags.LoopX)))
        {
            bb_rel.Min.x = bb_rel.Max.x = -win.Scroll.x;
            if (move_flags & NavMoveFlags.WrapX)
            {
                bb_rel.TranslateY(+bb_rel.GetHeight());
                clip_dir = Dir.Down;
            }
            this.navMoveRequestForward(g.NavMoveDir, clip_dir, bb_rel, move_flags);
        }
        if (g.NavMoveDir == Dir.Up &&
            (move_flags & (NavMoveFlags.WrapY | NavMoveFlags.LoopY)))
        {
            bb_rel.Min.y = bb_rel.Max.y =
                Math.max(win.SizeFull.y, win.SizeContents.y) - win.Scroll.y;
            if (move_flags & NavMoveFlags.WrapY)
            {
                bb_rel.TranslateX(-bb_rel.GetWidth());
                clip_dir = Dir.Left;
            }
            this.navMoveRequestForward(g.NavMoveDir, clip_dir, bb_rel, move_flags);
        }
        if (g.NavMoveDir == Dir.Down &&
            (move_flags & (NavMoveFlags.WrapY | NavMoveFlags.LoopY)))
        {
            bb_rel.Min.y = bb_rel.Max.y = -win.Scroll.y;
            if (move_flags & NavMoveFlags.WrapY)
            {
                bb_rel.wranslateX(+bb_rel.GetWidth());
                clip_dir = Dir.Right;
            }
            this.navMoveRequestForward(g.NavMoveDir, clip_dir, bb_rel, move_flags);
        }
    },

    getNavInputAmount(n, mode)
    {
        let g = this.guictx;
        // Instant, read analog input (0.0f..1., as provided by user)
        if (mode == InputReadMode.Down)
            return g.IO.NavInputs[n];
        const t = g.IO.NavInputsDownDuration[n];
        // Return 1 when just released, no repeat, ignore analog input.
        if (t < 0 && mode == InputReadMode.Released)
            return (g.IO.NavInputsDownDurationPrev[n] >= 0 ? 1 : 0);
        if (t < 0) return 0;

        // Return 1.0f when just pressed, no repeat, ignore analog input.
        if (mode == InputReadMode.Pressed)
            return (t == 0) ? 1 : 0;
        if (mode == InputReadMode.Repeat)
            return this.calcTypematicPressedRepeatAmount(t, t - g.IO.DeltaTime,
                        g.IO.KeyRepeatDelay*0.8, g.IO.KeyRepeatRate*0.8);
        if (mode == InputReadMode.RepeatSlow)
            return this.calcTypematicPressedRepeatAmount(t, t - g.IO.DeltaTime,
                        g.IO.KeyRepeatDelay*1, g.IO.KeyRepeatRate*2);
        if (mode == InputReadMode.RepeatFast)
            return this.calcTypematicPressedRepeatAmount(t, t - g.IO.DeltaTime,
                        g.IO.KeyRepeatDelay*0.8, g.IO.KeyRepeatRate*0.3);
        return 0;
    },

    getNavInputAmount2d(dir_sources, mode, slow_factor, fast_factor)
    {
        let delta = Vec2.Zero().Clone();
        if (dir_sources & NavDirSourceFlags.Keyboard)
        {
            delta.AddXY(this.getNavInputAmount(NavInput.KeyRight_, mode) -
                        this.getNavInputAmount(NavInput.KeyLeft_, mode),
                        this.getNavInputAmount(NavInput.KeyDown_, mode) -
                        this.getNavInputAmount(NavInput.KeyUp_, mode));
        }
        if (dir_sources & NavDirSourceFlags.PadDPad)
        {
            delta.AddXY(this.getNavInputAmount(NavInput.DpadRight, mode) -
                        this.getNavInputAmount(NavInput.DpadLeft, mode),
                        this.getNavInputAmount(NavInput.DpadDown, mode) -
                        this.getNavInputAmount(NavInput.DpadUp,mode));
        }
        if (dir_sources & NavDirSourceFlags.PadLStick)
        {
            delta.AddXY(this.getNavInputAmount(NavInput.LStickRight, mode) -
                        this.getNavInputAmount(NavInput.LStickLeft, mode),
                        this.getNavInputAmount(NavInput.LStickDown, mode) -
                        this.getNavInputAmount(NavInput.LStickUp, mode));
        }
        if (slow_factor != 0 && this.isNavInputDown(NavInput.TweakSlow))
            delta.Mult(slow_factor);
        if (fast_factor != 0 && this.isNavInputDown(NavInput.TweakFast))
            delta.Mult(fast_factor);
        return delta;
    },

    calcTypematicPressedRepeatAmount(t, t_prev, repeat_delay, repeat_rate)
    {
        if (t == 0) return 1;
        if (t <= repeat_delay || repeat_rate <= 0) return 0;
        const count = Math.floor((t-repeat_delay)/repeat_rate) -
                        Math.floor((t_prev-repeat_delay)/repeat_rate);
        return (count > 0) ? count : 0;
    },

    activateItem(id) // remotely activate a button, checkbox, ..
    {
        this.guictx.NavNextActivateId = id;
    },

    setNavID(id, nav_layer)
    {
        let g = this.guictx;
        console.assert(g.NavWindow);
        console.assert(nav_layer == 0 || nav_layer == 1);
        g.NavId = id;
        g.NavWindow.NavLastIds[nav_layer] = id;
    },

    setNavIDWithRectRel(id, nav_layer, rect_rel)
    {
        let g = this.guictx;
        this.setNavID(id, nav_layer);
        g.NavWindow.NavRectRel[nav_layer] = rect_rel;
        g.NavMousePosDirty = true;
        g.NavDisableHighlight = false;
        g.NavDisableMouseHover = true;
    },

    // Windowing management mode
    // Keyboard: CTRL+Tab (change focus/move/resize), Alt (toggle menu layer)
    // Gamepad:  Hold Menu/Square (change focus/move/resize), Tap Menu/Square
    //   (toggle menu layer)
    navUpdateWindowing()
    {
        let g = this.guictx;
        let modal_window = this.getFrontMostPopupModal();
        if (modal_window != null)
        {
            g.NavWindowingTarget = null;
            return;
        }
        let apply_focus_window = null;
        let apply_toggle_layer = false;

        // Fade out
        if (g.NavWindowingTargetAnim && g.NavWindowingTarget == null)
        {
            g.NavWindowingHighlightAlpha =
                Math.max(g.NavWindowingHighlightAlpha - g.IO.DeltaTime * 10, 0);
            if (g.DimBgRatio <= 0 && g.NavWindowingHighlightAlpha <= 0)
                g.NavWindowingTargetAnim = null;
        }

        // Start CTRL-TAB or Square+L/R window selection
        let start_windowing_with_gamepad = !g.NavWindowingTarget &&
                    this.isNavInputPressed(NavInput.Menu, InputReadMode.Pressed);
        let start_windowing_with_keyboard = !g.NavWindowingTarget &&
                g.IO.KeyCtrl && this.isKeyPressedMap(Key.Tab) &&
                (g.IO.ConfigFlags& ConfigFlags.NavEnableKeyboard);

        if (start_windowing_with_gamepad || start_windowing_with_keyboard)
        {
            let window = g.NavWindow ? g.NavWindow :
                this.findWindowNavFocusable(g.WindowsFocusOrder.Size-1,
                                            -Number.MAX_SAFE_INTEGER, -1);
            if (window != null)
            {
                g.NavWindowingTarget = g.NavWindowingTargetAnim = window;
                g.NavWindowingTimer = g.NavWindowingHighlightAlpha = 0;
                g.NavWindowingToggleLayer = start_windowing_with_keyboard ? false : true;
                g.NavInputSource = start_windowing_with_keyboard ?
                            InputSource.NavKeyboard : InputSource.NavGamepad;
            }
        }

        // Gamepad update
        g.NavWindowingTimer += g.IO.DeltaTime;
        if (g.NavWindowingTarget &&
            g.NavInputSource == InputSource.NavGamepad)
        {
            // Highlight only appears after a brief time holding the button,
            // so that a fast tap on PadMenu (to toggle NavLayer) doesn't add
            // visual noise
            g.NavWindowingHighlightAlpha = Math.max(g.NavWindowingHighlightAlpha,
                Vec1.Saturate((g.NavWindowingTimer-NavWinHighlightDelay)/.05));

            // Select window to focus
            const focus_change_dir =
                Math.floor(this.isNavInputPressed(NavInput.FocusPrev, InputReadMode.RepeatSlow))
                - Math.floor(this.isNavInputPressed(NavInput.FocusNext, InputReadMode.RepeatSlow));
            if (focus_change_dir != 0)
            {
                this.navUpdateWindowingHighlightWindow(focus_change_dir);
                g.NavWindowingHighlightAlpha = 1;
            }

            // Single press toggles NavLayer, long press with L/R apply actual
            // focus on release (until then the window was merely rendered front-most)
            if (!this.sNavInputDown(NavInput.Menu))
            {
                // Once button was held long enough we don't consider it a
                //  tap-to-toggle-layer press anymore.
                g.NavWindowingToggleLayer &= (g.NavWindowingHighlightAlpha < 1);
                if (g.NavWindowingToggleLayer && g.NavWindow)
                    apply_toggle_layer = true;
                else
                if (!g.NavWindowingToggleLayer)
                    apply_focus_window = g.NavWindowingTarget;
                g.NavWindowingTarget = null;
            }
        }

        // Keyboard: Focus
        if (g.NavWindowingTarget && g.NavInputSource == InputSource.NavKeyboard)
        {
            // Visuals only appears after a brief time after pressing TAB the
            // first time, so that a fast CTRL+TAB doesn't add visual noise
            g.NavWindowingHighlightAlpha = Math.max(g.NavWindowingHighlightAlpha,
                    Vec1.Saturate((g.NavWindowingTimer-NavWinHighlightDelay)/0.05));
            if (this.isKeyPressedMap(Key.Tab, true))
                this.navUpdateWindowingHighlightWindow(g.IO.KeyShift ? +1 : -1);
            if (!g.IO.KeyCtrl)
                apply_focus_window = g.NavWindowingTarget;
        }

        // Keyboard: Press and Release ALT to toggle menu layer
        // FIXME: We lack an explicit IO variable for "is the imgui window focused",
        // so compare mouse validity to detect the common case of back-end
        // clearing releases all keys on ALT-TAB
        if ((g.ActiveId == 0 || g.ActiveIdAllowOverlap) &&
            this.isNavInputPressed(NavInput.KeyMenu_, InputReadMode.Released))
        {
            if (this.IsMousePosValid(g.IO.MousePos) ==
                this.IsMousePosValid(g.IO.MousePosPrev))
            {
                apply_toggle_layer = true;
            }
        }

        // Move window
        if (g.NavWindowingTarget &&
            !(g.NavWindowingTarget.Flags & WindowFlags.NoMove))
        {
            let move_delta;
            if (g.NavInputSource == InputSource.NavKeyboard && !g.IO.KeyShift)
                move_delta = this.getNavInputAmount2d(NavDirSourceFlags.Keyboard,
                                                        InputReadMode.Down);
            if (g.NavInputSource == InputSource.NavGamepad)
                move_delta = this.getNavInputAmount2d(NavDirSourceFlags.PadLStick,
                                                        InputReadMode.Down);
            if (move_delta.x != 0 || move_delta.y != 0)
            {
                const NAV_MOVE_SPEED = 80.;
                const move_speed = Math.floor(NAV_MOVE_SPEED * g.IO.DeltaTime *
                        Math.min(g.IO.DisplayFramebufferScale.x, g.IO.DisplayFramebufferScale.y));
                    // FIXME: Doesn't code variable framerate very well
                g.NavWindowingTarget.RootWindow.Pos.Add(move_delta.Mult(move_speed));
                g.NavDisableMouseHover = true;
                this.MarkIniSettingsDirty(g.NavWindowingTarget);
            }
        }

        // Apply final focus
        if (apply_focus_window &&
            (g.NavWindow == null || apply_focus_window != g.NavWindow.RootWindow))
        {
            g.NavDisableHighlight = false;
            g.NavDisableMouseHover = true;
            apply_focus_window = this.navRestoreLastChildNavWindow(apply_focus_window);
            this.closePopupsOverWindow(apply_focus_window);
            this.clearActiveID();
            this.FocusWindow(apply_focus_window);
            if (apply_focus_window.NavLastIds[0] == 0)
                this.navInitWindow(apply_focus_window, false);
            // If the window only has a menu layer, select it directly
            if (apply_focus_window.DC.NavLayerActiveMask == (1 << NavLayer.Menu))
                g.NavLayer = NavLayer.Menu;
        }
        if (apply_focus_window)
            g.NavWindowingTarget = null;

        // Apply menu/layer toggle
        if (apply_toggle_layer && g.NavWindow)
        {
            // Move to parent menu if necessary
            let newNavWin = g.NavWindow;
            while ((newNavWin.DC.NavLayerActiveMask & (1 << 1)) == 0 &&
                    (newNavWin.Flags & WindowFlags.ChildWindow) != 0 &&
                    (newNavWin.Flags & (WindowFlags.Popup|WindowFlags.ChildMenu)) == 0)
            {
                newNavWin = newNavWin.ParentWindow;
            }
            if (newNavWin != g.NavWindow)
            {
                let oldNavWin = g.NavWindow;
                this.FocusWindow(newNavWin);
                newNavWin.NavLastChildNavWindow = oldNavWin;
            }
            g.NavDisableHighlight = false;
            g.NavDisableMouseHover = true;
            this.navRestoreLayer(
                (g.NavWindow.DC.NavLayerActiveMask & (1 << NavLayer.Menu)) ?
                (Math.floor(g.NavLayer) ^ 1) : NavLayer.Main); // ^ is xor
        }
    },

    // Window has already passed the IsWindowNavFocusable()
    getFallbackWindowNameForWindowingList(window)
    {
        if (window.Flags & WindowFlags.Popup)
            return "(Popup)";
        if ((window.Flags & WindowFlags.MenuBar) &&
            window.Name == "##MainMenuBar")
            return "(Main menu bar)";
        return "(Untitled)";
    },

    // Overlay displayed when using CTRL+TAB. Called by EndFrame().
    navUpdateWindowingList()
    {
        let g = this.guictx;
        console.assert(g.NavWindowingTarget != null);

        if (g.NavWindowingTimer < NavWinAppearDelay)
            return;

        if (g.NavWindowingList == null)
            g.NavWindowingList = this.findWindowByName("###NavWindowingList");
        this.SetNextWindowSizeConstraints(
                new Vec2(g.IO.DisplaySize.x * 0.2, g.IO.DisplaySize.y * 0.2),
                new Vec2(Number.MAX_VALUE, Number.MAX_VALUE));
        this.SetNextWindowPos(Vec2.Mult(g.IO.DisplaySize, 0.5), CondFlags.Always,
                                new Vec2(0.5, 0.5));
        this.PushStyleVar("WindowPadding", g.Style.WindowPadding * 2.);
        this.Begin("###NavWindowingList", null,
            WindowFlags.NoTitleBar|WindowFlags.NoFocusOnAppearing|
            WindowFlags.NoResize|WindowFlags.NoMove|WindowFlags.NoInputs|
            WindowFlags.AlwaysAutoResize|WindowFlags.NoSavedSettings);
        for (let n=g.WindowsFocusOrder.length - 1; n >= 0; n--)
        {
            let window = g.WindowsFocusOrder[n];
            if (!this.isWindowNavFocusable(window))
                continue;
            let label = window.Name;
            if(label.indexOf("##") != -1)
                label = this.getFallbackWindowNameForWindowingList(window);
            this.Selectable(label, g.NavWindowingTarget==window);
        }
        this.End();
        this.PopStyleVar();
    },

    navCalcPreferredRefPos()
    {
        let g = this.guictx;
        if (g.NavDisableHighlight || !g.NavDisableMouseHover || !g.NavWindow)
        {
            // Mouse (we need a fallback in case the mouse becomes invalid after being used)
            if (this.IsMousePosValid(g.IO.MousePos))
                return g.IO.MousePos;
            return g.LastValidMousePos;
        }
        else
        {
            // When navigation is active and mouse is disabled, decide on an arbitrary position around the bottom left of the currently navigated item.
            let rect_rel = g.NavWindow.NavRectRel[g.NavLayer];
            let pos = Vec2.AddXY(g.NavWindow.Pos,
                                rect_rel.Min.x + Math.min(g.Style.FramePadding.x * 4,
                                                           rect_rel.GetWidth()),
                                rect_rel.Max.y - Math.min(g.Style.FramePadding.y,
                                                            rect_rel.GetHeight()));
            let visible_rect = this.getViewportRect();
            // floor is important because non-integer mouse position application
            // in back-end might be lossy and result in undesirable non-zero delta.
            return Vec2.Clamp(Vec2.Floor(pos, visible_rect.Min, visible_rect.Max));
        }
    },

    // Apply result from previous frame navigation directional move request
    navUpdateMoveResult()
    {
        let g = this.guictx;
        if (g.NavMoveResultLocal.ID == 0 && g.NavMoveResultOther.ID == 0)
        {
            // In a situation when there is no results but NavId != 0, re-enable the Navigation highlight (because g.NavId is not considered as a possible result)
            if (g.NavId != 0)
            {
                g.NavDisableHighlight = false;
                g.NavDisableMouseHover = true;
            }
            return;
        }

        // Select which result to use (of type NavMoveResult)
        let result = (g.NavMoveResultLocal.ID != 0) ? g.NavMoveResultLocal : g.NavMoveResultOther;

        // PageUp/PageDown behavior first jumps to the bottom/top mostly visible
        // item, _otherwise_ use the result from the previous/next page.
        if (g.NavMoveRequestFlags & NavMoveFlags.AlsoScoreVisibleSet)
        {
            if (g.NavMoveResultLocalVisibleSet.ID != 0 &&
                g.NavMoveResultLocalVisibleSet.ID != g.NavId)
            {
                result = g.NavMoveResultLocalVisibleSet;
            }
        }

        // Maybe entering a flattened child from the outside? In this case solve
        // the tie using the regular scoring rules.
        if (result != g.NavMoveResultOther &&
            g.NavMoveResultOther.ID != 0 &&
            g.NavMoveResultOther.Window.ParentWindow == g.NavWindow)
        {
            if ((g.NavMoveResultOther.DistBox < result.DistBox) ||
                (g.NavMoveResultOther.DistBox == result.DistBox &&
                 g.NavMoveResultOther.DistCenter < result.DistCenter))
            {
                result  &g.NavMoveResultOther;
            }
        }
        console.assert(g.NavWindow && result.Window);

        // Scroll to keep newly navigated item fully into view.
        if (g.NavLayer == 0)
        {
            let rect_abs = new Rect(Vec2.Add(result.RectRel.Min, result.Window.Pos),
                                    Vec2.Add(result.RectRel.Max, result.Window.Pos));
            this.navScrollToBringItemIntoView(result.Window, rect_abs);

            // Estimate upcoming scroll so we can offset our result position so mouse position can be applied immediately after in NavUpdate()
            let next_scroll = result.Window.calcNextScrollFromScrollTargetAndClamp(false);
            let delta_scroll = Vec2.Subtract(result.Window.Scroll, next_scroll);
            result.RectRel.Translate(delta_scroll);

            // Also scroll parent window to keep us into view if necessary (we could/should technically recurse back the whole the parent hierarchy).
            if (result.Window.Flags & WindowFlags.ChildWindow)
                this.navScrollToBringItemIntoView(result.Window.ParentWindow,
                            new Rect(Vec2.Add(rect_abs.Min, delta_scroll),
                                     Vec2.Add(rect_abs.Max, delta_scroll)));
        }
    },

    // Scroll to keep newly navigated item fully into view
    // NB: We modify window.ScollTarget by the amount we scrolled for, so it is
    // immediately updated.
    navScrollToBringItemIntoView(win, item_rect)
    {
        let window_rect = new Rect(Vec2.AddXY(win.InnerMainRect.Min, -1, -1),
                                   Vec2.AddXY(win.InnerMainRect.Max + 1, 1));

        //GetForegroundDrawList(window)->AddRect(window_rect.Min, window_rect.Max, IM_COL32_WHITE); // [DEBUG]
        if (window_rect.Contains(item_rect))
            return;
        let g = this.guictx;
        if (win.ScrollbarX && item_rect.Min.x < window_rect.Min.x)
        {
            win.ScrollTarget.x = item_rect.Min.x - win.Pos.x + win.Scroll.x - g.Style.ItemSpacing.x;
            win.ScrollTargetCenterRatio.x = 0;
        }
        else
        if (win.ScrollbarX && item_rect.Max.x >= window_rect.Max.x)
        {
            win.ScrollTarget.x = item_rect.Max.x - win.Pos.x + win.Scroll.x + g.Style.ItemSpacing.x;
            win.ScrollTargetCenterRatio.x = 1;
        }
        if (item_rect.Min.y < window_rect.Min.y)
        {
            win.ScrollTarget.y = item_rect.Min.y - win.Pos.y + win.Scroll.y - g.Style.ItemSpacing.y;
            win.ScrollTargetCenterRatio.y = 0;
        }
        else
        if (item_rect.Max.y >= window_rect.Max.y)
        {
            win.ScrollTarget.y = item_rect.Max.y - win.Pos.y + win.Scroll.y + g.Style.ItemSpacing.y;
            win.ScrollTargetCenterRatio.y = 1;
        }
    },

    navUpdatePageUpPageDown(allowed_dir_flags)
    {
        let g = this.guictx;
        if (g.NavMoveDir == Dir.None && g.NavWindow &&
            !(g.NavWindow.Flags & WindowFlags.NoNavInputs) &&
            !g.NavWindowingTarget && g.NavLayer == 0)
        {
            let win = g.NavWindow;
            let page_up_held = this.IsKeyDown(g.IO.KeyMap[Key.PageUp]) &&
                                    (allowed_dir_flags & (1 << Dir.Up));
            let page_down_held = this.IsKeyDown(g.IO.KeyMap[Key.PageDown]) &&
                                    (allowed_dir_flags & (1 << Dir.Down));
            if (page_up_held != page_down_held) // If either (not both) are pressed
            {
                if (win.DC.NavLayerActiveMask == 0x00 && win.DC.NavHasScroll)
                {
                    // Fallback manual-scroll when window has no navigable item
                    if (this.IsKeyPressed(g.IO.KeyMap[Key.PageUp], true))
                        win.SetWindowScrollY(win.Scroll.y - win.InnerClipRect.GetHeight());
                    else
                    if (this.IsKeyPressed(g.IO.KeyMap[Key.PageDown], true))
                        win.SetWindowScrollY(win.Scroll.y + win.InnerClipRect.GetHeight());
                }
                else
                {
                    let nav_rect_rel = win.NavRectRel[g.NavLayer];
                    const page_offset_y = Math.max(0.,
                                        win.InnerClipRect.GetHeight() -
                                        win.CalcLineHeight() * 1 +
                                        nav_rect_rel.GetHeight());
                    let nav_scoring_rect_offset_y = 0.;
                    if (this.IsKeyPressed(g.IO.KeyMap[Key.PageUp], true))
                    {
                        nav_scoring_rect_offset_y = -page_offset_y;
                        // Because our scoring rect is offset, we intentionally
                        // request the opposite direction (so we can always land
                        // on the last item)
                        g.NavMoveDir = Dir.Down;
                        g.NavMoveClipDir = Dir.Up;
                        g.NavMoveRequestFlags = NavMoveFlags.AllowCurrentNavId |
                                                NavMoveFlags.AlsoScoreVisibleSet;
                    }
                    else
                    if (this.IsKeyPressed(g.IO.KeyMap[Key.PageDown], true))
                    {
                        nav_scoring_rect_offset_y = page_offset_y;
                        // Because our scoring rect is offset, we intentionally
                        // request the opposite direction (so we can always land
                        // on the last item)
                        g.NavMoveDir = Dir.Up;
                        g.NavMoveClipDir = Dir.Down;
                        g.NavMoveRequestFlags = NavMoveFlags.AllowCurrentNavId |
                                                NavMoveFlags.AlsoScoreVisibleSet;
                    }
                    return nav_scoring_rect_offset_y;
                }
            }
        }
        return 0.;
    },

    navUpdateAnyRequestFlag()
    {
        let g = this.guictx;
        g.NavAnyRequest = g.NavMoveRequest || g.NavInitRequest;
        if (g.NavAnyRequest)
            console.assert(g.NavWindow);
    },

    // FIXME: This could be replaced by updating a frame number in each
    // window when (window == NavWindow) and (NavLayer == 0). This way we could
    // find the last focused window among our children. It would be much
    // less confusing this way?
    navSaveLastChildNavWindowIntoParent(nav_window)
    {
        let parent = nav_window;
        while (parent && (parent.Flags & WindowFlags.ChildWindow) != 0 &&
                (parent.Flags & (WindowFlags.Popup | WindowFlags.ChildMenu)) == 0)
        {
            parent = parent.ParentWindow;
        }
        if (parent && parent != nav_window)
            parent.NavLastChildNavWindow = nav_window;
    },

    navGetDirQuadrantFromDelta(dx, dy)
    {
        if (Math.abs(dx) > Math.abs(dy))
            return (dx > 0) ? Dir.Right : Dir.Left;
        else
            return (dy > 0) ? Dir.Down : Dir.Up;
    },

    navScoreItemDistInterval(a0, a1, b0, b1)
    {
        if (a1 < b0)
            return a1 - b0;
        if (b1 < a0)
            return a0 - b1;
        return 0;
    },

    navClampRectToVisibleAreaForMoveDir(move_dir, r, clip_rect)
    {
        if (move_dir == Dir.Left || move_dir == Dir.Right)
        {
            r.Min.y = Vec1.Clamp(r.Min.y, clip_rect.Min.y, clip_rect.Max.y);
            r.Max.y = Vec1.Clamp(r.Max.y, clip_rect.Min.y, clip_rect.Max.y);
        }
        else
        {
            r.Min.x = Vec1.Clamp(r.Min.x, clip_rect.Min.x, clip_rect.Max.x);
            r.Max.x = Vec1.Clamp(r.Max.x, clip_rect.Min.x, clip_rect.Max.x);
        }
    },

    // Scoring function for directional navigation. Based on
    // https://gist.github.com/rygorous/6981057
    navScoreItem(result, cand)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (g.NavLayer != win.DC.NavLayerCurrent)
            return false;

        // Current modified source rect (NB: we've applied max.x = min.x in
        // NavUpdate() to inhibit the effect of having varied item width)
        let curr = g.NavScoringRectScreen;
        g.NavScoringCount++;

        // When entering through a NavFlattened border, we consider child
        // window items as fully clipped for scoring
        if (win.ParentWindow == g.NavWindow)
        {
            console.assert((win.Flags | g.NavWindow.Flags) & WindowFlags.NavFlattened);
            if (!win.ClipRect.Contains(cand))
                return false;
            // This allows the scored item to not overlap other candidates in
            // the parent window
            cand.ClipWithFull(win.ClipRect);
        }

        // We perform scoring on items bounding box clipped by the current
        // clipping rectangle on the other axis (clipping on our movement axis
        // would give us equal scores for all clipped items) For example, this
        // ensure that items in one column are not reached when moving vertically
        // from items in another column.
        this.navClampRectToVisibleAreaForMoveDir(g.NavMoveClipDir, cand, win.ClipRect);

        // Compute distance between boxes
        // FIXME-NAV: Introducing biases for vertical navigation, needs to be removed.
        let dbx = this.navScoreItemDistInterval(cand.Min.x, cand.Max.x, curr.Min.x, curr.Max.x);
        // Scale down on Y to keep using box-distance for vertically touching items
        let dby = this.navScoreItemDistInterval(Vec1.Lerp(cand.Min.y, cand.Max.y, 0.2),
                                                Vec1.Lerp(cand.Min.y, cand.Max.y, 0.8),
                                                Vec1.Lerp(curr.Min.y, curr.Max.y, 0.2),
                                                Vec1.Lerp(curr.Min.y, curr.Max.y, 0.8));
        if (dby != 0 && dbx != 0)
           dbx = (dbx/1000) + ((dbx > 0) ? +1 : -1);
        let dist_box = Math.abs(dbx) + Math.abs(dby);

        // Compute distance between centers (this is off by a factor of 2, but
        // we only compare center distances with each other so it doesn't matter)
        let dcx = (cand.Min.x + cand.Max.x) - (curr.Min.x + curr.Max.x);
        let dcy = (cand.Min.y + cand.Max.y) - (curr.Min.y + curr.Max.y);
        let dist_center = Math.abs(dcx) + Math.abs(dcy);
        // L1 metric (need this for our connectedness guarantee)
        // Determine which quadrant of 'curr' our candidate item 'cand' lies in based on distance

        let quadrant;
        let dax = 0, day = 0, dist_axial = 0;
        if (dbx != 0 || dby != 0)
        {
            // For non-overlapping boxes, use distance between boxes
            dax = dbx;
            day = dby;
            dist_axial = dist_box;
            quadrant = this.navGetDirQuadrantFromDelta(dbx, dby);
        }
        else
        if (dcx != 0 || dcy != 0)
        {
            // For overlapping boxes with different centers, use distance
            // between centers
            dax = dcx;
            day = dcy;
            dist_axial = dist_center;
            quadrant = this.navGetDirQuadrantFromDelta(dcx, dcy);
        }
        else
        {
            // Degenerate case: two overlapping buttons with same center,
            // break ties arbitrarily (note that LastItemId here is really
            //  the _previous_ item order, but it doesn't matter)
            quadrant = (win.DC.LastItemId < g.NavId) ? Dir.Left : Dir.Right;
        }

        if(0) // DEBUG/visualize
        {
            let style = g.Style;
            if (this.IsMouseHoveringRect(cand.Min, cand.Max))
            {
                let buf = `dbox ${dbx},${dby}->${dist_box}\n` +
                          `dcen ${dcx},${dcy}->${dist_center}\n` +
                          `dax ${dax},${day} ->${dist_axial}\n` +
                          `nav ${"WENS"[g.NavMovDir]}, quadrant ${"WENS"[quadrant]}`;
                let dl = this.GetForegroundDrawList(win);
                dl.AddRect(curr.Min, curr.Max, style.GetColor("_DEBUG1"));
                dl.AddRect(cand.Min, cand.Max, style.GetColor("_DEBUG2"));
                dl.AddRectFilled(Vec2.AddXY(cand.Max, -4,-4),
                                 Vec2.Add(cand.Max,this.CalcTextSize(buf)),
                                 style.GetColor("_DEBUG3"));
                dl.AddText(buf, cand.Max, style.GetFont("Default"),
                            g.FontLineHeight, style.GetColor("Text"));
            }
            else
            if (g.IO.KeyCtrl) // Hold to preview score in matching quadrant. Press C to rotate.
            {
                if (this.IsKeyPressedMap(Key.C))
                {
                    g.NavMoveDirLast = (g.NavMoveDirLast + 1) & 3;
                    g.IO.KeysDownDuration[g.IO.KeyMap[Key.C]] = 0.01;
                }
                if (quadrant == g.NavMoveDir)
                {
                    let buf = `${dist_box}/${dist_center}`;
                    let dl = this.GetForegroundDrawList(win);
                    dl.AddRectFilled(cand.Min, cand.Max, style.GetColor("_DEBUG0"));
                    dl.AddText(buf, cand.Min, style.GetFont("Default"),
                                g.FontLineHeight, style.getColor("Text"));
                }
            }
        } // end debug

        // Is it in the quadrant we're interesting in moving to?
        let new_best = false;
        if (quadrant == g.NavMoveDir)
        {
            // Does it beat the current best candidate?
            if (dist_box < result.DistBox)
            {
                result.DistBox = dist_box;
                result.DistCenter = dist_center;
                return true;
            }
            if (dist_box == result.DistBox)
            {
                // Try using distance between center points to break ties
                if (dist_center < result.DistCenter)
                {
                    result.DistCenter = dist_center;
                    new_best = true;
                }
                else
                if (dist_center == result.DistCenter)
                {
                    // Still tied! we need to be extra-careful to make sure
                    // everything gets linked properly. We consistently break
                    // ties by symbolically moving "later" items (with higher
                    // index) to the right/downwards by an infinitesimal amount
                    // since we the current "best" button already (so it must
                    // have a lower index), this is fairly easy. This rule
                    // ensures that all buttons with dx==dy==0 will end up being
                    // linked in order of appearance along the x axis.
                    if (((g.NavMoveDir == Dir.Up || g.NavMoveDir == Dir.Down) ? dby : dbx) < 0)
                    {
                        // moving bj to the right/down decreases distance
                        new_best = true;
                    }
                }
            }
        }

        // Axial check: if 'curr' has no link at all in some direction and
        // 'cand' lies roughly in that direction, add a tentative link. This
        // will only be kept if no "real" matches are found, so it only augments
        // the graph produced by the above method using extra links. (important,
        // since it doesn't guarantee strong connectedness). This is just to
        // avoid buttons having no links in a particular direction when there's
        // a suitable neighbor. you get good graphs without this too.
        // 2017/09/29: FIXME: This now currently only enabled inside menu bars,
        // ideally we'd disable it everywhere. Menus in particular need to catch
        // failure. For general navigation it feels awkward.  Disabling it may
        // lead to disconnected graphs when nodes are very spaced out on
        // different axis. Perhaps consider offering this as an option?
        if (result.DistBox == Number.MAX_VALUE && dist_axial < result.DistAxial)  // Check axial match
        {
            if (g.NavLayer == 1 && !(g.NavWindow.Flags & WindowFlags.ChildMenu))
            {
                if ((g.NavMoveDir == Dir.Left && dax < 0) ||
                    (g.NavMoveDir == Dir.Right && dax > 0) ||
                    (g.NavMoveDir == Dir.Up && day < 0) ||
                    (g.NavMoveDir == Dir.Down && day > 0.))
                {
                    result.DistAxial = dist_axial;
                    new_best = true;
                }
            }
        }
        return new_best;
    }
};