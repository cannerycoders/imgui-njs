import {Rect, Vec1, Vec2, ValRef} from "../types.js";
import {ConfigFlags, HoveredFlags, ItemFlags} from "../flags.js";
import {Dir} from "../enums.js";
import {ButtonFlags} from "./button.js";
import {ComboFlags} from "./combo.js";
import {GetHash} from "../hashutil.js";
import {ItemHoveredDataBackup} from "../misc.js";
import {Color, Colors} from "../color.js";

// TODO:
//     fix tab reordering

export var TabBarFlags =
{
    None: 0,
    Reorderable: 1 << 0,
        // Allow manually dragging tabs to re-order them + New tabs are
        // appended at the end of list
    AutoSelectNewTabs: 1 << 1,   // Automatically select new tabs when they appear
    TabListPopupButton: 1 << 2,
    NoCloseWithMiddleMouseButton: 1 << 3,
        // Disable behavior of closing tabs (that are submitted with
        // p_open != NULL) with middle mouse button. You can still
        // repro this behavior on user's side with if
        // (IsItemHovered() && IsMouseClicked(2)) *p_open = false.
    NoTabListScrollingButtons: 1 << 4,
    NoTooltip: 1 << 5,   // Disable tooltips when hovering a tab
    FittingPolicyResizeDown: 1 << 6,   // Resize tabs when they don't fit
    FittingPolicyScroll: 1 << 7,   // Add scroll buttons when tabs don't fit
};
let f = TabBarFlags;
f.FittingPolicyMask_ =  f.FittingPolicyResizeDown | f.FittingPolicyScroll;
f.FittingPolicyDefault_ =  f.FittingPolicyResizeDown;

// Flags for ImGui::BeginTabItem()
export var TabItemFlags =
{
    None: 0,
    UnsavedDocument: 1 << 0,
        // Append '*' to title without affecting the ID, as a convenience to
        // avoid using the ### operator. Also: tab is selected on closure and
        // closure is deferred by one frame to allow code to undo it without flicker.
    SetSelected: 1 << 1,
        // Trigger flag to programmatically make the tab selected when calling
        // BeginTabItem()
    NoCloseWithMiddleMouseButton: 1 << 2,
        // Disable behavior of closing tabs (that are submitted with
        // p_open != NULL) with middle mouse button. You can still repro this
        // behavior on user's side with if (IsItemHovered() && IsMouseClicked(2))
        // *p_open = false.
    NoPushId: 1 << 3
        // Don't call PushID(tab->ID)/PopID() on BeginTabItem()/EndTabItem()
};

function linearSweep(current, target, speed)
{
    if (current < target)
        return Math.min(current + speed, target);
    if (current > target)
        return Math.max(current - speed, target);
    return current;
}

class TabSortItem
{
    constructor()
    {
        this.Index=-1;
        this.Width=0.;
    }
}

class TabItem
{
    constructor()
    {
        this.ID = this.Flags = 0;
        this.LastFrameVisible = this.LastFrameSelected = -1;
        this.NameOffset = -1;
        this.Offset = this.Width = this.WidthContents = 0.;
    }
}

class TabBar
{
    constructor(id)
    {
        this.Tabs = []; // TabItem
        this.ID = id;
        this.SelectedTabId = this.NextSelectedTabId = this.VisibleTabId = 0;
        this.CurrFrameVisible = this.PrevFrameVisible = -1;
        this.BarRect = null;
        this.ContentsHeight = 0;
        this.OffsetMax = this.OffsetNextTab = 0;
        this.ScrollingAnim = this.ScrollingTarget = 0;
        this.ScrollingTargetDistToVisibility = this.ScrollingSpeed = 0;
        this.Flags = TabBarFlags.None;
        this.ReorderRequestTabId = 0;
        this.ReorderRequestDir = 0;
        this.WantLayout = this.VisibleTabWasSubmitted = false;
        this.LastTabItemIdx = -1;
        this.FramePadding = null; // Vec2
        this.TabsNames = []; // for non-docking tab bar we re-append names
    }

    GetTabOrder(tab)
    {
        let item = this.Tabs.indexOf(tab);
        if(item == undefined)
        {
            console.assert(0);
        }
        return item;
    }

    GetTabName(tab)
    {
        return this.TabsNames[this.GetTabOrder(tab)];
    }
}

//-------------------------------------------------------------------------
// [SECTION] Widgets: BeginTabBar, EndTabBar, etc.
//-------------------------------------------------------------------------
// [BETA API] API may evolve! This code has been extracted out of the Docking branch,
// and some of the construct which are not used in Master may be left here to facilitate merging.
//-------------------------------------------------------------------------
// - BeginTabBar()
// - beginTabBarEx() [Internal]
// - EndTabBar()
// - tabBarLayout() [Internal]
// - tabBarCalcTabID() [Internal]
// - tabBarCalcMaxTabWidth() [Internal]
// - tabBarFindTabById() [Internal]
// - tabBarRemoveTab() [Internal]
// - tabBarCloseTab() [Internal]
// - tabBarScrollClamp()v
// - tabBarScrollToTab() [Internal]
// - tabBarQueueChangeTabOrder() [Internal]
// - tabBarScrollingButtons() [Internal]
// - tabBarTabListPopupButton() [Internal]
//-------------------------------------------------------------------------
export var ImguiTabBarMixin =
{
   // Popups, Modals  (public methods found in imguiPopup)
    // Tab Bars, Tabs ---------------------------------------
    // [BETA API] API may evolve!

    // create and append into a TabBar
    BeginTabBar(str_id, flags=0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.SkipItems)
            return false;

        let id = win.GetID(str_id);
        let tab_bar = g.TabBars[id];
        if(tab_bar == undefined)
        {
            tab_bar = new TabBar(id);
            g.TabBars[id] = tab_bar;
        }
        let tab_bar_bb = Rect.FromXY(win.DC.CursorPos.x, win.DC.CursorPos.y,
                            win.InnerClipRect.Max.x,
                            win.DC.CursorPos.y+g.FontLineHeight+g.Style.FramePadding.y*2);
        return this.beginTabBarEx(tab_bar, tab_bar_bb, flags|TabBarFlags.IsFocused);
    },

    beginTabBarEx(tab_bar, tab_bar_bb, flags)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.SkipItems)
            return false;

        if ((flags & TabBarFlags.DockNode) == 0)
            win.IDStack.push(tab_bar.ID);

        // Add to stack
        g.CurrentTabBarStack.push(tab_bar); //was getTabBarRefFromTabBar
        g.CurrentTabBar = tab_bar;

        if (tab_bar.CurrFrameVisible == g.FrameCount)
        {
            console.assert(0, "beginTabBarEx already called this frame");
            return true;
        }

        // When toggling back from ordered to manually-reorderable, shuffle
        // tabs to enforce the last visible order. Otherwise, the most recently
        // inserted tabs would move at the end of visible list which can be a
        // little too confusing or magic for the user.
        if ((flags & TabBarFlags.Reorderable) &&
            !(tab_bar.Flags & TabBarFlags.Reorderable) &&
            tab_bar.Tabs.length > 1 && tab_bar.PrevFrameVisible != -1)
        {
            tab_bar.Tabs.sort(this._compareTabItemsByVisibleOffset);
        }

        // Flags
        if ((flags & TabBarFlags.FittingPolicyMask_) == 0)
            flags |= TabBarFlags.FittingPolicyDefault_;
        tab_bar.Flags = flags;
        tab_bar.BarRect = tab_bar_bb; // okay to copy
        tab_bar.WantLayout = true; // Layout will be done on the first call to ItemTab()
        tab_bar.PrevFrameVisible = tab_bar.CurrFrameVisible;
        tab_bar.CurrFrameVisible = g.FrameCount;
        tab_bar.FramePadding = g.Style.FramePadding;

        // Layout
        this.itemSize(new Vec2(tab_bar.OffsetMax, tab_bar.BarRect.GetHeight()));
        win.DC.CursorPos.x = tab_bar.BarRect.Min.x;

        // Draw separator
        const col = g.Style.GetColor((flags & TabBarFlags.IsFocused) ? "TabActive" : "Tab");
        const y = tab_bar.BarRect.Max.y - 1.;
        const separator_min_x = tab_bar.BarRect.Min.x - win.WindowPadding.x;
        const separator_max_x = tab_bar.BarRect.Max.x + win.WindowPadding.x;
        win.DrawList.AddLine(new Vec2(separator_min_x, y),
                             new Vec2(separator_max_x, y), col, 1);
        return true;
    },

    _compareTabItemsByVisibleOffset(a, b)
    {
        return a.Offset - b.Offset;
    },

    tabBarCalcTabID(tabbar, label)
    {
        if (tabbar.Flags & TabBarFlags.DockNode)
        {
            let id = GetHash(label, 0);
            this.KeepAliveID(id);
            return id;
        }
        else
        {
            let win = this.guictx.CurrentWindow;
            return win.GetID(label);
        }
    },

    // only call EndTabBar() if BeginTabBar() returns true!
    EndTabBar()
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.SkipItems)
            return;

        let tab_bar = g.CurrentTabBar;
        if (tab_bar == null)
        {
            console.assert(tab_bar != null,  "Mismatched BeginTabBar()/EndTabBar()!");
            return; // FIXME-ERRORHANDLING
        }
        if (tab_bar.WantLayout)
            this.tabBarLayout(tab_bar);

        // Restore the last visible height if no tab is visible, this reduce
        // vertical flicker/movement when a tabs gets removed without calling
        // SetTabItemClosed().
        const tab_bar_appearing = (tab_bar.PrevFrameVisible + 1 < g.FrameCount);
        if (tab_bar.VisibleTabWasSubmitted || tab_bar.VisibleTabId == 0 || tab_bar_appearing)
            tab_bar.ContentsHeight = Math.max(win.DC.CursorPos.y - tab_bar.BarRect.Max.y, 0);
        else
            win.DC.CursorPos.y = tab_bar.BarRect.Max.y + tab_bar.ContentsHeight;

        if ((tab_bar.Flags & TabBarFlags.DockNode) == 0)
            this.PopID();

        g.CurrentTabBarStack.pop();
        g.CurrentTabBar = g.CurrentTabBarStack.length == 0 ? null :
            g.CurrentTabBarStack[g.CurrentTabBarStack.length-1]; // was GetTabBarFromTabBarRef
    },

    // create a Tab. Returns true if the Tab is selected.
    BeginTabItem(label, p_open=null, flags=0)
    {
        let g = this.guictx;
        if (g.CurrentWindow.SkipItems)
            return false;

        let tabbar = g.CurrentTabBar;
        if (tabbar == null)
        {
            console.assert(tabbar, "Needs to be called between BeginTabBar() and EndTabBar()!");
            return false; // FIXME-ERRORHANDLING
        }
        let ret = this.tabItemEx(tabbar, label, p_open, flags);
        if (ret && !(flags & TabItemFlags.NoPushId))
        {
            let tab = tabbar.Tabs[tabbar.LastTabItemIdx];
            // We already hashed 'label' so push into the ID stack directly
            // nstead of doing another hash through PushID(label)
            g.CurrentWindow.IDStack.push(tab.ID);
        }
        return ret;
    },

    // only call EndTabItem() if BeginTabItem() returns true!
    EndTabItem()
    {
        let g = this.guictx;
        if (g.CurrentWindow.SkipItems)
            return;

        let tab_bar = g.CurrentTabBar;
        if (tab_bar == null)
        {
            console.assert(tab_bar != null,  "Needs to be called between BeginTabBar() and EndTabBar()!");
            return;
        }
        console.assert(tab_bar.LastTabItemIdx >= 0);
        let tab = tab_bar.Tabs[tab_bar.LastTabItemIdx];
        if (!(tab.Flags & TabItemFlags.NoPushId))
            g.CurrentWindow.IDStack.pop();
    },

    tabItemEx(tab_bar, label, p_open, flags)
    {
        // Layout whole tab bar if not already done
        if (tab_bar.WantLayout)
            this.tabBarLayout(tab_bar);

        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.SkipItems)
            return false;

        const style = g.Style;
        const id = this.tabBarCalcTabID(tab_bar, label);

        // If the user called us with *p_open == false, we early out and
        // don't render. We make a dummy call to ItemAdd() so that attempts
        // to use a contextual popup menu with an implicit ID won't use an
        // older ID.
        if (p_open && !p_open.get())
        {
            this.PushItemFlag(ItemFlags.NoNav | ItemFlags.NoNavDefaultFocus, true);
            this.itemAdd(new Rect(), id);
            this.PopItemFlag();
            return false;
        }

        // Calculate tab contents size
        let size = this.tabItemCalcSize(label, p_open != null);

        // Acquire tab data
        let tab = this.tabBarFindTabByID(tab_bar, id);
        let tab_is_new = false;
        if (tab == null)
        {
            tab = new TabItem();
            tab.ID = id;
            tab.Width = size.x;
            tab_is_new = true;
            tab_bar.Tabs.push(tab);
        }
        tab_bar.LastTabItemIdx = tab_bar.Tabs.indexOf(tab);
        tab.WidthContents = size.x;

        if (p_open == null)
            flags |= TabItemFlags.NoCloseButton;

        const tab_bar_appearing = (tab_bar.PrevFrameVisible + 1 < g.FrameCount);
        const tab_bar_focused = (tab_bar.Flags & TabBarFlags.IsFocused) != 0;
        const tab_appearing = (tab.LastFrameVisible + 1 < g.FrameCount);
        tab.LastFrameVisible = g.FrameCount;
        tab.Flags = flags;

        // Append name with zero-terminator
        tab.NameOffset = tab_bar.TabsNames.length;
        tab_bar.TabsNames.push(label);

        // If we are not reorderable, always reset offset based on submission order.
        // (We already handled layout and sizing using the previous known order,
        // but sizing is not affected by order!)
        if (!tab_appearing && !(tab_bar.Flags & TabBarFlags.Reorderable))
        {
            tab.Offset = tab_bar.OffsetNextTab;
            tab_bar.OffsetNextTab += tab.Width + g.Style.ItemInnerSpacing.x;
        }

        // Update selected tab
        if (tab_appearing && (tab_bar.Flags & TabBarFlags.AutoSelectNewTabs) &&
            tab_bar.NextSelectedTabId == 0)
        {
            if (!tab_bar_appearing || tab_bar.SelectedTabId == 0)
                tab_bar.NextSelectedTabId = id;  // New tabs gets activated
        }
        // SetSelected can only be passed on explicit tab bar
        if ((flags & TabItemFlags.SetSelected) && (tab_bar.SelectedTabId != id))
        {
            tab_bar.NextSelectedTabId = id;
        }

        // Lock visibility
        let tab_contents_visible = (tab_bar.VisibleTabId == id);
        if (tab_contents_visible)
            tab_bar.VisibleTabWasSubmitted = true;

        // On the very first frame of a tab bar we let first tab contents be
        // visible to minimize appearing glitches
        if (!tab_contents_visible && tab_bar.SelectedTabId == 0 && tab_bar_appearing)
        {
            if (tab_bar.Tabs.length == 1 && !(tab_bar.Flags & TabBarFlags.AutoSelectNewTabs))
                tab_contents_visible = true;
        }

        if (tab_appearing && !(tab_bar_appearing && !tab_is_new))
        {
            this.PushItemFlag(ItemFlags.NoNav | ItemFlags.NoNavDefaultFocus, true);
            this.itemAdd(new Rect(), id);
            this.PopItemFlag();
            return tab_contents_visible;
        }

        if (tab_bar.SelectedTabId == id)
            tab.LastFrameSelected = g.FrameCount;

        // Backup current layout position
        const backup_main_cursor_pos = win.DC.CursorPos;

        // Layout
        size.x = tab.Width;
        win.DC.CursorPos = Vec2.AddXY(tab_bar.BarRect.Min,
                        Math.floor(tab.Offset - tab_bar.ScrollingAnim), 0.0);
        let pos = win.DC.CursorPos;
        let bb = new Rect(pos, Vec2.Add(pos, size));

        // We don't have CPU clipping primitives to clip the CloseButton (until
        // it becomes a texture), so need to add an extra draw call (temporary
        // in the case of vertical animation)
        let want_clip_rect = (bb.Min.x < tab_bar.BarRect.Min.x) ||
                              (bb.Max.x >= tab_bar.BarRect.Max.x);
        if (want_clip_rect)
        {
            this.PushClipRect(
                    new Vec2(Math.max(bb.Min.x, tab_bar.BarRect.Min.x), bb.Min.y - 1),
                    new Vec2(tab_bar.BarRect.Max.x, bb.Max.y),
                    true);
        }

        this.itemSize(bb, style.FramePadding.y);
        if (!this.itemAdd(bb, id))
        {
            if (want_clip_rect)
                this.PopClipRect();
            win.DC.CursorPos = backup_main_cursor_pos;
            return tab_contents_visible;
        }

        // Click to Select a tab
        let button_flags = (ButtonFlags.PressedOnClick | ButtonFlags.AllowItemOverlap);
        if (g.DragDropActive)
            button_flags |= ButtonFlags.PressedOnDragDropHold;
        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bb, id, hovered, held, button_flags);
        if (pressed)
            tab_bar.NextSelectedTabId = id;
        hovered |= (g.HoveredId == id);

        // Allow the close button to overlap unless we are dragging (in which
        // case we don't want any overlapping tabs to be hovered)
        if (!held.get())
            this.SetItemAllowOverlap();

        // Drag and drop: re-order tabs
        if (held && !tab_appearing && this.IsMouseDragging(0) && 
            (tab_bar.Flags & TabBarFlags.Reorderable))
        {
            if (!g.DragDropActive)
            {
                // While moving a tab it will jump on the other side of the mouse, so we also test for MouseDelta.x
                if (g.IO.MouseDelta.x < 0 && g.IO.MousePos.x < bb.Min.x)
                {
                    if (tab_bar.Flags & TabBarFlags.Reorderable)
                        this.tabBarQueueChangeTabOrder(tab_bar, tab, -1);
                }
                else
                if (g.IO.MouseDelta.x > 0 && g.IO.MousePos.x > bb.Max.x)
                {
                    if (tab_bar.Flags & TabBarFlags.Reorderable)
                        this.tabBarQueueChangeTabOrder(tab_bar, tab, +1);
                }
            }
        }

        if(false)
        {
            // XXX: pending evaluation/implementation of ForegroundDrawList
            if (hovered && g.HoveredIdNotActiveTimer > 0.50&&
                bb.GetWidth() < tab.WidthContents)
            {
                // Enlarge tab display when hovering
                bb.Max.x = bb.Min.x + Math.floor(Vec1.Lerp(bb.GetWidth(), tab.WidthContents,
                                                Vec1.Saturate((g.HoveredIdNotActiveTimer - 0.4)*6)));
                let display_draw_list = this.GetForegroundDrawList(win);
                this.tabItemBackground(display_draw_list, bb, flags,
                                    style.GetColor("TitleBgActive"));
            }
        }

        // Render tab shape
        let drawList = win.DrawList;
        const tab_col = style.GetColor((held.get() || hovered) ? "TabHovered" :
                tab_contents_visible ? (tab_bar_focused ? "TabActive" : "TabUnfocusedActive") :
                        (tab_bar_focused ? "Tab" : "TabUnfocused"));
        this.tabItemBackground(drawList, bb, flags, tab_col);
        this.renderNavHighlight(bb, id);

        // Select with right mouse button. This is so the common idiom for
        // context menu automatically highlight the current widget.
        const hovered_unblocked = this.IsItemHovered(HoveredFlags.AllowWhenBlockedByPopup);
        if (hovered_unblocked && 
            (this.IsMouseClicked(1) || this.IsMouseReleased(1))
           )
        {
            tab_bar.NextSelectedTabId = id;
        }

        if (tab_bar.Flags & TabBarFlags.NoCloseWithMiddleMouseButton)
            flags |= TabItemFlags.NoCloseWithMiddleMouseButton;

        // Render tab label, process close button
        const close_button_id = p_open ? win.GetID("" + id + 1) : 0;
        let just_closed = this.tabItemLabelAndCloseButton(drawList, bb, flags,
                                tab_bar.FramePadding, label, id, close_button_id);
        if (just_closed && p_open != null)
        {
            p_open.set(false);
            this.tabBarCloseTab(tab_bar, tab);
        }

        // Restore main window position so user can draw there
        if (want_clip_rect)
            this.PopClipRect();
        win.DC.CursorPos = backup_main_cursor_pos;

        // Tooltip (FIXME: Won't work over the close button because
        // ItemOverlap systems messes up with HoveredIdTimer). We test
        // IsItemHovered() to discard e.g. when another item is active
        // or drag and drop over the tab bar (which g.HoveredId ignores)
        if (g.HoveredId == id && !held && g.HoveredIdNotActiveTimer > 0.5
                && this.IsItemHovered())
        {
            if (!(tab_bar.Flags & TabBarFlags.NoTooltip))
                this.SetTooltip(label);
        }
        return tab_contents_visible;
    },

    // notify TabBar or Docking system of a closed tab/window ahead
    // (useful to reduce visual flicker on reorderable tab bars).
    // For tab-bar: call after BeginTabBar() and before Tab submissions.
    // Otherwise call with a window name.
    SetTabItemClosed(_tab_or_docked_window_label)
    {
    },

    // This is called only once a frame before by the first call to ItemTab()
    // The reason we're not calling it in BeginTabBar() is to leave a chance
    // to the user to call the SetTabItemClosed() functions.
    tabBarLayout(tab_bar)
    {
        let g = this.guictx;
        tab_bar.WantLayout = false;

        // Garbage collect
        let tab_dst_n = 0;
        for (let tab_src_n = 0; tab_src_n < tab_bar.Tabs.length; tab_src_n++)
        {
            let tab = tab_bar.Tabs[tab_src_n];
            if (tab.LastFrameVisible < tab_bar.PrevFrameVisible)
            {
                if (tab.ID == tab_bar.SelectedTabId)
                    tab_bar.SelectedTabId = 0;
                continue;
            }
            if (tab_dst_n != tab_src_n)
                tab_bar.Tabs[tab_dst_n] = tab_bar.Tabs[tab_src_n];
            tab_dst_n++;
        }
        if (tab_bar.Tabs.length != tab_dst_n)
            tab_bar.Tabs.length = tab_dst_n; // resize

        // Setup next selected tab
        let scrollTrackSelTabId = 0;
        if (tab_bar.NextSelectedTabId)
        {
            tab_bar.SelectedTabId = tab_bar.NextSelectedTabId;
            tab_bar.NextSelectedTabId = 0;
            scrollTrackSelTabId = tab_bar.SelectedTabId;
        }

        // Process order change request (we could probably process it when
        // requested but it's just saner to do it in a single spot).
        if (tab_bar.ReorderRequestTabId != 0)
        {
            let tab1 = this.tabBarFindTabByID(tab_bar, tab_bar.ReorderRequestTabId);
            if(tab1)
            {
                //IM_ASSERT(tab_bar->Flags & ImGuiTabBarFlags_Reorderable);
                // <- this may happen when using debug tools
                let tab2_order = tab_bar.GetTabOrder(tab1) + tab_bar.ReorderRequestDir;
                if (tab2_order >= 0 && tab2_order < tab_bar.Tabs.length)
                {
                    let tab2 = tab_bar.Tabs[tab2_order];
                    tab_bar.Tabs[tab2_order] = tab1;
                    tab_bar.Tabs[tab_bar.ReqorderRequestTabId] = tab2;
                    if (tab2.ID == tab_bar.SelectedTabId)
                        scrollTrackSelTabId = tab2.ID;
                }
                if (tab_bar.Flags & TabBarFlags.SaveSettings)
                    this.MarkIniSettingsDirty();
            }
            tab_bar.ReorderRequestTabId = 0;
        }

        // Tab List Popup (will alter tab_bar->BarRect and therefore the available width!)
        const tab_list_popup_button = (tab_bar.Flags & TabBarFlags.TabListPopupButton) != 0;
        if (tab_list_popup_button)
        {
            // NB: Will alter BarRect.Max.x!
            let tab_to_select = this.tabBarTabListPopupButton(tab_bar);
            if (tab_to_select)
                scrollTrackSelTabId = tab_bar.SelectedTabId = tab_to_select.ID;
        }

        let widthBuffer = g.TabSortByWidthBuffer;
        widthBuffer.length = tab_bar.Tabs.length; // resize

        // Compute ideal widths
        let widthTotal = 0.;
        let recentTab = null;
        let foundSelTabID = false;
        for (let tab_n = 0; tab_n < tab_bar.Tabs.length; tab_n++)
        {
            let tab = tab_bar.Tabs[tab_n];
            console.assert(tab.LastFrameVisible >= tab_bar.PrevFrameVisible);

            if (recentTab == null ||
                recentTab.LastFrameSelected < tab.LastFrameSelected)
            {
                recentTab = tab;
            }
            if (tab.ID == tab_bar.SelectedTabId)
                foundSelTabID = true;

            // Refresh tab width immediately, otherwise changes of style e.g.
            // style.FramePadding.x would noticeably lag in the tab bar.
            // Additionally, when using TabBarAddTab() to manipulate tab bar
            // order we occasionally insert new tabs that don't have a width yet,
            // and we cannot wait for the next BeginTabItem() call. We cannot
            // compute this width within TabBarAddTab() because font size depends
            // on the active window.
            const tab_name = tab_bar.GetTabName(tab);
            tab.WidthContents = this.tabItemCalcSize(tab_name,
                    (tab.Flags & TabItemFlags.NoCloseButton) ? false : true).x;

            widthTotal += (tab_n > 0 ? g.Style.ItemInnerSpacing.x : 0) + tab.WidthContents;

            // Store data so we can build an array sorted by width if we need to shrink tabs down
            let si = widthBuffer[tab_n];
            if(si == null)
            {
                si = new TabSortItem();
                widthBuffer[tab_n] = si;
            }
            si.Index = tab_n;
            si.Width = tab.WidthContents;
        }
        // Compute width
        const width_avail = tab_bar.BarRect.GetWidth();
        let width_excess = (width_avail < widthTotal) ? (widthTotal - width_avail) : 0;
        if (width_excess > 0 && (tab_bar.Flags & TabBarFlags.FittingPolicyResizeDown))
        {
            // If we don't have enough room, resize down the largest tabs first
            if (tab_bar.Tabs.length > 1)
            {
                widthBuffer.sort(this.tabBarSortItemComparer);
            }
            let tab_count_same_width = 1;
            while (width_excess > 0 &&
                    tab_count_same_width < tab_bar.Tabs.length)
            {
                while (tab_count_same_width < tab_bar.Tabs.length &&
                        widthBuffer[0].Width == widthBuffer[tab_count_same_width].Width)
                {
                    tab_count_same_width++;
                }
                let width_to_remove_per_tab_max = (tab_count_same_width < tab_bar.Tabs.length) ?
                        (widthBuffer[0].Width - widthBuffer[tab_count_same_width].Width) :
                        (widthBuffer[0].Width - 1);
                let width_to_remove_per_tab = Math.min(width_excess / tab_count_same_width, width_to_remove_per_tab_max);
                for (let tab_n = 0; tab_n < tab_count_same_width; tab_n++)
                    widthBuffer[tab_n].Width -= width_to_remove_per_tab;
                width_excess -= width_to_remove_per_tab * tab_count_same_width;
            }
            for (let tab_n=0; tab_n < tab_bar.Tabs.length; tab_n++)
            {
                tab_bar.Tabs[widthBuffer[tab_n].Index].Width =
                            Math.floor(widthBuffer[tab_n].Width);
            }
        }
        else
        {
            const tab_max_width = this.tabBarCalcMaxTabWidth();
            for (let tab_n = 0; tab_n < tab_bar.Tabs.length; tab_n++)
            {
                let tab = tab_bar.Tabs[tab_n];
                tab.Width = Math.min(tab.WidthContents, tab_max_width);
            }
        }
        // Layout all active tabs
        let offset_x = 0.;
        for (let tab_n=0; tab_n<tab_bar.Tabs.length; tab_n++)
        {
            let tab = tab_bar.Tabs[tab_n];
            tab.Offset = offset_x;
            if (scrollTrackSelTabId == 0 && g.NavJustMovedToId == tab.ID)
                scrollTrackSelTabId = tab.ID;
            offset_x += tab.Width + g.Style.ItemInnerSpacing.x;
        }
        tab_bar.OffsetMax = Math.max(offset_x - g.Style.ItemInnerSpacing.x, 0);
        tab_bar.OffsetNextTab = 0;

        // Horizontal scrolling buttons
        const scrolling_buttons = (tab_bar.OffsetMax > tab_bar.BarRect.GetWidth() &&
                                    tab_bar.Tabs.length > 1) &&
                                !(tab_bar.Flags & TabBarFlags.NoTabListScrollingButtons) &&
                                (tab_bar.Flags & TabBarFlags.FittingPolicyScroll);
        if (scrolling_buttons)
        {
            // NB: Will alter BarRect.Max.x!
            let tab_to_select = this.tabBarScrollingButtons(tab_bar);
            if (tab_to_select)
            {
                scrollTrackSelTabId =
                tab_bar.SelectedTabId = tab_to_select.ID;
            }
        }

        // If we have lost the selected tab, select the next most recently
        // active one
        if (foundSelTabID == false)
            tab_bar.SelectedTabId = 0;
        if (tab_bar.SelectedTabId == 0 && tab_bar.NextSelectedTabId == 0 && recentTab != null)
            scrollTrackSelTabId = tab_bar.SelectedTabId = recentTab.ID;

        // Lock in visible tab
        tab_bar.VisibleTabId = tab_bar.SelectedTabId;
        tab_bar.VisibleTabWasSubmitted = false;

        // Update scrolling
        if (scrollTrackSelTabId)
        {
            let scrollTrackSel = this.tabBarFindTabByID(tab_bar, scrollTrackSelTabId);
            if (scrollTrackSel)
                this.tabBarScrollToTab(tab_bar, scrollTrackSel);
        }
        tab_bar.ScrollingAnim = this.tabBarScrollClamp(tab_bar, tab_bar.ScrollingAnim);
        tab_bar.ScrollingTarget = this.tabBarScrollClamp(tab_bar, tab_bar.ScrollingTarget);
        if (tab_bar.ScrollingAnim != tab_bar.ScrollingTarget)
        {
            // Scrolling speed adjust itself so we can always reach our
            // target in 1/3 seconds. Teleport if we are aiming far off
            // the visible line
            tab_bar.ScrollingSpeed = Math.max(tab_bar.ScrollingSpeed, 70*g.FontSize);
            tab_bar.ScrollingSpeed = Math.max(tab_bar.ScrollingSpeed,
                    Math.abs(tab_bar.ScrollingTarget-tab_bar.ScrollingAnim)/0.3);
            const teleport = (tab_bar.PrevFrameVisible + 1 < g.FrameCount) ||
                    (tab_bar.ScrollingTargetDistToVisibility > 10*g.FontSize);
            tab_bar.ScrollingAnim = teleport ? tab_bar.ScrollingTarget :
                linearSweep(tab_bar.ScrollingAnim, tab_bar.ScrollingTarget,
                            g.IO.DeltaTime * tab_bar.ScrollingSpeed);
        }
        else
        {
            tab_bar.ScrollingSpeed = 0.;
        }
        // Clear name buffers
        if ((tab_bar.Flags & TabBarFlags.DockNode) == 0)
            tab_bar.TabsNames.length = 0; // resize
    },

    tabBarCalcMaxTabWidth()
    {
        return this.guictx.FontSize * 20;
    },

    tabBarFindTabByID(tabbar, tabid)
    {
        if(tabid != 0)
        {
            for(let n=0;n<tabbar.Tabs.length;n++)
            {
                if(tabbar.Tabs[n].ID == tabid)
                    return tabbar.Tabs[n];
            }
        }
        return null;
    },

    tabBarCloseTab(tabbar, tab)
    {
        if ((tabbar.VisibleTabId == tab.ID) &&
            !(tab.Flags & TabItemFlags.UnsavedDocument))
        {
            // This will remove a frame of lag for selecting another tab on closure.
            // However we don't run it in the case where the 'Unsaved' flag is
            // set, so user gets a chance to fully undo the closure
            tab.LastFrameVisible = -1;
            tabbar.SelectedTabId = tabbar.NextSelectedTabId = 0;
        }
        else
        if ((tabbar.VisibleTabId != tab.ID) &&
            (tab.Flags & TabItemFlags.UnsavedDocument))
        {
            // Actually select before expecting closure
            tabbar.NextSelectedTabId = tab.ID;
        }
    },

    tabBarQueueChangeTabOrder(tabbar, tab, dir)
    {
        console.assert(dir == -1 || dir == +1);
        console.assert(tabbar.ReorderRequestTabId == 0);
        tabbar.ReorderRequestTabId = tab.ID;
        tabbar.ReorderRequestDir = dir;
    },

    tabBarScrollClamp(tabbar, scrolling)
    {
        scrolling = Math.min(scrolling, tabbar.OffsetMax-tabbar.BarRect.GetWidth());
        return Math.max(scrolling, 0);
    },

    tabBarScrollToTab(tabbar, tab)
    {
        let g = this.guictx;
        // When to scroll to make Tab N+1 visible always make a bit of N
        // visible to suggest more scrolling area (since we don't have a scrollbar)
        let margin = g.FontSize * 1;
        let order = tabbar.GetTabOrder(tab);
        let tab_x1 = tab.Offset + (order > 0 ? -margin : 0);
        let tab_x2 = tab.Offset + tab.Width + (order + 1 < tabbar.Tabs.length ? margin : 1);
        tabbar.ScrollingTargetDistToVisibility = 0;
        if (tabbar.ScrollingTarget > tab_x1)
        {
            tabbar.ScrollingTargetDistToVisibility = Math.max(tabbar.ScrollingAnim - tab_x2, 0);
            tabbar.ScrollingTarget = tab_x1;
        }
        else
        if (tabbar.ScrollingTarget < tab_x2 - tabbar.BarRect.GetWidth())
        {
            let w = tabbar.BarRect.GetWidth();
            tabbar.ScrollingTargetDistToVisibility = Math.max((tab_x1 - w) - tabbar.ScrollingAnim, 0.);
            tabbar.ScrollingTarget = tab_x2 - w;
        }
    },

    tabItemCalcSize(label, hasCloseButton)
    {
        let g = this.guictx;
        if(label == undefined)
        {
            console.assert(0);
            label = "Error";
        }
        let labelSize = this.CalcTextSize(label, true/*hide text after ##*/);
        let size = new Vec2(labelSize.x + g.Style.FramePadding.x,
                            labelSize.y + g.Style.FramePadding.y * 2);
        size.x += g.Style.FramePadding.x + 1;
        if (hasCloseButton)
        {
            size.x += (g.Style.ItemInnerSpacing.x + g.FontSize); 
            // We use FontSize (Y) intentionally to fit the close button circle.
        }

        size.x = Math.min(size.x, this.tabBarCalcMaxTabWidth());
        return size;
    },

    tabItemBackground(drawlist, bb, itemflags, col)
    {
        // While rendering tabs, we trim 1 pixel off the top of our bounding
        // box so they can fit within a regular frame height while looking
        // "detached" from it.
        let g = this.guictx;
        const width = bb.GetWidth();
        console.assert(width > 0.);
        const rounding = Math.max(0, Math.min(g.Style.TabRounding, width * 0.5 - 1));
        const y1 = bb.Min.y + 1;
        const y2 = bb.Max.y - 1;
        drawlist.PathLineTo(new Vec2(bb.Min.x, y2));
        drawlist.PathArcToFast(new Vec2(bb.Min.x + rounding, y1 + rounding), rounding, 6, 9);
        drawlist.PathArcToFast(new Vec2(bb.Max.x - rounding, y1 + rounding), rounding, 9, 12);
        drawlist.PathLineTo(new Vec2(bb.Max.x, y2));
        drawlist.PathFillConvex(col);
        if (g.Style.TabBorderSize > 0.)
        {
            drawlist.PathLineTo(new Vec2(bb.Min.x + 0.5, y2));
            drawlist.PathArcToFast(new Vec2(bb.Min.x + rounding + 0.5,
                                            y1 + rounding + 0.5),
                                  rounding, 6, 9);
            drawlist.PathArcToFast(new Vec2(bb.Max.x - rounding - 0.5,
                                            y1 + rounding + 0.5),
                                  rounding, 9, 12);
            drawlist.PathLineTo(new Vec2(bb.Max.x - 0.5, y2));
            drawlist.PathStroke(g.Style.GetColor("Border"), false, g.Style.TabBorderSize);
        }
    },

    // Render text label (with custom clipping) + Unsaved Document marker + Close Button logic
    // We tend to lock style.FramePadding for a given tab-bar, hence the 'frame_padding' parameter.
    tabItemLabelAndCloseButton(drawlist, bb, flags, framepadding, label,
                                tabid, closebuttonid)
    {
        let g = this.guictx;
        let labelSize = this.CalcTextSize(label, true);
        // Render text label (with clipping + alpha gradient) + unsaved marker
        const TAB_UNSAVED_MARKER = "*";
        let text_pixel_clip_bb = Rect.FromXY(bb.Min.x + framepadding.x,
                                             bb.Min.y + framepadding.y,
                                             bb.Max.x - framepadding.x,
                                             bb.Max.y);
        if (flags & TabItemFlags.UnsavedDocument)
        {
            text_pixel_clip_bb.Max.x -= this.CalcTextSize(TAB_UNSAVED_MARKER, null, false).x;
            let unsaved_marker_pos = new Vec2(
                    Math.min(bb.Min.x+framepadding.x+labelSize.x+2,
                             text_pixel_clip_bb.Max.x),
                    bb.Min.y+framepadding.y+Math.floor(-g.FontLineHeight * 0.25));
            this.renderTextClippedEx(drawlist, unsaved_marker_pos,
                                    Vec2.Subtract(bb.Max,framepadding),
                                    TAB_UNSAVED_MARKER, null, null);
        }
        let text_ellipsis_clip_bb = text_pixel_clip_bb.Clone();

        // Close Button
        // We are relying on a subtle and confusing distinction between
        // 'hovered' and 'g.HoveredId' which happens because we are using
        // ImGuiButtonFlags_AllowOverlapMode + SetItemAllowOverlap()
        //  'hovered' will be true when hovering the Tab but NOT when
        //      hovering the close button
        //  'g.HoveredId==id' will be true when hovering the Tab including
        //      when hovering the close button
        //  'g.ActiveId==close_button_id' will be true when we are holding
        //      on the close button, in which case both hovered booleans are false
        let close_button_pressed = false;
        let close_button_visible = false;
        if (closebuttonid != 0)
        {
            if (g.HoveredId == tabid || g.HoveredId == closebuttonid ||
                g.ActiveId == closebuttonid)
            {
                close_button_visible = true;
            }
        }
        if (close_button_visible)
        {
            let last_item_backup = new ItemHoveredDataBackup(this.guictx);
            const close_button_sz = g.FontSize * 0.5;
            if (this.CloseButton(closebuttonid,
                    new Vec2(bb.Max.x - framepadding.x - close_button_sz,
                             bb.Min.y + framepadding.y + close_button_sz),
                             close_button_sz))
            {
                close_button_pressed = true;
            }
            last_item_backup.Restore();

            // Close with middle mouse button
            if (!(flags & TabItemFlags.NoCloseWithMiddleMouseButton) &&
                this.IsMouseClicked(2))
            {
                close_button_pressed = true;
            }
            text_pixel_clip_bb.Max.x -= close_button_sz * 2.;
        }
        // Label with ellipsis
        // FIXME: This should be extracted into a helper but the use of
        // text_pixel_clip_bb and !close_button_visible makes it tricky to
        // abstract at the moment
        //const label_display_end = FindRenderedTextEnd(label);
        if (labelSize.x > text_ellipsis_clip_bb.GetWidth())
        {
            const ellipsis_dot_count = 3;
            const ellipsis_width = (1. + 1.) * ellipsis_dot_count - 1.;
            const maxwidth = text_ellipsis_clip_bb.GetWidth()-ellipsis_width+1;
            let labelClippedX = g.Font.CalcTextSizeA(maxwidth, -1, label).x;

            // nb: could add ellipses
            // console.assert(0, "need to clip label: " + labelClippedX);
            this.renderTextClippedEx(drawlist, text_pixel_clip_bb.Min,
                        text_pixel_clip_bb.Max, label, null);
        }
        else
        {
            this.renderTextClippedEx(drawlist, text_pixel_clip_bb.Min,
                        text_pixel_clip_bb.Max, label, null);
        }
        return close_button_pressed;
    },

    tabBarTabListPopupButton(tab_bar)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;

        // We use g.Style.FramePadding.y to match the square ArrowButton size
        const tab_list_popup_button_width = g.FontLineHeight + g.Style.FramePadding.y;
        const backup_cursor_pos = win.DC.CursorPos;
        win.DC.CursorPos = new Vec2(tab_bar.BarRect.Min.x - g.Style.FramePadding.y,
                                    tab_bar.BarRect.Min.y);
        tab_bar.BarRect.Min.x += tab_list_popup_button_width;

        let arrow_col = g.Style.Colors["Text"];
        arrow_col.w *= 0;
        this.PushStyleColor("Text", arrow_col);
        this.PushStyleColor("Button", Color.rgba(0,0,0,0));
        let open = this.BeginCombo("##v", null, ComboFlags.NoPreview);
        this.PopStyleColor(2);

        let tab_to_select = null;
        if (open)
        {
            for (let tab_n = 0; tab_n < tab_bar.Tabs.length; tab_n++)
            {
                let tab = tab_bar.Tabs[tab_n];
                let tab_name = tab_bar.GetTabName(tab);
                if (this.Selectable(tab_name, tab_bar.SelectedTabId == tab.ID))
                    tab_to_select = tab;
            }
            this.EndCombo();
        }

        win.DC.CursorPos = backup_cursor_pos;
        return tab_to_select;
    },

    tabBarScrollingButtons(tab_bar)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;

        const arrow_button_size = new Vec2(g.FontSize - 2,
                                    g.FontSize + g.Style.FramePadding.y * 2);
        const scrolling_buttons_width = arrow_button_size.x * 2;

        const backup_cursor_pos = win.DC.CursorPos.Clone();
        //win.DrawList.AddRect(new Vec2(tab_bar.BarRect.Max.x - scrolling_buttons_width, tab_bar.BarRect.Min.y), new Vec2(tab_bar.BarRect.Max.x, tab_bar.BarRect.Max.y), IM_COL32(255,0,0,255));

        const avail_bar_rect = tab_bar.BarRect;
        let want_clip_rect = !avail_bar_rect.Contains(
                                new Rect(win.DC.CursorPos,
                                    Vec2.AddXY(win.DC.CursorPos,
                                            scrolling_buttons_width, 0)
                                       ));
        if (want_clip_rect)
        {
            this.PushClipRect(tab_bar.BarRect.Min,
                               Vec2.AddXY(tab_bar.BarRect.Max,
                                    g.Style.ItemInnerSpacing.x, 0),
                              true);
        }

        let tab_to_select = null;

        let select_dir = 0;
        const arrow_col = g.Style.Colors.Text;
        arrow_col.w *= 0.5;

        this.PushStyleColor("Text", arrow_col);
        this.PushStyleColor("Button", Colors.clear);
        const backup_repeat_delay = g.IO.KeyRepeatDelay;
        const backup_repeat_rate = g.IO.KeyRepeatRate;
        g.IO.KeyRepeatDelay = 0.25;
        g.IO.KeyRepeatRate = 0.200;
        win.DC.CursorPos = new Vec2(tab_bar.BarRect.Max.x - scrolling_buttons_width,
                                    tab_bar.BarRect.Min.y);
        if (this.ArrowButtonEx("##<", Dir.Left, arrow_button_size,
                        ButtonFlags.PressedOnClick | ButtonFlags.Repeat))
            select_dir = -1;
        win.DC.CursorPos = new Vec2(tab_bar.BarRect.Max.x - scrolling_buttons_width + arrow_button_size.x,
                                    tab_bar.BarRect.Min.y);
        if (this.ArrowButtonEx("##>", Dir.Right, arrow_button_size,
                        ButtonFlags.PressedOnClick | ButtonFlags.Repeat))
            select_dir = +1;
        this.PopStyleColor(2);
        g.IO.KeyRepeatRate = backup_repeat_rate;
        g.IO.KeyRepeatDelay = backup_repeat_delay;

        if (want_clip_rect)
            this.PopClipRect();

        if (select_dir != 0)
        {
            let tab_item = this.TabBarFindTabByID(tab_bar, tab_bar.SelectedTabId);
            if (tab_item)
            {
                let selected_order = tab_bar.GetTabOrder(tab_item);
                let target_order = selected_order + select_dir;
                // If we are at the end of the list, still scroll to make our
                // tab visible
                let it = (target_order >= 0 && target_order < tab_bar.Tabs.length) ?
                            target_order : selected_order;
                tab_to_select = tab_bar.Tabs[it];
            }
        }
        win.DC.CursorPos = backup_cursor_pos;
        tab_bar.BarRect.Max.x -= scrolling_buttons_width + 1;
        return tab_to_select;
    },

};