import {Window, WindowFlags, ResizeGripDefs} from "./window.js";
import {DragDropFlags} from "./dragdrop.js";
import {CondFlags, ConfigFlags, FocusedFlags,
        ItemFlags, ItemStatusFlags, NavHighlightFlags, HoveredFlags,
        CornerFlags, DrawListFlags} from "./flags.js";
import {InputSource, NavLayer, LayoutType, Dir, Axis} from "./enums.js";
import {Vec2, Rect, Vec1, ValRef} from "./types.js";
import {ArrayEx} from "./arrayex.js";

/* local classes (exported mixin below) -------------------------*/
// Window resizing from edges (when io.ConfigWindowsResizeFromEdges = true
// and BackendFlags.HasMouseCursors is set in io.BackendFlags by back-end)

// Extend outside and inside windows. Affect FindHoveredWindow().
const WinResizeEdgeHalf = 4.;

/* ---------------------------------------------------------------*/
export var ImguiWinMgrMixin =
{
    /**
    // Push a new ImGui window to add widgets to.
    // - A default window called "Debug" is automatically stacked at the
    //   beginning of every frame so you can use widgets without explicitly
    //   calling a Begin/End pair.
    // - Begin/End can be called multiple times during the frame with the
    //   same window name to append content.
    // - The window name is used as a unique identifier to preserve window
    //   information across frames (and save rudimentary information to the .ini file).
    //   You can use the "##" or "###" markers to use the same label with
    //   different id, or same id with different label. See documentation
    //   elsewhere.
    // - Return false when window is collapsed, so you can early out in your
    //   code. You always need to call End() even if false is returned.
    // - Passing 'ValRef p_open' displays a Close button on the upper-right
    //   corner of the window, the pointed value will be set to false when the
    //   button is pressed.
     */
    Begin(name, p_open=null, flags=0)
    {
        let g = this.guictx;
        const style = g.Style;
        console.assert(name.length);     // Window name required
        console.assert(g.FrameScopeActive);                  // Forgot to call ImGui::NewFrame()
        console.assert(g.FrameCountEnded != g.FrameCount);   // Called ImGui::Render() or ImGui::EndFrame() and haven't called ImGui::NewFrame() again yet

        // Find or create
        // name of a window may not equal title (so we can change the title)
        let sname = name.split("##");
        name = sname[sname.length-1];
        let title = sname[0];
        let win = this.findWindowByName(name);
        const window_just_created = (win == null);
        if (window_just_created)
        {
            // Any condition flag will do since we are creating a new window here.
            let sz = (g.NextWindowData.SizeCond != 0) ?
                    g.NextWindowData.SizeVal : Vec2.Zero();
            win = this.createNewWindow(name, sz, flags);
        }

        // Automatically disable manual moving/resizing when NoInputs is set
        if ((flags & WindowFlags.NoInputs) == WindowFlags.NoInputs)
            flags |= WindowFlags.NoMove | WindowFlags.NoResize;

        if (flags & WindowFlags.NavFlattened)
            console.assert(flags & WindowFlags.ChildWindow);

        const current_frame = g.FrameCount;
        const first_begin_of_the_frame = (win.LastFrameActive != current_frame);

        // Update the Appearing flag
        // Not using !WasActive because the implicit "Debug" window would always
        // toggle off.on
        let window_just_activated_by_user = (win.LastFrameActive < current_frame - 1);
        const window_just_appearing_after_hidden_for_resize =
                (win.HiddenFramesCannotSkipItems > 0);
        if (flags & WindowFlags.Popup)
        {
            let popup_ref = g.OpenPopupStack[g.BeginPopupStack.length];
            window_just_activated_by_user |= (win.PopupId != popup_ref.PopupId); // We recycle popups so treat window as activated if popup id changed
            window_just_activated_by_user |= (win != popup_ref.Window);
        }
        win.Appearing = (window_just_activated_by_user ||
                         window_just_appearing_after_hidden_for_resize);
        if (win.Appearing)
            win.SetWindowConditionAllowFlags(CondFlags.Appearing, true);

        // Update Flags, LastFrameActive, BeginOrderXXX fields
        if (first_begin_of_the_frame)
        {
            win.Flags = flags;
            win.LastFrameActive = current_frame;
            win.BeginOrderWithinParent = 0;
            win.BeginOrderWithinContext = g.WindowsActiveCount++;
        }
        else
        {
            flags = win.Flags;
        }

        // Parent window is latched only on the first call to Begin() of the
        // frame, so further append-calls can be done from a different window stack
        let parent_window_in_stack = g.CurrentWindowStack.empty() ?
                                        null : g.CurrentWindowStack.back();
        let parent_window = first_begin_of_the_frame ?
                    ((flags & (WindowFlags.ChildWindow|WindowFlags.Popup)) ? parent_window_in_stack : null)
                    : win.ParentWindow;
        console.assert(parent_window != null || !(flags & WindowFlags.ChildWindow));

        // Add to stack
        // We intentionally set g.CurrentWindow to NULL to prevent usage until
        // when the viewport is set, then will call setCurrentWindow()
        g.CurrentWindowStack.push_back(win);
        g.CurrentWindow = null;
        this.checkStacksSize(win, true);
        if (flags & WindowFlags.Popup)
        {
            let popup_ref = g.OpenPopupStack[g.BeginPopupStack.length];
            popup_ref.Window = win;
            g.BeginPopupStack.push_back(popup_ref);
            win.PopupId = popup_ref.PopupId;
        }

        if (window_just_appearing_after_hidden_for_resize &&
            !(flags & WindowFlags.ChildWindow))
        {
            win.NavLastIds[0] = 0;
        }

        // Process SetNextWindow***() calls
        let window_pos_set_by_api = false;
        let window_size_x_set_by_api = false, window_size_y_set_by_api = false;
        if (g.NextWindowData.PosCond)
        {
            window_pos_set_by_api = (win.SetWindowPosAllowFlags & g.NextWindowData.PosCond) != 0;
            if (window_pos_set_by_api &&
                g.NextWindowData.PosPivotVal.LengthSq() > 0.00001)
            {
                // May be processed on the next frame if this is our first frame
                // and we are measuring size FIXME: Look into removing the
                // branch so everything can go through this same code path for
                // consistency.
                win.SetWindowPosVal.Copy(g.NextWindowData.PosVal);
                win.SetWindowPosPivot.Copy(g.NextWindowData.PosPivotVal);
                win.SetWindowPosAllowFlags &= ~(CondFlags.Once | CondFlags.FirstUseEver | CondFlags.Appearing);
            }
            else
            {
                win.SetWindowPos(g.NextWindowData.PosVal, g.NextWindowData.PosCond);
            }
        }
        if (g.NextWindowData.SizeCond)
        {
            window_size_x_set_by_api = (win.SetWindowSizeAllowFlags & g.NextWindowData.SizeCond) != 0
                                        && (g.NextWindowData.SizeVal.x > 0);
            window_size_y_set_by_api = (win.SetWindowSizeAllowFlags & g.NextWindowData.SizeCond) != 0
                                        && (g.NextWindowData.SizeVal.y > 0);
            win.SetWindowSize(g.NextWindowData.SizeVal, g.NextWindowData.SizeCond);
        }
        if(g.NextWindowData.ZIndexCond)
        {
            win.ZIndex = g.NextWindowData.ZIndex;
        }
        if (g.NextWindowData.ContentSizeCond)
        {
            // Adjust passed "client size" to become a "window size"
            win.SizeContentsExplicit.Copy(g.NextWindowData.ContentSizeVal);
            if (win.SizeContentsExplicit.y != 0)
                win.SizeContentsExplicit.y += win.TitleBarHeight() + win.MenuBarHeight();
        }
        else
        if (first_begin_of_the_frame)
        {
            win.SizeContentsExplicit = new Vec2(0, 0);
        }
        if (g.NextWindowData.CollapsedCond)
            win.SetWindowCollapsed(g.NextWindowData.CollapsedVal, g.NextWindowData.CollapsedCond);
        if (g.NextWindowData.FocusCond)
            this.FocusWindow(win);
        if (win.Appearing)
            win.SetWindowConditionAllowFlags(CondFlags.Appearing, false);

        // When reusing window again multiple times a frame, just append
        // content (don't need to setup again)
        if (first_begin_of_the_frame)
        {
            // Initialize
            const window_is_child_tooltip = (flags & WindowFlags.ChildWindow) &&
                                            (flags & WindowFlags.Tooltip);
            // FIXME-WIP: Undocumented behavior of Child+Tooltip for pinned tooltip (#1345)
            win.UpdateWindowParentAndRootLinks(flags, parent_window);

            win.Active = true;
            win.HasCloseButton = (p_open != null);
            win.ClipRect = Rect.FromXY(-Number.MAX_VALUE,-Number.MAX_VALUE,
                                       +Number.MAX_VALUE,+Number.MAX_VALUE);
            win.IDStack.resize(1);

            // Update stored window name when it changes (which can _only_
            // happen with the "###" operator, so the ID would stay unchanged).
            // The title bar always display the 'name' parameter, so we only
            // update the string storage if it needs to be visible to the
            // end-user elsewhere.
            let window_title_visible_elsewhere = false;
            if (g.NavWindowingList != null &&
                (win.Flags & WindowFlags.NoNavFocus) == 0)
            {
                // Window titles visible when using CTRL+TAB
                window_title_visible_elsewhere = true;
            }
            if (window_title_visible_elsewhere &&
                !window_just_created && name != win.Name)
            {
                win.Name = name;
            }

            // UPDATE CONTENTS SIZE, UPDATE HIDDEN STATUS

            // Update contents size from last frame for auto-fitting (or use explicit size)
            win.SizeContents = win.CalcSizeContents(win);
            if (win.HiddenFramesCanSkipItems > 0)
                win.HiddenFramesCanSkipItems--;
            if (win.HiddenFramesCannotSkipItems > 0)
                win.HiddenFramesCannotSkipItems--;

            // Hide new windows for one frame until they calculate their size
            if (window_just_created &&
                (!window_size_x_set_by_api || !window_size_y_set_by_api))
            {
                win.HiddenFramesCannotSkipItems = 1;
            }

            // Hide popup/tooltip window when re-opening while we measure size
            // (because we recycle the windows). We reset Size/SizeContents for
            // reappearing popups/tooltips early in this function, so further
            // code won't be tempted to use the old size.
            if (window_just_activated_by_user &&
                (flags & (WindowFlags.Popup | WindowFlags.Tooltip)) != 0)
            {
                win.HiddenFramesCannotSkipItems = 1;
                if (flags & WindowFlags.AlwaysAutoResize)
                {
                    if (!window_size_x_set_by_api)
                        win.Size.x = win.SizeFull.x = 0;
                    if (!window_size_y_set_by_api)
                        win.Size.y = win.SizeFull.y = 0;
                    win.SizeContents = new Vec2(0, 0);
                    // console.log("always resize");
                }
            }

            this.setCurrentWindow(win);

            // Lock border size and padding for the frame (so that altering
            // them doesn't cause inconsistencies)
            if (flags & WindowFlags.ChildWindow)
                win.WindowBorderSize = style.ChildBorderSize;
            else
                win.WindowBorderSize =
                    ((flags & (WindowFlags.Popup | WindowFlags.Tooltip)) &&
                     !(flags & WindowFlags.Modal)) ? style.PopupBorderSize :
                                                     style.WindowBorderSize;
            win.WindowPadding = style.WindowPadding;
            if ((flags & WindowFlags.ChildWindow) &&
                !(flags & (WindowFlags.AlwaysUseWindowPadding | WindowFlags.Popup)) &&
                    win.WindowBorderSize == 0)
            {
                win.WindowPadding = new Vec2(0, (flags & WindowFlags.MenuBar) ?
                                                    style.WindowPadding.y : 0);
            }
            win.DC.MenuBarOffset.x = Math.max(Math.max(win.WindowPadding.x,
                                                        style.ItemSpacing.x),
                                        g.NextWindowData.MenuBarOffsetMinVal.x);
            win.DC.MenuBarOffset.y = g.NextWindowData.MenuBarOffsetMinVal.y;

            // Collapse window by double-clicking on title bar
            // At this point we don't have a clipping rectangle setup yet, so
            // we can use the title bar area for hit detection and drawing
            if (!(flags & WindowFlags.NoTitleBar) &&
                !(flags & WindowFlags.NoCollapse))
            {
                // We don't use a regular button+id to test for double-click on
                // title bar (mostly due to legacy reason, could be fixed), so
                // verify that we don't have items over the title bar.
                let title_bar_rect = win.TitleBarRect(); // no clone needed
                if (g.HoveredWindow == window && g.HoveredId == 0 &&
                    g.HoveredIdPreviousFrame == 0 &&
                    this.IsMouseHoveringRect(title_bar_rect.Min, title_bar_rect.Max)
                    && g.IO.MouseDoubleClicked[0])
                {
                    win.WantCollapseToggle = true;
                }
                if (win.WantCollapseToggle)
                {
                    win.Collapsed = !win.Collapsed;
                    this.MarkIniSettingsDirty(win);
                    this.FocusWindow(win);
                }
            }
            else
            {
                win.Collapsed = false;
            }
            win.WantCollapseToggle = false;

            // SIZE

            // Calculate auto-fit size, handle automatic resize
            const size_auto_fit = win.CalcSizeAutoFit(win.SizeContents);
            let size_full_modified = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
            if ((flags & WindowFlags.AlwaysAutoResize) && !win.Collapsed)
            {
                // Using SetNextWindowSize() overrides WindowFlags.AlwaysAutoResize,
                // so it can be used on tooltips/popups, etc.
                if (!window_size_x_set_by_api)
                    win.SizeFull.x = size_full_modified.x = size_auto_fit.x;
                if (!window_size_y_set_by_api)
                    win.SizeFull.y = size_full_modified.y = size_auto_fit.y;
            }
            else
            if (win.AutoFitFramesX > 0 || win.AutoFitFramesY > 0)
            {
                // Auto-fit may only grow window during the first few frames
                // We still process initial auto-fit on collapsed windows to
                // get a window width, but otherwise don't honor
                // WindowFlags.AlwaysAutoResize when collapsed.
                if (!window_size_x_set_by_api && win.AutoFitFramesX > 0)
                {
                    win.SizeFull.x = size_full_modified.x =
                        win.AutoFitOnlyGrows ?
                        Math.max(win.SizeFull.x, size_auto_fit.x) : size_auto_fit.x;
                }
                if (!window_size_y_set_by_api && win.AutoFitFramesY > 0)
                {
                    win.SizeFull.y = size_full_modified.y =
                        win.AutoFitOnlyGrows ?
                            Math.max(win.SizeFull.y, size_auto_fit.y) : size_auto_fit.y;
                }
                if (!win.Collapsed)
                {
                    this.MarkIniSettingsDirty(win);
                }
            }

            // Apply minimum/maximum window size constraints and final size
            win.SizeFull = win.CalcSizeAfterConstraint(win.SizeFull);
            win.Size = win.Collapsed && !(flags & WindowFlags.ChildWindow) ?
                        win.TitleBarRect().GetSize() : win.SizeFull;

            // SCROLLBAR STATUS

            // Update scrollbar status (based on the Size that was effective
            // during last frame or the auto-resized Size).
            if (!win.Collapsed)
            {
                // When reading the current size we need to read it after size
                // constraints have been applied
                let size_x_for_scrollbars =
                    size_full_modified.x != Number.MAX_VALUE ?
                        win.SizeFull.x : win.SizeFullAtLastBegin.x;
                let size_y_for_scrollbars =
                    size_full_modified.y != Number.MAX_VALUE ?
                        win.SizeFull.y : win.SizeFullAtLastBegin.y;
                win.ScrollbarY = (flags & WindowFlags.AlwaysVerticalScrollbar) ||
                                 ((win.SizeContents.y > size_y_for_scrollbars) &&
                                  !(flags & WindowFlags.NoScrollbar));
                win.ScrollbarX = (flags & WindowFlags.AlwaysHorizontalScrollbar) ||
                                 ((win.SizeContents.x > size_x_for_scrollbars -
                                    (win.ScrollbarY ? style.ScrollbarSize : 0)) &&
                                  !(flags & WindowFlags.NoScrollbar) &&
                                   (flags & WindowFlags.HorizontalScrollbar));
                if (win.ScrollbarX && !win.ScrollbarY)
                {
                    win.ScrollbarY = (win.SizeContents.y > size_y_for_scrollbars - style.ScrollbarSize)
                                        && !(flags & WindowFlags.NoScrollbar);
                }
                win.ScrollbarSizes = new Vec2(win.ScrollbarY ? style.ScrollbarSize : 0,
                                              win.ScrollbarX ? style.ScrollbarSize : 0);
            }

            // POSITION

            // Popup latch its initial position, will position itself when it
            // appears next frame
            if (window_just_activated_by_user)
            {
                win.AutoPosLastDirection = Dir.None;
                if ((flags & WindowFlags.Popup) != 0 && !window_pos_set_by_api)
                    win.Pos = g.BeginPopupStack.back().OpenPopupPos;
            }

            // Position child window
            if (flags & WindowFlags.ChildWindow)
            {
                console.assert(parent_window && parent_window.Active);
                win.BeginOrderWithinParent = parent_window.DC.ChildWindows.length;
                parent_window.DC.ChildWindows.push_back(win);
                if (!(flags & WindowFlags.Popup) &&
                    !window_pos_set_by_api && !window_is_child_tooltip)
                {
                    win.Pos.Copy(parent_window.DC.CursorPos);
                }
            }

            const window_pos_with_pivot = (win.SetWindowPosVal.x != Number.MAX_VALUE &&
                                            win.HiddenFramesCannotSkipItems == 0);
            if (window_pos_with_pivot)
            {
                // Position given a pivot (e.g. for centering)
                win.SetWindowPos(Vec2.Max(style.DisplaySafeAreaPadding,
                    Vec2.Subtract(win.SetWindowPosVal,
                            Vec2.Mult(win.SizeFull, win.SetWindowPosPivot))),
                    0);
            }
            else
            if ((flags & WindowFlags.ChildMenu) != 0)
                win.Pos = this.findBestWindowPosForPopup(win);
            else
            if ((flags & WindowFlags.Popup) != 0 &&
                !window_pos_set_by_api && window_just_appearing_after_hidden_for_resize)
            {
                win.Pos = this.findBestWindowPosForPopup(win);
            }
            else
            if ((flags & WindowFlags.Tooltip) != 0 &&
                !window_pos_set_by_api && !window_is_child_tooltip)
            {
                win.Pos = this.findBestWindowPosForPopup(win);
            }

            // Clamp position so it stays visible
            // Ignore zero-sized display explicitly to avoid losing positions
            // if a window manager reports zero-sized window when initializing
            // or minimizing.
            let viewport_rect = this.getViewportRect();
            if (!window_pos_set_by_api &&
                !(flags & WindowFlags.ChildWindow) &&
                win.AutoFitFramesX <= 0 && win.AutoFitFramesY <= 0)
            {
                // Ignore zero-sized display explicitly to avoid losing
                // positions  if a window manager reports zero-sized window
                // when initializing or minimizing.
                if (g.IO.DisplaySize.x > 0 && g.IO.DisplaySize.y > 0)
                {
                    let clamp_padding = Vec2.Max(style.DisplayWindowPadding,
                                                 style.DisplaySafeAreaPadding);
                    win.ClampWindowRect(viewport_rect, clamp_padding);
                }
            }
            win.Pos = Vec2.Floor(win.Pos);

            // Lock window rounding for the frame (so that altering them
            // doesn't cause inconsistencies)
            win.WindowRounding = (flags & WindowFlags.ChildWindow) ?
                                        style.ChildRounding :
                                        ((flags & WindowFlags.Popup) &&
                                         !(flags & WindowFlags.Modal)) ?
                                            style.PopupRounding : style.WindowRounding;

            // Apply scrolling
            win.CalcNextScrollFromScrollTargetAndClamp(true);

            // Apply window focus (new and reactivated windows are moved to front)
            let want_focus = false;
            if (window_just_activated_by_user &&
                !(flags & WindowFlags.NoFocusOnAppearing))
            {
                if (flags & WindowFlags.Popup)
                    want_focus = true;
                else
                if ((flags & (WindowFlags.ChildWindow | WindowFlags.Tooltip)) == 0)
                    want_focus = true;
            }

            // Handle manual resize: Resize Grips, Borders, Gamepad
            let border_held = new ValRef(-1);
            let resize_grip_col = [ null, null, null, null ];
            const resize_grip_count = g.IO.ConfigWindowsResizeFromEdges ? 2 : 1; // 4
            const grip_draw_size = Math.floor(Math.max(g.FontSize * 1.35,
                                    win.WindowRounding + 1 + g.FontSize*0.2));
            if (!win.Collapsed)
            {
                win.UpdateManualResize(size_auto_fit, border_held,
                                    resize_grip_count, resize_grip_col);
            }
            win.ResizeBorderHeld = border_held.get();

            // Default item width. Make it proportional to window size if
            // window manually resizes
            if (win.Size.x > 0 && !(flags & WindowFlags.Tooltip) &&
                !(flags & WindowFlags.AlwaysAutoResize))
            {
                win.ItemWidthDefault = Math.floor(win.Size.x * 0.65);
            }
            else
                win.ItemWidthDefault = Math.floor(g.FontSize * 16);

            // DRAWING

            // Setup draw list and outer clipping rectangle
            win.DrawList.Clear();
            win.DrawList.Flags = (g.Style.AntiAliasedLines ? DrawListFlags.AntiAliasedLines : 0) |
                                 (g.Style.AntiAliasedFill ? DrawListFlags.AntiAliasedFill : 0);
            // win.DrawList.PushTextureID(g.Font.ContainerAtlas.TexID);
            if(flags & WindowFlags.Tooltip) // dbadb.. native does this in flatting drawlists
                win.DrawList.BeginLayer(1);
            if ((flags & WindowFlags.ChildWindow) &&
                !(flags & WindowFlags.Popup) && !window_is_child_tooltip)
            {
                this.PushClipRect(parent_window.ClipRect.Min,
                                  parent_window.ClipRect.Max, true);
            }
            else
            {
                this.PushClipRect(viewport_rect.Min, viewport_rect.Max, true);
            }

            // Draw modal window background (darkens what is behind them,
            //  all viewports)
            const dim_bg_for_modal = (flags & WindowFlags.Modal) &&
                                        win == this.getFrontMostPopupModal() &&
                                        win.HiddenFramesCannotSkipItems <= 0;
            const dim_bg_for_window_list = g.NavWindowingTargetAnim &&
                                    (win == g.NavWindowingTargetAnim.RootWindow);
            if (dim_bg_for_modal || dim_bg_for_window_list)
            {
                const dim_bg_col = style.GetColor(dim_bg_for_modal ?
                            "ModalWindowDimBg" : "NavWindowingDimBg",
                            g.DimBgRatio);
                win.DrawList.AddRectFilled(viewport_rect.Min, viewport_rect.Max,
                                            dim_bg_col);
            }

            // Draw navigation selection/windowing rectangle background
            if (dim_bg_for_window_list && win == g.NavWindowingTargetAnim)
            {
                let bb = win.Rect();
                bb.Expand(g.FontSize);
                // Avoid drawing if the window covers all the viewport anyway
                if (!bb.Contains(viewport_rect))
                {
                    win.DrawList.AddRectFilled(bb.Min, bb.Max,
                            style.GetColor("NavWindowingHighlight",
                                            g.NavWindowingHighlightAlpha * 0.25),
                                           g.Style.WindowRounding);
                }
            }

            // Draw window + handle manual resize
            // As we highlight the title bar when want_focus is set, multiple
            // reappearing windows will have have their title bar highlighted
            // on their reappearing frame.
            const window_rounding = win.WindowRounding;
            const window_border_size = win.WindowBorderSize;
            const window_to_highlight = g.NavWindowingTarget ?
                                    g.NavWindowingTarget : g.NavWindow;
            const title_bar_is_highlight = want_focus ||
                (window_to_highlight &&
                    win.RootWindowForTitleBarHighlight ==
                    window_to_highlight.RootWindowForTitleBarHighlight);
            const title_bar_rect = win.TitleBarRect();
            if (win.Collapsed)
            {
                // Title bar only
                let backup_border_size = style.FrameBorderSize;
                g.Style.FrameBorderSize = win.WindowBorderSize;
                let title_bar_col = style.GetColor(
                    (title_bar_is_highlight && !g.NavDisableHighlight) ?
                        "TitleBgActive" : "TitleBgCollapsed");
                this.renderFrame(title_bar_rect.Min, title_bar_rect.Max,
                                title_bar_col, true, window_rounding);
                g.Style.FrameBorderSize = backup_border_size;
            }
            else
            {
                // Window background
                if (!(flags & WindowFlags.NoBackground))
                {
                    let bg_col = style.GetColor(this.getWindowBgColorFromFlags(flags));
                    let alpha = 1;
                    if (g.NextWindowData.BgAlphaCond != 0)
                        alpha = g.NextWindowData.BgAlphaVal;
                    if (alpha != 1)
                    {
                        bg_col = bg_col.Clone();
                        bg_col.a = alpha;
                    }
                    let min = Vec2.AddXY(win.Pos, 0, win.TitleBarHeight());
                    let max = Vec2.Add(win.Pos, win.Size);
                    win.DrawList.AddRectFilled(min, max, bg_col, window_rounding,
                                    (flags & WindowFlags.NoTitleBar) ?
                                        CornerFlags.All : CornerFlags.Bot);
                }
                g.NextWindowData.BgAlphaCond = 0;

                // Title bar
                if (!(flags & WindowFlags.NoTitleBar))
                {
                    let title_bar_col = style.GetColor(title_bar_is_highlight ?
                                                    "TitleBgActive" : "TitleBg");
                    win.DrawList.AddRectFilled(title_bar_rect.Min, title_bar_rect.Max,
                                    title_bar_col, window_rounding,
                                    CornerFlags.Top);
                }

                // Menu bar
                if (flags & WindowFlags.MenuBar)
                {
                    let menu_bar_rect = win.MenuBarRect();
                    // Soft clipping, in particular child window don't have
                    // minimum size covering the menu bar so this is useful for them.
                    menu_bar_rect.ClipWith(win.Rect());
                    win.DrawList.AddRectFilled(
                        Vec2.AddXY(menu_bar_rect.Min,
                                   window_border_size,0),
                        Vec2.AddXY(menu_bar_rect.Max, -window_border_size, 0),
                        style.GetColor("MenuBarBg"),
                        (flags & WindowFlags.NoTitleBar) ? window_rounding : 0,
                        CornerFlags.Top);
                    if (style.FrameBorderSize > 0 &&
                        menu_bar_rect.Max.y < win.Pos.y + win.Size.y)
                    {
                        win.DrawList.AddLine(menu_bar_rect.GetBL(),
                                    menu_bar_rect.GetBR(),
                                    style.GetColor("Border"),
                                    style.FrameBorderSize);
                    }
                }

                // Scrollbars
                if (win.ScrollbarX)
                    this.scrollbar(Axis.X);
                if (win.ScrollbarY)
                    this.scrollbar(Axis.Y);

                // Render resize grips (after their input handling so we don't
                // have a frame of latency)
                if (!(flags & WindowFlags.NoResize))
                {
                    win.RenderResizeGrips(resize_grip_col, resize_grip_count,
                        grip_draw_size, window_border_size, window_rounding);
                }

                // Borders
                win.RenderOuterBorders();
            } // end !Collapsed

            // Draw navigation selection/windowing rectangle border
            if (g.NavWindowingTargetAnim == win)
            {
                let rounding = Math.max(win.WindowRounding, g.Style.WindowRounding);
                let bb = win.Rect().Expand(g.FontSize);
                // If a window fits the entire viewport, adjust its highlight inward
                if (bb.Contains(viewport_rect))
                {
                    bb.Expand(-g.FontSize - 1);
                    rounding = win.WindowRounding;
                }
                win.DrawList.AddRect(bb.Min, bb.Max,
                    style.GetColor("NavWindowingHighlight", g.NavWindowingHighlightAlpha),
                    rounding, ~0, 3);
            }

            // Store a backup of SizeFull which we will use next frame to decide
            // if we need scrollbars.
            win.SizeFullAtLastBegin = win.SizeFull;

            // Update various regions. Variables they depends on are set above
            // in this function. FIXME: win.ContentsRegionRect.Max is currently
            // very misleading / partly faulty, but some BeginChild() patterns
            // relies on it.
            win.ContentsRegionRect.Min.x = win.Pos.x - win.Scroll.x + win.WindowPadding.x;
            win.ContentsRegionRect.Min.y = win.Pos.y - win.Scroll.y + win.WindowPadding.y
                                            + win.TitleBarHeight() + win.MenuBarHeight();
            win.ContentsRegionRect.Max.x = win.Pos.x - win.Scroll.x - win.WindowPadding.x
                                            + (win.SizeContentsExplicit.x != 0 ?
                                                win.SizeContentsExplicit.x :
                                                (win.Size.x - win.ScrollbarSizes.x));
            win.ContentsRegionRect.Max.y = win.Pos.y - win.Scroll.y - win.WindowPadding.y
                                            + (win.SizeContentsExplicit.y != 0 ?
                                                win.SizeContentsExplicit.y :
                                                (win.Size.y - win.ScrollbarSizes.y));
            if(win.ContentsRegionRect.IsNaN())
            {
                console.assert("hey!");
            }

            // Setup drawing context
            // (NB: That term "drawing context / DC" lost its meaning a long
            // time ago. Initially was meant to hold transient data only.
            // Nowadays difference between win. and win.DC. is dubious.)
            win.DC.Indent.x = 0 + win.WindowPadding.x - win.Scroll.x;
            win.DC.GroupOffset.x = 0;
            win.DC.ColumnsOffset.x = 0;
            win.DC.CursorStartPos = Vec2.AddXY(
                        win.Pos, win.DC.Indent.x + win.DC.ColumnsOffset.x,
                        win.TitleBarHeight() + win.MenuBarHeight() +
                        win.WindowPadding.y - win.Scroll.y);
            win.DC.CursorPos.Copy(win.DC.CursorStartPos);
            win.DC.CursorPosPrevLine.Copy(win.DC.CursorPos);
            win.DC.CursorMaxPos.Copy(win.DC.CursorStartPos);
            win.DC.CurrentLineHeight = 0;
            win.DC.CurrentLineHeightMax = 0;
            win.DC.PrevLineHeight = 0;
            win.DC.PrevLineHeightMax = 0;
            win.DC.CurrentLineTextBaseOffset = win.DC.PrevLineTextBaseOffset = 0;
            win.DC.NavHideHighlightOneFrame = false;
            win.DC.NavHasScroll = (this.getWindowScrollMaxY(win) > 0);
            win.DC.NavLayerActiveMask = win.DC.NavLayerActiveMaskNext;
            win.DC.NavLayerActiveMaskNext = 0x00;
            win.DC.MenuBarAppending = false;
            win.DC.ChildWindows.resize(0);
            win.DC.LayoutType = LayoutType.Vertical;
            win.DC.ParentLayoutType = parent_window ? parent_window.DC.LayoutType :
                                            LayoutType.Vertical;
            win.DC.FocusCounterAll = win.DC.FocusCounterTab = -1;
            win.DC.ItemFlags = parent_window ? parent_window.DC.ItemFlags :
                                                ItemFlags.Default;
            win.DC.ItemWidth = win.ItemWidthDefault;
            win.DC.TextWrapPos = -1; // disabled
            win.DC.ItemFlagsStack.resize(0);
            win.DC.ItemWidthStack.resize(0);
            win.DC.TextWrapPosStack.resize(0);
            win.DC.CurrentColumns = null;
            win.DC.TreeDepth = 0;
            win.DC.TreeDepthMayJumpToParentOnPop = 0x00;
            win.DC.StateStorage = win.StateStorage;
            win.DC.GroupStack.resize(0);
            win.MenuColumns.Update(3, style.ItemSpacing.x, window_just_activated_by_user);

            if ((flags & WindowFlags.ChildWindow) &&
                (win.DC.ItemFlags != parent_window.DC.ItemFlags))
            {
                win.DC.ItemFlags = parent_window.DC.ItemFlags;
                win.DC.ItemFlagsStack.push_back(win.DC.ItemFlags);
            }

            if (win.AutoFitFramesX > 0)
                win.AutoFitFramesX--;
            if (win.AutoFitFramesY > 0)
                win.AutoFitFramesY--;

            // Apply focus (we need to call FocusWindow() AFTER setting
            // DC.CursorStartPos so our initial navigation reference rectangle
            // can start around there)
            if (want_focus)
            {
                this.FocusWindow(win);
                this.navInitWindow(win, false);
            }

            // Title bar
            if (!(flags & WindowFlags.NoTitleBar))
            {
                // Close & collapse button are on layer 1 (same as menus) and
                // don't default focus
                const item_flags_backup = win.DC.ItemFlags;
                win.DC.ItemFlags |= ItemFlags.NoNavDefaultFocus;
                win.DC.NavLayerCurrent = NavLayer.Menu;
                win.DC.NavLayerCurrentMask = (1 << NavLayer.Menu);

                // Collapse button
                if (!(flags & WindowFlags.NoCollapse))
                {
                    if (this.CollapseButton(win.GetID("#COLLAPSE"), win.Pos))
                    {
                        // Defer collapsing to next frame as we are too far in
                        // the Begin() function
                        win.WantCollapseToggle = true;
                    }
                }

                // Close button
                if (p_open != null)
                {
                    const rad = g.FontSize * 0.5;
                    if (this.CloseButton(win.GetID("#CLOSE"),
                                new Vec2(win.Pos.x + win.Size.x - style.FramePadding.x - rad,
                                         win.Pos.y + style.FramePadding.y + rad),
                                         rad + 1))
                    {
                        p_open.set(false);
                        this.MarkIniSettingsDirty();
                    }
                }

                win.DC.NavLayerCurrent = NavLayer.Main;
                win.DC.NavLayerCurrentMask = (1 << NavLayer.Main);
                win.DC.ItemFlags = item_flags_backup;

                // Title bar text (with: horizontal alignment, avoiding
                // collapse/close button, optional "unsaved document" marker)
                // FIXME: Refactor text alignment facilities along with
                // RenderText helpers, this is too much code..
                const UNSAVED_DOCUMENT_MARKER = "*";
                let marker_size_x = (flags & WindowFlags.UnsavedDocument) ?
                    this.CalcTextSize(UNSAVED_DOCUMENT_MARKER, false).x : 0;
                let text_size = Vec2.AddXY(this.CalcTextSize(title, true),
                                           marker_size_x, 0);
                let text_r = title_bar_rect.Clone();
                let pad_left = (flags & WindowFlags.NoCollapse) ?
                    style.FramePadding.x : (style.FramePadding.x + g.FontSize + style.ItemInnerSpacing.x);
                let pad_right = (p_open == null) ? style.FramePadding.x :
                        (style.FramePadding.x + g.FontSize + style.ItemInnerSpacing.x);
                if (style.WindowTitleAlign.x > 0)
                    pad_right = Vec1.Lerp(pad_right, pad_left, style.WindowTitleAlign.x);
                text_r.Min.x += pad_left;
                text_r.Max.x -= pad_right;
                let clip_rect = text_r.Clone();
                // Match the size of CloseButton()
                clip_rect.Max.x = win.Pos.x + win.Size.x -
                    (p_open ? title_bar_rect.GetHeight() - 3 : style.FramePadding.x);
                this.renderTextClipped(text_r.Min, text_r.Max, title, text_size,
                                    style.WindowTitleAlign, clip_rect);
                if (flags & WindowFlags.UnsavedDocument)
                {
                    let x = Math.max(text_r.Min.x,
                        text_r.Min.x +
                        (text_r.GetWidth()-text_size.x)*style.WindowTitleAlign.x) +
                        text_size.x;
                    let marker_pos = Vec2.AddXY(new Vec2(x, text_r.Min.y),
                                                2 - marker_size_x, 0);
                    let off = new Vec2(0, Math.floor(-g.FontSize * 0.25));
                    this.renderTextClipped(Vec2.Add(marker_pos, off),
                                           Vec2.Add(text_r.Max, off),
                                        UNSAVED_DOCUMENT_MARKER,  null,
                                        new Vec2(0, style.WindowTitleAlign.y),
                                        clip_rect);
                }
            } // end TitleBar

            // Save clipped aabb so we can access it in constant-time in
            // FindHoveredWindow()
            win.OuterRectClipped = win.Rect();
            win.OuterRectClipped.ClipWith(win.ClipRect);

            // Pressing CTRL+C while holding on a window copy its content to the
            // clipboard This works but 1. doesn't handle multiple Begin/End
            // pairs, 2. recursing into another Begin/End pair - so we need to
            // work that out and add better logging scope.
            // Maybe we can support CTRL+C on every element?
            /*
            if (g.ActiveId == move_id)
                if (g.IO.KeyCtrl && this.isKeyPressedMap(Key.C))
                    LogToClipboard();
            */

            // Inner rectangle
            // We set this up after processing the resize grip so that our clip
            // rectangle doesn't lag by a frame. Note that if our window is
            // collapsed we will end up with an inverted (~null) clipping
            // rectangle which is the correct behavior.
            win.InnerMainRect.Min.x = title_bar_rect.Min.x + win.WindowBorderSize;
            win.InnerMainRect.Min.y = title_bar_rect.Max.y +
                        win.MenuBarHeight() + (((flags & WindowFlags.MenuBar) ||
                                                !(flags & WindowFlags.NoTitleBar)) ?
                            style.FrameBorderSize : win.WindowBorderSize);
            win.InnerMainRect.Max.x = win.Pos.x + win.Size.x -
                            win.ScrollbarSizes.x - win.WindowBorderSize;
            win.InnerMainRect.Max.y = win.Pos.y + win.Size.y -
                            win.ScrollbarSizes.y - win.WindowBorderSize;
            //win.DrawList.AddRect(win.InnerRect.Min, win.InnerRect.Max, IM_COL32_WHITE);

            // Inner clipping rectangle
            // Force round operator last to ensure that e.g. (int)(max.x-min.x) in user's render code produce correct result.
            win.InnerClipRect.Min.x = Math.floor(0.5 + win.InnerMainRect.Min.x +
                    Math.max(0, Math.floor(win.WindowPadding.x*0.5 - win.WindowBorderSize)));
            win.InnerClipRect.Min.y = Math.floor(0.5 + win.InnerMainRect.Min.y);
            win.InnerClipRect.Max.x = Math.floor(0.5 + win.InnerMainRect.Max.x -
                    Math.max(0, Math.floor(win.WindowPadding.x*0.5 - win.WindowBorderSize)));
            win.InnerClipRect.Max.y = Math.floor(0.5 + win.InnerMainRect.Max.y);

            // We fill last item data based on Title Bar/Tab, in order for
            // IsItemHovered() and IsItemActive() to be usable after Begin().
            // This is useful to allow creating context menus on title bar only,
            // etc.
            win.DC.LastItemId = win.MoveId;
            win.DC.LastItemStatusFlags = this.IsMouseHoveringRect(title_bar_rect.Min, title_bar_rect.Max, false) ?
                                                ItemStatusFlags.HoveredRect : 0;
            win.DC.LastItemRect = title_bar_rect;
        }
        else // not first begin of frame
        {
            // Append
            this.setCurrentWindow(win);
        }

        this.PushClipRect(win.InnerClipRect.Min, win.InnerClipRect.Max, true);

        // Clear 'accessed' flag last thing (After PushClipRect which will set
        // the flag. We want the flag to stay false when the default "Debug"
        // window is unused)
        if (first_begin_of_the_frame)
            win.WriteAccessed = false;

        win.BeginCount++;
        g.NextWindowData.Clear();

        if (flags & WindowFlags.ChildWindow)
        {
            // Child window can be out of sight and have "negative" clip windows.
            // Mark them as collapsed so commands are skipped earlier (we can't
            // manually collapse them because they have no title bar).
            console.assert((flags & WindowFlags.NoTitleBar) != 0);
            if (!(flags & WindowFlags.AlwaysAutoResize) &&
                    win.AutoFitFramesX <= 0 && win.AutoFitFramesY <= 0)
            {
                if (win.OuterRectClipped.Min.x >= win.OuterRectClipped.Max.x ||
                    win.OuterRectClipped.Min.y >= win.OuterRectClipped.Max.y)
                {
                    win.HiddenFramesCanSkipItems = 1;
                }
            }

            // Completely hide along with parent or if parent is collapsed
            if (parent_window && (parent_window.Collapsed || parent_window.Hidden))
                win.HiddenFramesCanSkipItems = 1;
        }

        // Don't render if style alpha is 0.0 at the time of Begin(). This is
        // arbitrary and inconsistent but has been there for a long while (may
        // remove at some point)
        if (style.Alpha <= 0)
            win.HiddenFramesCanSkipItems = 1;

        // Update the Hidden flag
        win.Hidden = (win.HiddenFramesCanSkipItems > 0) ||
                     (win.HiddenFramesCannotSkipItems > 0);
        // Hidden applies to popups... p_open is currently the responsibility
        // of each window.
        //if(win.Hidden) console.log(win.Name + " is hidden");

        // Update the SkipItems flag, used to early out of all items functions
        // (no layout required)
        let skip_items = false;
        if (win.Collapsed || !win.Active || win.Hidden)
        {
            if (win.AutoFitFramesX <= 0 && win.AutoFitFramesY <= 0 &&
                win.HiddenFramesCannotSkipItems <= 0)
            {
                skip_items = true;
            }
        }
        win.SkipItems = skip_items;

        return !skip_items;
    },

    End()
    {
        let g = this.guictx;

        if (g.CurrentWindowStack.length <= 1 && g.FrameScopePushedImplicitWindow)
        {
            console.assert(g.CurrentWindowStack.length > 1, "Calling End() too many times!");
            return; // FIXME-ERRORHANDLING
        }
        console.assert(g.CurrentWindowStack.length > 0);

        let win = g.CurrentWindow;

        if (win.DC.CurrentColumns != null)
            this.endColumns();
        this.PopClipRect();   // Inner window clip rectangle

        // Stop logging
        if (!(win.Flags & WindowFlags.ChildWindow))    // FIXME: add more options for scope of logging
            this.LogFinish();

        // Pop from window stack
        g.CurrentWindowStack.pop_back();
        if (win.Flags & WindowFlags.Popup)
            g.BeginPopupStack.pop_back();
        if (win.flags & WindowFlags.Tooltip) // dbadb
            win.DrawList.EndLayer();
        this.checkStacksSize(win, false);
        this.setCurrentWindow(g.CurrentWindowStack.empty() ? null :
                            g.CurrentWindowStack.back());
    },

    /**
     * Child Windows
     * - Use child windows to begin into a self-contained independent
     *   scrolling/clipping regions within a host window. Child windows can
     *   embed their own child.
     * - For each independent axis of 'size': ==0.0f: use remaining host
     *   window size / >0.0f: fixed size / <0.0f: use remaining window
     *   size minus abs(size) / Each axis can use a different mode, e.g.
     *   Rect(0,400).
     * BeginChild() returns false to indicate the window is collapsed or
     *   fully clipped, so you may early out and omit submitting anything
     *    to the window.
     * Always call a matching EndChild() for each BeginChild() call,
     *   regardless of its return value.
     */
    BeginChild(strOrID, size_arg=Vec2.Zero(), border=false, flags=0)
    {
        let id;
        let name;
        if(typeof(strOrID) == "string")
        {
            name = strOrID;
            id = this.getCurrentWindow().GetID(strOrID);
        }
        else
        {
            name = null;
            id = strOrID;
        }
        return this.beginChildEx(name, id, size_arg, border, flags);
    },

    beginChildEx(name, id, size_arg, border, flags)
    {
        let g = this.guictx;
        let parent_window = g.CurrentWindow;

        flags |= WindowFlags.NoTitleBar|WindowFlags.NoResize|
                 WindowFlags.NoSavedSettings|WindowFlags.ChildWindow;
        flags |= (parent_window.Flags & WindowFlags.NoMove);  // Inherit the NoMove flag

        // Size
        const content_avail = this.GetContentRegionAvail();
        let size = Vec2.Floor(size_arg);
        const auto_fit_axes = ((size.x == 0) ? (1 << Axis.X) : 0x00) |
                              ((size.y == 0) ? (1 << Axis.Y) : 0x00);
        // Arbitrary minimum child size (0 causing too much issues)
        if (size.x <= 0.)
            size.x = Math.max(content_avail.x + size.x, 4);
        if (size.y <= 0)
            size.y = Math.max(content_avail.y + size.y, 4);
        this.SetNextWindowSize(size);

        // Build up name. If you need to append to a same child from multiple
        // location in the ID stack, use BeginChild(ImGuiID id) with a stable value.
        let title;
        if (name)
            title = `${parent_window.Name}/${name}_${id&0xFFFFF}`;
        else
            title = `${parent_window.Name}/${id&0xFFFFF}`;

        const backup_border_size = g.Style.ChildBorderSize;
        if (!border)
            g.Style.ChildBorderSize = 0.;
        let ret = this.Begin(title, null, flags);
        g.Style.ChildBorderSize = backup_border_size;

        let child_window = g.CurrentWindow;
        child_window.ChildId = id;
        child_window.AutoFitChildAxises = auto_fit_axes;

        // Set the cursor to handle case where the user called
        // SetNextWindowPos()+BeginChild() manually. While this is not
        // really documented/defined, it seems that the expected thing to do.
        if (child_window.BeginCount == 1)
            parent_window.DC.CursorPos.Copy(child_window.Pos);

        // Process navigation-in immediately so NavInit can run on first frame
        if (g.NavActivateId == id && !(flags & WindowFlags.NavFlattened) &&
            (child_window.DC.NavLayerActiveMask != 0 || child_window.DC.NavHasScroll))
        {
            this.FocusWindow(child_window);
            this.navInitWindow(child_window, false);
            // Steal ActiveId with a dummy id so that key-press won't activate
            // child item
            this.setActiveID(id+1, child_window);
            g.ActiveIdSource = InputSource.Nav;
        }
        return ret;
    },

    EndChild()
    {
        let g = this.guictx;
        let win = g.CurrentWindow;

        console.assert(win.Flags & WindowFlags.ChildWindow, "Mismatched BeginChild()/EndChild()");
        if (win.BeginCount > 1)
        {
            this.End();
        }
        else
        {
            let sz = win.Size.Clone();
            // Arbitrary minimum zero-ish child size of 4 causes less trouble
            // than a 0
            if (win.AutoFitChildAxises & (1 << Axis.X))
                sz.x = Math.max(4, sz.x);
            if (win.AutoFitChildAxises & (1 << Axis.Y))
                sz.y = Math.max(4, sz.y);
            this.End();

            let parent_window = g.CurrentWindow;
            let bb = new Rect(parent_window.DC.CursorPos,
                            Vec2.Add(parent_window.DC.CursorPos, sz));
            this.itemSize(sz);
            if ((win.DC.NavLayerActiveMask != 0 ||
                 win.DC.NavHasScroll) &&
                 !(win.Flags & WindowFlags.NavFlattened))
            {
                this.itemAdd(bb, win.ChildId);
                this.renderNavHighlight(bb, win.ChildId);

                // When browsing a window that has no activable items (scroll
                // only) we keep a highlight on the child
                if (win.DC.NavLayerActiveMask == 0 && win == g.NavWindow)
                {
                    this.renderNavHighlight(
                        new Rect(Vec2.SubtractXY(bb.Min, 2,2),
                                 Vec2.AddXY(bb.Max, 2,2)),
                        g.NavId, NavHighlightFlags.TypeThin);
                }
            }
            else
            {
                // Not navigable into
                this.itemAdd(bb, 0);
            }
        }
    },

    // helper to create a child window / scrolling region that looks like a
    // normal widget frame
    BeginChildFrame(id, size, extra_flags = 0)
    {
        let g = this.guictx;
        const style = g.Style;
        this.PushStyleColor("ChildBg", style.GetColor("FrameBg"));
        this.PushStyleVar("ChildRounding", style.FrameRounding);
        this.PushStyleVar("ChildBorderSize", style.FrameBorderSize);
        this.PushStyleVar("WindowPadding", style.FramePadding);
        let ret = this.BeginChild(id, size, true, WindowFlags.NoMove |
                            WindowFlags.AlwaysUseWindowPadding | extra_flags);
        this.PopStyleVar(3);
        this.PopStyleColor();
        return ret;
    },

    // always call EndChildFrame() regardless of BeginChildFrame() return
    // values (which indicates a collapsed/clipped window)
    EndChildFrame()
    {
        this.EndChild();
    },

    // Windows Utilities -------
    // - "current window" = the window we are appending into while inside a
    //  Begin()/End() block. "next window" = next window we will Begin() into.
    IsWindowAppearing()
    {
        let win = this.guictx.CurrentWindow;
        return win.Appearing;
    },

    IsWindowCollapsed()
    {
        let win = this.guictx.CurrentWindow;
        return win.Collapsed;
    },

    IsWindowFocused(flags)
    {
        let g = this.guictx;
        if (flags & FocusedFlags.AnyWindow)
            return g.NavWindow != null;

        console.assert(g.CurrentWindow);     // Not inside a Begin()/End()
        switch (flags & (FocusedFlags.RootWindow | FocusedFlags.ChildWindows))
        {
        case FocusedFlags.RootWindow | FocusedFlags.ChildWindows:
            return g.NavWindow && g.NavWindow.RootWindow == g.CurrentWindow.RootWindow;
        case FocusedFlags.RootWindow:
            return g.NavWindow == g.CurrentWindow.RootWindow;
        case FocusedFlags.ChildWindows:
            return g.NavWindow && this.isWindowChildOf(g.NavWindow, g.CurrentWindow);
        default:
            return g.NavWindow == g.CurrentWindow;
        }
    },

    IsWindowHovered(flags)
    {
        // Flags not supported by this function
        console.assert((flags & HoveredFlags.AllowWhenOverlapped) == 0);
        let g = this.guictx;
        if (flags & HoveredFlags.AnyWindow)
        {
            if (g.HoveredWindow == null)
                return false;
        }
        else
        switch (flags & (HoveredFlags.RootWindow | HoveredFlags.ChildWindows))
        {
        case HoveredFlags.RootWindow | HoveredFlags.ChildWindows:
            if (g.HoveredRootWindow != g.CurrentWindow.RootWindow)
                return false;
            break;
        case HoveredFlags.RootWindow:
            if (g.HoveredWindow != g.CurrentWindow.RootWindow)
                return false;
            break;
        case HoveredFlags.ChildWindows:
            if (g.HoveredWindow == null ||
                !this.isWindowChildOf(g.HoveredWindow, g.CurrentWindow))
            {
                return false;
            }
            break;
        default:
            if (g.HoveredWindow != g.CurrentWindow)
                return false;
            break;
        }

        if (!this.isWindowContentHoverable(g.HoveredWindow, flags))
            return false;
        if (!(flags & HoveredFlags.AllowWhenBlockedByActiveItem))
        {
            if (g.ActiveId != 0 && !g.ActiveIdAllowOverlap &&
                g.ActiveId != g.HoveredWindow.MoveId)
            {
                return false;
            }
        }
        return true;
    },

    GetWindowDrawList()
    {
        let win = this.guictx.CurrentWindow;
        return win.DrawList;
    },

    GetWindowPos()
    {
        let win = this.guictx.CurrentWindow;
        return win.Pos;
    },

    GetWindowSize()
    {
        let win = this.guictx.CurrentWindow;
        return win.Size;
    },

    GetWindowWidth()
    {
        let win = this.guictx.CurrentWindow;
        return win.Size.x;
    },

    GetWindowHeight()
    {
        let win = this.guictx.CurrentWindow;
        return win.Size.y;
    },

    GetWindowScroll()
    {
        let win = this.guictx.CurrentWindow;
        return win.Scroll;
    },

    GetContentRegionMax()
    {
        let win = this.guictx.CurrentWindow;
        let mx = Vec2.Subtract(win.ContentsRegionRect.Max, win.Pos);
        if (win.DC.CurrentColumns)
        {
            mx.x = this.GetColumnOffset(win.DC.CurrentColumns.Current+1) -
                        win.WindowPadding.x;
        }
        return mx; // Vec2
    },

    // Absolute coordinate. Saner. This is not exposed until we finishing
    // refactoring work rect features.
    getContentRegionMaxScreen()
    {
        let win = this.guictx.CurrentWindow;
        let mx = win.ContentsRegionRect.Max.Clone();
        if (win.DC.CurrentColumns)
        {
            mx.x = win.Pos.x
                    + this.GetColumnOffset(win.DC.CurrentColumns.Current + 1)
                    - win.WindowPadding.x;
        }
        return mx;
    },

    GetContentRegionAvail()
    {
        let win = this.guictx.CurrentWindow;
        return Vec2.Subtract(this.GetContentRegionMax(),
                        Vec2.Subtract(win.DC.CursorPos, win.Pos));
    },

    GetContentRegionAvailWidth()
    {
        return this.GetContentRegionAvail().x;
    },

    GetContentRegionAvailHeight()
    {
        return this.GetContentRegionAvail().y;
    },

    GetWindowContentRegionMin()
    {
        let win = this.guictx.CurrentWindow;
        return Vec2.Subtract(win.ContentsRegionRect.Min, win.Pos);
    },

    /**
     * content boundaries max (roughly (0,0)+Size-Scroll) where Size
     * can be override with SetNextWindowContentSize(), in window coordinates
     */
    GetWindowContentRegionMax()
    {
        let win = this.guictx.CurrentWindow;
        return Vec2.Subtract(win.ContentsRegionRect.Max, win.Pos);
    },

    GetWindowContentRegionWidth()
    {
        let win = this.guictx.CurrentWindow;
        return win.ContentsRegionRect.GetWidth();
    },

    GetWindowContentRegionHeight()
    {
        let win = this.guictx.CurrentWindow;
        return win.ContentsRegionRect.GetHeight();
    },

    /**
     * set next window position. call before Begin(). use pivot=(0.5f,0.5f) to
     * center on given point, etc.
     */
    SetNextWindowPos(pos, cond, pivot)
    {
        let g = this.guictx;
        g.NextWindowData.PosVal = pos;
        g.NextWindowData.PosCond = cond ? cond : CondFlags.Always;
        g.NextWindowData.PosPivotVal = pivot ? pivot : Vec2.Zero();
    },

    // Set next window size. Set axis to 0.0f to force an auto-fit on that axis.
    // Call before Begin()
    SetNextWindowSize(size, cond=0)
    {
        let g = this.guictx;
        g.NextWindowData.SizeVal.Copy(size);
        g.NextWindowData.SizeCond = cond ? cond : CondFlags.Always;
    },

    SetNextWindowZIndex(zindex, cond=0)
    {
        let g = this.guictx;
        g.NextWindowData.ZIndex = zindex;
        g.NextWindowData.ZIndexCond = cond ? cond : CondFlags.Always;
    },

    // Set next window size limits. Use -1,-1 on either X/Y axis to preserve the
    // current size. Use callback to apply non-trivial programmatic constraints.
    SetNextWindowSizeConstraints(size_min, size_max, custom_callback, custom_callback_data)
    {
        let g = this.guictx;
        g.NextWindowData.SizeConstraintCond = CondFlags.Always;
        g.NextWindowData.SizeConstraintRect = new Rect(size_min, size_max);
        if(size_min.IsNaN() || size_max.IsNaN())
        {
            console.assert(0, "bogus constraints");
        }
        g.NextWindowData.SizeCallback = custom_callback;
        g.NextWindowData.SizeCallbackUserData = custom_callback_data;
    },

    // Set next window content size (~ enforce the range of scrollbars). Not
    // including window decorations (title bar, menu bar, etc.). Set an axis
    // to 0.0f to leave it automatic. Call before Begin()
    SetNextWindowContentSize(size)
    {
        // in Begin() we will add the size of window decorations (title bar,
        // menu etc.) to that to form a SizeContents value.
        let g = this.guictx;
        g.NextWindowData.ContentSizeVal = size;
        g.NextWindowData.ContentSizeCond = CondFlags.Always;
    },

    // set next window collapsed state. call before Begin()
    SetNextWindowCollapsed(collapsed, cond=0)
    {
        let g = this.guictx;
        g.NextWindowData.CollapsedVal = collapsed;
        g.NextWindowData.CollapsedCond = cond ? cond : CondFlags.Always;
    },

    // Set next window to be focused / front-most. Call before Begin()
    SetNextWindowFocus()
    {
        let g = this.guictx;
        g.NextWindowData.FocusCond = CondFlags.Always;
    },

    // set next window background color alpha. helper to easily modify
    // ImGuiCol_WindowBg/ChildBg/PopupBg. you may also use
    // ImGuiWindowFlags_NoBackground.
    SetNextWindowBgAlpha(alpha)
    {
        let g = this.guictx;
        g.NextWindowData.BgAlphaVal = alpha;
        g.NextWindowData.BgAlphaCond = CondFlags.Always;
        // Using a Cond member for consistency (may transition all of them
        // to single flag set for fast Clear() op)
    },

    // (not recommended) set current window position - call within Begin()/End().
    // prefer using SetNextWindowPos(), as this may incur tearing and side-effects.
    SetWindowPos(pos, cond)
    {
        let win = this.guictx.CurrentWindow;
        win.SetWindowPos(pos, cond);
    },

    SetWindowPosNm(nm, pos, cond)
    {
        let win = this.findWindowByName(nm);
        if(win)
            win.SetWindowPos(pos, cond);
    },

    // (not recommended) set current window size - call within Begin()/End().
    // set to ImVec2(0,0) to force an auto-fit. prefer using SetNextWindowSize(),
    // as this may incur tearing and minor side-effects.
    SetWindowSize(size, cond)
    {
        let win = this.guictx.CurrentWindow;
        win.SetWindowSize(size, cond);
    },

    SetWindowSizeNm(nm, size, cond)
    {
        let win = this.findWindowByName(nm);
        if(win)
            win.SetWindowSize(size, cond);
    },

    // (not recommended) set current window collapsed state.
    // Prefer using SetNextWindowCollapsed().
    SetWindowCollapsed(collapsed, cond)
    {
        this.guictx.CurrentWindow.SetWindowCollapsed(collapsed, cond);
    },

    SetWindowCollapsedNm(nm, collapsed, cond)
    {
        let win = this.findWindowByName(nm);
        if(win)
            win.SetWindowCollapsed(collapsed, cond);
    },

    // (not recommended) set current window to be focused / front-most.
    // Prefer using SetNextWindowFocus().
    SetWindowFocus()
    {
        this.FocusWindow(this.guictx.CurrentWindow);
    },

    SetWindowFocusNm(nm)
    {
        let win = this.findWindowByName(nm);
        if(win)
            this.FocusWindow(win);
    },

    // Set font scale. Adjust IO.FontGlobalScale if you want to scale
    // all windows
    SetWindowFontScale(scale)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        win.FontWindowScale = scale;
    },

    // Windows Scrolling --------------------------------------------------
    // get scrolling amount [0..GetScrollMaxX()]
    GetScrollX()
    {
        return this.guictx.CurrentWindow.Scroll.x;
    },

    // get scrolling amount [0..GetScrollMaxY()]
    GetScrollY()
    {
        return this.guictx.CurrentWindow.Scroll.y;
    },

    // get maximum scrolling amount ~~ ContentSize.X - WindowSize.X
    GetScrollMaxX()
    {
        return this.guictx.CurrentWindow.GetScrollMaxX();
    },

    // get maximum scrolling amount ~~ ContentSize.Y - WindowSize.Y
    GetScrollMaxY()
    {
        return this.guictx.CurrentWindow.GetScrollMaxY();
    },

    // set scrolling amount [0..GetScrollMaxX()]
    SetScrollX(scroll_x)
    {
        this.guictx.CurrentWindow.SetScrollX(scroll_x);
    },

    // set scrolling amount [0..GetScrollMaxY()]
    SetScrollY(scroll_y)
    {
        this.guictx.CurrentWindow.SetScrollX(scroll_y);
    },

    // adjust scrolling amount to make current cursor position visible.
    // center_y_ratio=0.0: top, 0.5: center, 1.0: bottom. When using to
    // make a "default/current item" visible, consider using
    // SetItemDefaultFocus() instead.
    // center_y_ratio: 0.0f top of last item, 0.5f vertical center of last
    // item, 1.0f bottom of last item.
    SetScrollHereY(center_y_ratio=.5)
    {
        let win = this.guictx.CurrentWindow;
        // Top of last item, in window space
        let target_y = win.DC.CursorPosPrevLine.y - win.Pos.y;
        // Precisely aim above, in the middle or below the last line.
        target_y += (win.DC.PrevLineHeight * center_y_ratio) +
            (this.guictx.Style.ItemSpacing.y * (center_y_ratio - 0.5) * 2.);
        this.SetScrollFromPosY(target_y, center_y_ratio);
    },

    // adjust scrolling amount to make given position visible. Generally
    // GetCursorStartPos() + offset to compute a valid position.
    SetScrollFromPosY(local_y, center_y_ratio)
    {
        // We store a target position so centering can occur on the next frame
        // when we are guaranteed to have a known window size
        let win = this.guictx.CurrentWindow;
        console.assert(center_y_ratio >= 0. && center_y_ratio <= 1.);
        win.ScrollTarget.y = Math.floor(local_y + win.Scroll.y);
        win.ScrollTargetCenterRatio.y = center_y_ratio;
    },

    /* -----------------------------------------------------------------*/
    createNewWindow(name, size, flags)
    {
        let g = this.guictx;

        // Create window the first time
        let win = new Window(name, this);
        win.Flags = flags;
        g.WindowsByName[name] = win;

        // Default/arbitrary window position. Use SetNextWindowPos() with
        // the appropriate condition flag to change the initial position of a window.
        win.Pos = new Vec2(60, 60);

        // User can disable loading and saving of settings. Tooltip and child
        // windows also don't store settings.
        if (!(flags & WindowFlags.NoSavedSettings))
        {
            let settings = this.findWindowSettings(win.ID);
            if (settings)
            {
                // Retrieve settings from .ini file
                win.SettingsIdx = g.SettingsWindows.indexOf(settings);
                win.SetWindowConditionAllowFlags(CondFlags.FirstUseEver, false);
                win.Pos = Vec2.Floor(settings.Pos);
                win.Collapsed = settings.Collapsed;
                if (settings.Size.LengthSq() > 0.00001)
                    size = Vec2.Floor(settings.Size);
            }
        }
        win.Size = Vec2.Floor(size);
        win.SizeFull = Vec2.Floor(size);
        win.SizeFullAtLastBegin = Vec2.Floor(size);
        // So first call to CalcSizeContents() doesn't return crazy values
        win.DC.CursorMaxPos.Copy(win.Pos);

        if ((flags & WindowFlags.AlwaysAutoResize) != 0)
        {
            win.AutoFitFramesX = win.AutoFitFramesY = 2;
            win.AutoFitOnlyGrows = false;
        }
        else
        {
            if (win.Size.x <= 0)
                win.AutoFitFramesX = 2;
            if (win.Size.y <= 0)
                win.AutoFitFramesY = 2;
            win.AutoFitOnlyGrows = (win.AutoFitFramesX > 0) ||
                                   (win.AutoFitFramesY > 0);
        }

        g.WindowsFocusOrder.push_back(win);
        if (flags & WindowFlags.NoBringToFrontOnFocus)
            g.Windows.push_front(win); // Quite slow but rare and only once
        else
            g.Windows.push_back(win);
        return win;
    },

    setCurrentWindow(win)
    {
        this.guictx.CurrentWindow = win;
        if(win)
            win.MakeCurrent();
    },

    getCurrentWindowRead()
    {
        return this.guictx.CurrentWindow;
    },

    getCurrentWindow()
    {
        let g = this.guictx;
        g.CurrentWindow.WriteAccessed = true;
        return g.CurrentWindow;
    },

    findWindowByID(id)
    {
        console.assert(0, "unused");
    },

    findWindowByName(name)
    {
        return this.guictx.WindowsByName[name];
    },

    getWindowBgColorFromFlags(flags)
    {
        if (flags & (WindowFlags.Tooltip | WindowFlags.Popup))
            return "PopupBg";
        if (flags & WindowFlags.ChildWindow)
            return "ChildBg";
        return "WindowBg";
    },

    checkStacksSize(win, begin)
    {
       // NOT checking: DC.ItemWidth, DC.AllowKeyboardFocus, DC.ButtonRepeat,
        //  DC.TextWrapPos (per window) to allow user to conveniently push
        //  once and not pop (they are cleared on Begin)
        let tracker = win.DC.StackSizesBackup;
        let g = this.guictx;
        if(begin)
        {
            tracker["ID"] = win.IDStack.length;
            tracker["Group"] = win.DC.GroupStack.length;
            tracker["BeginPopup"] = g.BeginPopupStack.length;
            tracker["DrawListLayers"] = win.DrawList.LayerStack.length;
            tracker["ColorModifiers"] = g.ColorModifiers.length;
            tracker["StyleModifiers"] = g.StyleModifiers.length;
            tracker["FontStack"] = g.FontStack.length;
        }
        else
        {
            console.assert(tracker["ID"] == win.IDStack.length);
            console.assert(tracker["Group"] == win.DC.GroupStack.length);
            console.assert(tracker["BeginPopup"] == g.BeginPopupStack.length);
            console.assert(tracker["DrawListLayers"] = win.DrawList.LayerStack.length);
            // For color, style and font stacks there is an incentive to use
            // Push/Begin/Pop/.../End patterns, so we relax our checks a little
            // to allow them.
            console.assert(tracker["ColorModifiers"] >= g.ColorModifiers.length);
            console.assert(tracker["StyleModifiers"] >= g.StyleModifiers.length);
            console.assert(tracker["FontStack"] >= g.FontStack.length);
        }
    },
    // ---- window --------------

    // Passing null to disable keyboard focus (ie: blur)
    FocusWindow(win)
    {
        let g = this.guictx;
        if (g.NavWindow != win)
        {
            g.NavWindow = win;
            if (win && g.NavDisableMouseHover)
                g.NavMousePosDirty = true;
            g.NavInitRequest = false;
            g.NavId = win ? win.NavLastIds[0] : 0; // Restore NavId
            g.NavIdIsAlive = false;
            g.NavLayer = NavLayer.Main;
            //IMGUI_DEBUG_LOG("FocusWindow(\"%s\")\n", win ? win->Name : NULL);
        }

        if (!win)
            return;

        // Move the root window to the top of the pile
        if (win.RootWindow)
            win = win.RootWindow;

        // Steal focus on active widgets
        // FIXME: This statement should be unnecessary. Need further testing
        // before removing it..
        if (win.Flags & WindowFlags.Popup)
        if (g.ActiveId != 0 && g.ActiveIdWindow &&
            g.ActiveIdWindow.RootWindow != win)
        {
            this.clearActiveID();
        }

        // Bring to front
        this.bringWindowToFocusFront(win);
        if (!(win.Flags & WindowFlags.NoBringToFrontOnFocus))
            this.bringWindowToDisplayFront(win);
    },

    focusPreviousWindowIgnoringOne(ignorewin)
    {
        let g = this.guictx;
        for (let i = g.WindowsFocusOrder.length - 1; i >= 0; i--)
        {
            // We may later decide to test for different NoXXXInputs based on
            // the active navigation input (mouse vs nav) but that may feel
            // more confusing to the user.
            let win = g.WindowsFocusOrder[i];
            if (win != ignorewin && win.WasActive &&
                !(win.Flags & WindowFlags.ChildWindow))
            {
                if ((win.Flags & (WindowFlags.NoMouseInputs | WindowFlags.NoNavInputs))
                    != (WindowFlags.NoMouseInputs | WindowFlags.NoNavInputs))
                {
                    let focus_window = this.navRestoreLastChildNavWindow(win);
                    this.FocusWindow(focus_window);
                    return;
                }
            }
        }
    },

    navRestoreLastChildNavWindow(win)
    {
        return win.NavLastChildNavWindow ? win.NavLastChildNavWindow : win;
    },

    bringWindowToFocusFront(win)
    {
        let g = this.guictx;
        let len = g.WindowsFocusOrder.length;
        if (g.WindowsFocusOrder[len-1] == win)
            return;
        // We can ignore the front most window
        for (let i=len-2; i >= 0; i--)
        {
            if (g.WindowsFocusOrder[i] == win)
            {
                g.WindowsFocusOrder.splice(i, 1);
                g.WindowsFocusOrder.push(win);
                break;
            }
        }
    },

    bringWindowToDisplayFront(win)
    {
        let g = this.guictx;
        let len = g.WindowsFocusOrder.length;
        let front = g.Windows[len-1];
        if (front && (front == win || front.RootWindow == win))
            return;
        // We can ignore the front most window
        for (let i=len-2; i >= 0; i--)
        {
            if (g.Windows[i] == win)
            {
                g.Windows.splice(i, 1);
                g.Windows.push(win);
                break;
            }
        }
    },

    bringWindowToDisplayBack(win)
    {
        let g = this.guictx;
        if (g.Windows[0] == win) // already there
            return;
        for (let i = 0; i < g.Windows.length; i++)
        {
            if (g.Windows[i] == win)
            {
                g.Windows.splice(i, 1);
                g.Windows.splice(0, 0, win); // insert(0)
                break;
            }
        }
    },

    calcWindowExpectedSize(win)
    {
        let c = win.CalcSizeContents();
        return win.CalcSizeAfterConstraint(win.CalcSizeAutoFit(c));
    },

    isWindowChildOf(win, potentialParent)
    {
        if (win.RootWindow == potentialParent)
            return true;
        while (win != null)
        {
            if (win == potentialParent)
                return true;
            win = win.ParentWindow;
        }
        return false;
    },

    isWindowNavFocusable(win)
    {
        return win.Active && win == win.RootWindow &&
                !(win.Flags & WindowFlags.NoNavFocus);
    },

    getWindowScrollMaxX(win)
    {
        return Math.max(0, win.SizeContents.x-(win.SizeFull.x-win.ScrollbarSizes.x));
    },

    getWindowScrollMaxY(win)
    {
        return Math.max(0, win.SizeContents.y-(win.SizeFull.y-win.ScrollbarSizes.y));
    },

    getWindowAllowedExtentRect(win_unused)
    {
        let padding = this.guictx.Style.DisplaySafeAreaPadding;
        let r_screen = this.getViewportRect();
        r_screen.expandXY((r_screen.GetWidth() > padding.x * 2) ? -padding.x : 0,
                          (r_screen.GetHeight() > padding.y * 2) ? -padding.y : 0);
        return r_screen;
    },

    getViewportRect()
    {
        let g = this.guictx;
        return new Rect(0., 0, g.IO.DisplaySize.x, g.IO.DisplaySize.y);
    },

    updateHoveredWindowAndCaptureFlags()
    {
        let g = this.guictx;

        // Find the window hovered by mouse:
        // - Child windows can extend beyond the limit of their parent so we
        //   need to derive HoveredRootWindow from HoveredWindow.
        // - When moving a window we can skip the search, which also conveniently
        //   bypasses the fact that window->WindowRectClipped is lagging as this
        //   point of the frame.
        // - We also support the moved window toggling the NoInputs flag after
        //   moving has started in order to be able to detect windows below it,
        //   which is useful for e.g. docking mechanisms.

        this.findHoveredWindow();

        // Modal windows prevents cursor from hovering behind them.
        let modal_window = this.getFrontMostPopupModal();
        if (modal_window)
        {
            if (g.HoveredRootWindow &&
                !this.isWindowChildOf(g.HoveredRootWindow, modal_window))
            {
                g.HoveredRootWindow = g.HoveredWindow = null;
            }
        }

        // Disabled mouse?
        if (g.IO.ConfigFlags & ConfigFlags.NoMouse)
            g.HoveredWindow = g.HoveredRootWindow = null;

        // We track click ownership. When clicked outside of a window the
        // click is owned by the application and won't report hovering nor
        // request capture even while dragging over our windows afterward.
        let firstDown = -1; // earliest_down
        let anyDown = false;
        for (let i=0; i < g.IO.MouseDown.length; i++)
        {
            if (g.IO.MouseClicked[i])
            {
                g.IO.MouseDownOwned[i] = (g.HoveredWindow != null) ||
                                          (!g.OpenPopupStack.length==0);
            }
            anyDown |= g.IO.MouseDown[i];
            if (g.IO.MouseDown[i])
            {
                if (firstDown == -1 ||
                    g.IO.MouseClickedTime[i] < g.IO.MouseClickedTime[firstDown])
                {
                    firstDown = i;
                }
            }
        }
        let mouseAvail = (firstDown == -1) || g.IO.MouseDownOwned[firstDown];

        // If mouse was first clicked outside of ImGui bounds we also cancel out
        // hovering./ FIXME: For patterns of drag and drop across OS windows,
        // we may need to rework/remove this test (first committed 311c0ca9 on 2015/02)
        let draggingExternPayload = g.DragDropActive &&
                    (g.DragDropSourceFlags & DragDropFlags.SourceExtern) != 0;
        if (!mouseAvail && !draggingExternPayload)
            g.HoveredWindow = g.HoveredRootWindow = null;

        // Update io.WantCaptureMouse for the user application (true = dispatch
        // mouse info to imgui, false = dispatch mouse info to imgui + app)
        if (g.WantCaptureMouseNextFrame != -1)
            g.IO.WantCaptureMouse = (g.WantCaptureMouseNextFrame != 0);
        else
            g.IO.WantCaptureMouse = (mouseAvail && (g.HoveredWindow != null || anyDown)) ||
                                    (g.OpenPopupStack.length > 0);

        // Update io.WantCaptureKeyboard for the user application (true =
        // dispatch keyboard info to imgui, false = dispatch keyboard info to
        // imgui + app)
        if (g.WantCaptureKeyboardNextFrame != -1)
            g.IO.WantCaptureKeyboard = (g.WantCaptureKeyboardNextFrame != 0);
        else
            g.IO.WantCaptureKeyboard = (g.ActiveId != 0) || (modal_window != null);
        if (g.IO.NavActive && (g.IO.ConfigFlags & ConfigFlags.NavEnableKeyboard)
            && !(g.IO.ConfigFlags & ConfigFlags.NavNoCaptureKeyboard))
            g.IO.WantCaptureKeyboard = true;

        // Update io.WantTextInput flag, this is to allow systems without a
        // keyboard (e.g. mobile, hand-held) to show a software keyboard if
        // possible
        g.IO.WantTextInput = (g.WantTextInputNextFrame != -1) ?
                                (g.WantTextInputNextFrame != 0) : false;
    },

    // Find window given position, search front-to-back
    // FIXME: Note that we have an inconsequential lag here: OuterRectClipped
    // is updated in Begin(), so windows moved programatically
    // with SetWindowPos() and not SetNextWindowPos() will have that rectangle
    // lagging by a frame at the time FindHoveredWindow() is called, aka before
    // the next Begin(). Moving window isn't affected.
    findHoveredWindow()
    {
        let g = this.guictx;
        let hovered_window = null;
        if (g.MovingWindow && !(g.MovingWindow.Flags & WindowFlags.NoMouseInputs))
            hovered_window = g.MovingWindow;
        let padding_regular = g.Style.TouchExtraPadding;
        let padding_for_resize_from_edges = g.IO.ConfigWindowsResizeFromEdges ?
                Vec2.Max(g.Style.TouchExtraPadding,
                        new Vec2(WinResizeEdgeHalf, WinResizeEdgeHalf)) :
                padding_regular;
        for (let i=g.Windows.length-1; i>= 0; i--)
        {
            let win = g.Windows[i];
            if (!win.Active || win.Hidden)
                continue;
            if (win.Flags & WindowFlags.NoMouseInputs)
                continue;

            // Using the clipped AABB, a child window will typically be clipped
            // by its parent (not always)
            let bb = win.OuterRectClipped.Clone();
            if ((win.Flags & WindowFlags.ChildWindow) ||
                (win.Flags & WindowFlags.NoResize))
            {
                bb.Expand(padding_regular);
            }
            else
            {
                bb.Expand(padding_for_resize_from_edges);
            }
            if (!bb.Contains(g.IO.MousePos))
                continue;

            // Those seemingly unnecessary extra tests are because the code here
            // is a little different in viewport/docking branches.
            if (hovered_window == null)
                hovered_window = win;
            if (hovered_window)
                break;
        }
        g.HoveredWindow = hovered_window;
        g.HoveredRootWindow = g.HoveredWindow ? g.HoveredWindow.RootWindow : null;
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


    // sort, cb(a, b)
    // If the result is negative a is sorted before b.
    // If the result is positive b is sorted before a.
    // If the result is 0 no changes are done with the sort
    // order of the two values.

    // the front-most window is at the end of the list, so
    // higher values of ZIndex (for non-child windows) should
    // follow lower ZIndex windows.
    _zsort(a, b)
    {
        // XXX: should we find deepest ancester?
        if(a.ParentWindow) a = a.ParentWindow;
        if(b.ParentWindow) b = b.ParentWindow;

        if (a.Active && !(a.Flags & WindowFlags.ChildWindow) &&
            b.Active && !(b.Flags & WindowFlags.ChildWindow))
        {
            // no child windows here
            return a.ZIndex - b.ZIndex; //  a=1 should sort after b=0 and
                                        //   therefore be in front
        }
        // if we compare a non-child window against a child-window
        // we assert no opinion about order.  This is presumably taken
        // care of by addWindowToSortBuffer. Same with two child-windows
        return 0;
    },

    // zsortWindows called before addWindowToSortBuffer, last window in
    // Windows array is front-most
    zsortWindows()
    {
        this.guictx.Windows.sort(this._zsort);
    },

    _compareWindows(a, b)
    {

        let d = (a.Flags & WindowFlags.Popup) - (b.Flags & WindowFlags.Popup);
        if (d)
            return d;
        d = (a.Flags & WindowFlags.Tooltip) - (b.Flags & WindowFlags.Tooltip);
        if(d)
            return d;
        return (a.BeginOrderWithinParent - b.BeginOrderWithinParent);
    },

    // recursively sort the windows
    addWindowToSortBuffer(buf, win)
    {
        buf.push(win);
        if(win.Active)
        {
            let count = win.DC.ChildWindows.length;
            if(count > 1)
                win.DC.ChildWindows.sort(this._compareWindows);
            for(let i=0;i<count;i++)
            {
                let c = win.DC.ChildWindows[i];
                if(c.Active)
                    this.addWindowToSortBuffer(buf, c);
            }
        }
    },
};