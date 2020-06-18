import {Vec2, Rect, ValRef} from "../types.js";
import {ItemFlags, ItemStatusFlags} from "../flags.js";
import {WindowFlags} from "../window.js";
import {LayoutType, Axis, MouseCursor} from "../enums.js";
import {ButtonFlags} from "./button.js";

//-------------------------------------------------------------------------
// [SECTION] Widgets: Low-level Layout helpers
//-------------------------------------------------------------------------
// - Spacing()
// - Dummy()
// - NewLine()
// - AlignTextToFramePadding()
// - Separator()
//  -- SeparatorFlags
// - VerticalSeparator() [Internal]
// - SplitterBehavior() [Internal]
// - GroupBegin/End
//
//  notes:
//      
//-------------------------------------------------------------------------
export var SeparatorFlags =
{
    None: 0,
    Horizontal: 1 << 0,
    Vertical: 1 << 1
};

class GroupData
{
    constructor(win, guictx)
    {
        this.BackupCursorPos = win.DC.CursorPos.Clone(); // Vec2
        this.BackupCursorMaxPos = win.DC.CursorMaxPos.Clone(); // Vec2
        this.BackupIndent = win.DC.Indent.Clone(); // Vec1
        this.BackupGroupOffset = win.DC.GroupOffset.Clone(); // Vec1
        this.BackupCurrentLineHeight = win.DC.CurrentLineHeight;
        this.BackupCurrentLineHeightMax = win.DC.CurrentLineHeightMax;
        this.BackupCurrentLineTextBaseOffset = win.DC.CurrentLineTextBaseOffset;
        this.BackupActiveIdIsAlive = guictx.ActiveIdIsAlive;
        this.BackupActiveIdPreviousFrameIsAlive = guictx.ActiveIdPreviousFrameIsAlive;
        this.AdvanceCursor = true;
    }
}

export var ImguiLayoutMixin =
{

    // Gets back to previous line and continue with horizontal layout
    //      offset_from_start_x == 0 : follow right after previous item
    //      offset_from_start_x != 0 : align to specified x position (relative to window/group left)
    //      spacing_w < 0            : use default spacing if pos_x == 0, no spacing if pos_x != 0
    //      spacing_w >= 0           : enforce spacing amount
    SameLine(offset_from_start_x=0, spacing_w=-1)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        if (offset_from_start_x != 0)
        {
            if (spacing_w < 0.) spacing_w = 0.;
            win.DC.CursorPos.x = win.Pos.x - win.Scroll.x + offset_from_start_x +
                  spacing_w + win.DC.GroupOffset.x + win.DC.ColumnsOffset.x;
            win.DC.CursorPos.y = win.DC.CursorPosPrevLine.y;
        }
        else
        {
            if (spacing_w < 0) spacing_w = g.Style.ItemSpacing.x;
            win.DC.CursorPos.x = win.DC.CursorPosPrevLine.x + spacing_w;
            win.DC.CursorPos.y = win.DC.CursorPosPrevLine.y;
        }
        win.DC.CurrentLineHeight = win.DC.PrevLineHeight;
        win.DC.CurrentLineHeightMax = win.DC.PrevLineHeightMax;
        win.DC.CurrentLineTextBaseOffset = win.DC.PrevLineTextBaseOffset;
    },

    PrevLineHeight()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return 0;
        return win.DC.PrevLineHeight;
    },

    Indent(indent_w = 0)
    {
        let win = this.getCurrentWindow();
        let g = this.guictx;
        win.DC.Indent.x += (indent_w != 0) ? indent_w : g.Style.IndentSpacing;
        win.DC.CursorPos.x = win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x;
    },

    Unindent(indent_w = 0)
    {
        let win = this.getCurrentWindow();
        let g = this.guictx;
        win.DC.Indent.x -= (indent_w != 0) ? indent_w : g.Style.IndentSpacing;
        win.DC.CursorPos.x = win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x;
    },

    Spacing()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;
        this.itemSize(Vec2.Zero());
    },

    Dummy(size)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let bb = new Rect(win.DC.CursorPos,
                        Vec2.Add(win.DC.CursorPos, size));
        this.itemSize(bb);
        this.itemAdd(bb, 0);
    },

    NextItemWouldBeClipped(size)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return true;
        let bb = new Rect(win.DC.CursorPos,
                        Vec2.Add(win.DC.CursorPos, size));
        return this.isClippedEx(bb);
    },

    // undo a SameLine() or force a new line when in an horizontal-layout context.
    NewLine(fraction=1)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        let backup_layout_type = win.DC.LayoutType;
        win.DC.LayoutType = LayoutType.Vertical;
        // In the event that we are on a line with items that are smaller than
        // FontLineHeight, we will preserve that height.
        if (win.DC.CurrentLineHeight > 0)
            this.itemSize(Vec2.Zero());
        else
            this.itemSize(new Vec2(0, g.FontLineHeight*fraction));
        win.DC.LayoutType = backup_layout_type;
    },

    // text alignment notes:
    //    CursorPos is the overall arbiter
    //      text_pos = new Vec2(win.DC.CursorPos.x, 
    //                      win.DC.CursorPos.y + win.DC.CurrentLineTextBaseOffset);
    //    Font drawing applies it's font-metrics to "find a baseline".
    //    CurrentLineTextBaseOffset is from the top, ie: 0 is the default.
    //    CurrentLineHeight 
    //          * is managed by this file (though it may be zeroed elsewhere)
    //          * is used by button, text, tree
    //  
    AlignTextToFramePadding()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        let next = Math.max(win.DC.CurrentLineHeight,
                        g.FontLineHeight + g.Style.FramePadding.y * 2);
        win.DC.CurrentLineHeight = next;
        win.DC.CurrentLineHeightMax = Math.max(win.DC.CurrentLineHeightMax, next);
        win.DC.CurrentLineTextBaseOffset = Math.max(win.DC.CurrentLineTextBaseOffset,
                                            g.Style.FramePadding.y);
    },

    // AlignTextToFrameCenter may be useful in lines with a variety
    // of font sizes.  The goal is to cause Big and small fonts
    // to share a midline (defined as Baseline / 2). The knob that
    // governs this is "CurrentLineTextBaseOffset", and the method above
    // only increases this value (always takes the max encountered).
    // This method allows the value to grow and to shrink according to
    // the current font.  A problem arises whereby a line begins with
    // a small font, the proceeds to a large one.  In this case the large
    // font may interfere with the previous line. To address this we require
    // an estimated maxFrameHeight which should be shared for all text items
    // that require centering on a line.  This call should be made after a
    // font change occurs.
    //
    //   CursorY <---                          
    //    ^                                   ^
    //    | FramePadding.y                    |
    //    v                                   |
    //    TextBaseOffset  <----               |  Current line height
    //    A line of text <____ baseline       |  (FontLineHeight is Font.size*linespacing)
    //    ^                                   |   
    //    | FramePadding.y                    |
    //    v                                   v
    //
    AlignTextToFrameCenter(maxFontHeight)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        let ypad = g.Style.FramePadding.y;
        let next = g.FontLineHeight + ypad * 2;
        win.DC.CurrentLineHeight = next;
        win.DC.CurrentLineHeightMax = Math.max(win.DC.CurrentLineHeightMax, next);

        let mid = maxFontHeight / 2; // NB: thiis the font center, not the 
        let fmid = this.GetFontMidline();
        let off = ypad + (mid - fmid); // if fmid is 12 and mid is 24, off is +12
        win.DC.CurrentLineTextBaseOffset = Math.max(ypad, off);
    },

    // Horizontal/vertical separating line
    // Axis default to current layout type, so generally Horizontal unless
    // e.g. in a menu bar
    Separator()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;
        let g = this.guictx;

        // Those flags should eventually be overridable by the user
        let flags = (win.DC.LayoutType == LayoutType.Horizontal) ?
                    SeparatorFlags.Vertical : SeparatorFlags.Horizontal;
        // console.assert(ImIsPowerOfTwo(flags & (SeparatorFlags_Horizontal | SeparatorFlags_Vertical)));   // Check that only 1 option is selected
        if (flags & SeparatorFlags.Vertical)
        {
            this.VerticalSeparator();
            return;
        }

        // Horizontal Separator
        if (win.DC.CurrentColumns)
            this.PopClipRect();

        let x1 = win.Pos.x;
        let x2 = win.Pos.x + win.Size.x;
        if (win.DC.GroupStack.empty())
            x1 += win.DC.Indent.x;

        const bb = Rect.FromXY(x1, win.DC.CursorPos.y,
                               x2, win.DC.CursorPos.y+1);
        // NB: we don't provide our width so that it doesn't get feed back into
        // AutoFit, we don't provide height to not alter layout.
        this.itemSize(Vec2.Zero());
        if (!this.itemAdd(bb, 0))
        {
            if (win.DC.CurrentColumns)
                this.pushColumnClipRect();
            return;
        }

        win.DrawList.AddLine(bb.Min, new Vec2(bb.Max.x, bb.Min.y),
                                g.Style.GetColor("Separator"));

        if (g.LogEnabled)
            this.LogRenderedText(bb.Min, "--------------------------------");

        if (win.DC.CurrentColumns)
        {
            this.pushColumnClipRect();
            win.DC.CurrentColumns.LineMinY = win.DC.CursorPos.y;
        }
    },

    VerticalSeparator()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;
        let g = this.guictx;
        let y1 = win.DC.CursorPos.y;
        let y2 = win.DC.CursorPos.y + win.DC.CurrentLineHeightMax;
        const bb = Rect.FromXY(win.DC.CursorPos.x, y1,
                            win.DC.CursorPos.x + 1, y2);
        this.itemSize(new Vec2(bb.GetWidth(), 0.));
        if (!this.itemAdd(bb, 0))
            return;

        win.DrawList.AddLine(new Vec2(bb.Min.x, bb.Min.y),
                                new Vec2(bb.Min.x, bb.Max.y),
                                g.Style.GetColor("Separator"));
        if (g.LogEnabled)
            this.LogText(" |");
    },

    SplitterBehavior(bb, id, axis, size1/*ValRef*/, size2/*ValRef*/,
                min_size1, min_size2, hover_extend, hover_visibility_delay)
    {
        let win = this.getCurrentWindow();
        let g = this.guictx;
        let item_flags_backup = win.DC.ItemFlags;
        win.DC.ItemFlags |= ItemFlags.NoNav | ItemFlags.NoNavDefaultFocus;
        let item_add = this.itemAdd(bb, id);
        win.DC.ItemFlags = item_flags_backup;
        if (!item_add)
            return false;

        let hovered = new ValRef(), held = new ValRef();
        let bb_interact = bb.Clone();
        bb_interact.Expand(axis == Axis.Y ? new Vec2(0., hover_extend) :
                                            new Vec2(hover_extend, 0));
        this.ButtonBehavior(bb_interact, id, hovered, held,
                    ButtonFlags.FlattenChildren | ButtonFlags.AllowItemOverlap);
        if (g.ActiveId != id)
            this.SetItemAllowOverlap();

        if (held.get() ||
            (g.HoveredId == id && g.HoveredIdPreviousFrame == id &&
            g.HoveredIdTimer >= hover_visibility_delay))
        {
            this.SetMouseCursor(axis == Axis.Y ? MouseCursor.ResizeNS : MouseCursor.ResizeEW);
        }

        let bb_render = bb.Clone();
        if (held.get())
        {
            let mouse_delta_2d = Vec2.Subtract(
                                    Vec2.Subtract(g.IO.MousePos, g.ActiveIdClickOffset),
                                    bb_interact.Min);
            let mouse_delta = (axis == Axis.Y) ? mouse_delta_2d.y : mouse_delta_2d.x;

            // Minimum pane size
            let size_1_maximum_delta = Math.max(0., size1.get() - min_size1);
            let size_2_maximum_delta = Math.max(0., size2.get() - min_size2);
            if (mouse_delta < -size_1_maximum_delta)
                mouse_delta = -size_1_maximum_delta;
            if (mouse_delta > size_2_maximum_delta)
                mouse_delta = size_2_maximum_delta;

            // Apply resize
            if (mouse_delta != 0)
            {
                if (mouse_delta < 0)
                    console.assert(size1.get() + mouse_delta >= min_size1);
                if (mouse_delta > 0)
                    console.assert(size2.get() - mouse_delta >= min_size2);
                size1.set(size1.get() + mouse_delta);
                size2.set(size2.get() - mouse_delta);
                bb_render.Translate((axis == Axis.X) ?
                                new Vec2(mouse_delta, 0) :
                                new Vec2(0., mouse_delta));
                this.MarkItemEdited(id);
            }
        }

        // Render
        let col = g.Style.GetColor(held.get() ? "SeparatorActive" :
                            (hovered.get() && g.HoveredIdTimer >= hover_visibility_delay) ?
                            "SeparatorHovered" : "Separator");
        win.DrawList.AddRectFilled(bb_render.Min, bb_render.Max, col, g.Style.FrameRounding);
        return held.get();
    },

    // lock horizontal starting position
    BeginGroup()
    {
        let g = this.guictx;
        let win = this.getCurrentWindow();
        win.DC.GroupStack.push(new GroupData(win, g)); // intialized off win & g
        win.DC.GroupOffset.x = win.DC.CursorPos.x - win.Pos.x
                                    - win.DC.ColumnsOffset.x;
        win.DC.Indent = win.DC.GroupOffset;
        win.DC.CursorMaxPos.Copy(win.DC.CursorPos);
        win.DC.CurrentLineHeight = 0;
        win.DC.CurrentLineHeightMax = 0;
        if (g.LogEnabled)
            g.LogLinePosY = -Number.MAX_VALUE; // To enforce Log carriage return
    },

    // unlock horizontal starting position + capture the whole group bounding
    // box into one "item" (so you can use IsItemHovered() or layout primitives
    // such as SameLine() on whole group, etc.)
    EndGroup()
    {
        let g = this.guictx;
        let win = this.getCurrentWindow();
        console.assert(!win.DC.GroupStack.empty(),
                    "Mismatched BeginGroup()/EndGroup() calls");

        let group_data = win.DC.GroupStack.back();
        let group_bb = new Rect(group_data.BackupCursorPos, win.DC.CursorMaxPos);
        group_bb.Max = Vec2.Max(group_bb.Min, group_bb.Max);
        win.DC.CursorPos.Copy(group_data.BackupCursorPos);
        win.DC.CursorMaxPos = Vec2.Max(group_data.BackupCursorMaxPos,
                                          win.DC.CursorMaxPos);
        win.DC.Indent = group_data.BackupIndent;
        win.DC.GroupOffset = group_data.BackupGroupOffset;
        win.DC.CurrentLineHeight = group_data.BackupCurrentLineHeight;
        win.DC.CurrentLineHeightMax = group_data.BackupCurrentLineHeightMax;
        win.DC.CurrentLineTextBaseOffset = group_data.BackupCurrentLineTextBaseOffset;
        if (g.LogEnabled)
            g.LogLinePosY = -Number.MAX_VALUE; // To enforce Log carriage return

        if (group_data.AdvanceCursor)
        {
            // FIXME: Incorrect, we should grab the base offset from the
            // *first line* of the group but it is hard to obtain now.
            win.DC.CurrentLineTextBaseOffset = Math.max(win.DC.PrevLineTextBaseOffset,
                                group_data.BackupCurrentLineTextBaseOffset);
            this.itemSize(group_bb.GetSize(), 0);
            this.itemAdd(group_bb, 0);
        }

        // If the current ActiveId was declared within the boundary of our group,
        // we copy it to LastItemId so IsItemActive(), IsItemDeactivated() etc.
        // will be functional on the entire group. It would be be neater if we
        // replaced window.DC.LastItemId by e.g. 'bool LastItemIsActive', but
        // would put a little more burden on individual widgets. (and if you
        // grep for LastItemId you'll notice it is only used in that context.
        if ((group_data.BackupActiveIdIsAlive != g.ActiveId) &&
            (g.ActiveIdIsAlive == g.ActiveId) && g.ActiveId) // && g.ActiveIdWindow->RootWindow == win.RootWindow)
        {
            win.DC.LastItemId = g.ActiveId;
        }
        else
        if (!group_data.BackupActiveIdPreviousFrameIsAlive &&
              g.ActiveIdPreviousFrameIsAlive) // && g.ActiveIdPreviousFrameWindow->RootWindow == win->RootWindow)
        {
            win.DC.LastItemId = g.ActiveIdPreviousFrame;
        }
        win.DC.LastItemRect = group_bb;

        win.DC.GroupStack.pop_back();

        //win->DrawList->AddRect(group_bb.Min, group_bb.Max, IM_COL32(255,0,255,255));   // [Debug]
    },

    // cursor position in window coordinates (relative to window position)
    // User generally sees positions in window coordinates. Internally we
    // store CursorPos in absolute screen coordinates because it is more
    // convenient. Conversion happens as we pass the value to user, but it
    // makes our naming convention confusing because GetCursorPos() ==
    // (DC.CursorPos - window.Pos). May want to rename 'DC.CursorPos'.
    GetCursorPos()
    {
        let win = this.getCurrentWindowRead();
        return new Vec2(win.DC.CursorPos.x - win.Pos.x + win.Scroll.x,
                        win.DC.CursorPos.y - win.Pos.y + win.Scroll.y);
    },

    SetCursorPos(local_pos)
    {
        let win = this.getCurrentWindow();
        win.DC.CursorPos.x = win.Pos.x - win.Scroll.x + local_pos.x;
        win.DC.CursorPos.y = win.Pos.y - win.Scroll.y + local_pos.y;
        /*
        win.DC.CursorPos = Vec2.Subtract(win.Pos,
                                Vec2.Add(win.Scroll, local_pos));
        */
        win.DC.CursorMaxPos = Vec2.Max(win.DC.CursorMaxPos,
                                       win.DC.CursorPos);
    },

    //   (some functions are using window-relative coordinates, such as:
    //    GetCursorPos, GetCursorStartPos, GetContentRegionMax,
    //    GetWindowContentRegion* etc. other functions such as
    //    GetCursorScreenPos or everything in ImDrawList::
    //    are using the main, absolute coordinate system.
    //    GetWindowPos() + GetCursorPos() == GetCursorScreenPos() etc.)
    GetCursorPosX()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CursorPos.x - win.Pos.x + win.Scroll.x;
    },

    GetCursorPosXLastLine()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CursorPosPrevLine.x - win.Pos.x + win.Scroll.x;
    },

    GetCursorPosY()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CursorPos.y - win.Pos.y + win.Scroll.y;
    },

    SetCursorPosX(local_x)
    {
        let win = this.getCurrentWindow();
        win.DC.CursorPos.x = win.Pos.x - win.Scroll.x + local_x;
        win.DC.CursorMaxPos.x = Math.max(win.DC.CursorMaxPos.x,
                                        win.DC.CursorPos.x);
    },

    SetCursorPosY(local_y)
    {
        let win = this.getCurrentWindow();
        win.DC.CursorPos.y = win.Pos.y - win.Scroll.y + local_y;
        win.DC.CursorMaxPos.y = Math.max(win.DC.CursorMaxPos.y,
                                         win.DC.CursorPos.y);
        if(win.DC.CursorPos.IsNaN())
        {
            console.assert(0, "hey!");
        }
    },

    SetCursorPosYAndSetupDummyPrevLine(pos_y, line_height)
    {
        // Set cursor position and a few other things so that SetScrollHereY()
        // and Columns() can work when seeking cursor.
        // FIXME: It is problematic that we have to do that here, because
        // custom/equivalent end-user code would stumble on the same issue.
        // The clipper should probably have a 4th step to display the last
        // item in a regular manner.
        this.SetCursorPosY(pos_y);
        let win = this.getCurrentWindow();
        // Setting those fields so that SetScrollHereY() can properly function
        // after the end of our clipper usage.
        win.DC.CursorPosPrevLine.y = win.DC.CursorPos.y - line_height;
        // If we end up needing more accurate data (to e.g. use SameLine) we
        // may as well make the clipper have a fourth step to let user process
        // and display the last item in their list.
        win.DC.PrevLineHeight = (line_height - this.guictx.Style.ItemSpacing.y);
        win.DC.PrevLineHeightMax = win.DC.PrevLineHeight;
        if (win.DC.CurrentColumns)
        {
            // Setting this so that cell Y position are set properly
            win.DC.CurrentColumns.LineMinY = win.DC.CursorPos.y;
        }
    },

    // initial cursor position in window/local coordinates
    GetCursorStartPos()
    {
        let win = this.getCurrentWindowRead();
        return Vec2.Subtract(win.DC.CursorStartPos, win.Pos);
    },

    // cursor position in absolute screen coordinates [0..io.DisplaySize]
    // (useful to work with ImDrawList API)
    GetCursorScreenPos()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CursorPos.Clone();
    },

    GetCursorScreenStartPos()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CursorStartPos;
    },

    // cursor position in absolute screen coordinates [0..io.DisplaySize]
    SetCursorScreenPos(pos)
    {
        let win = this.getCurrentWindow();
        win.DC.CursorPos.Copy(pos);
        win.DC.CursorMaxPos = Vec2.Max(win.DC.CursorMaxPos,
                                       win.DC.CursorPos);
    },

    /*---------------------------------------------------------------*/

    // Advance cursor given item size for layout.
    itemSize(size, text_offset_y=0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.SkipItems)
            return;

        if(size.Max != undefined)
        {
            // we infer that size is a Rect
            size = size.GetSize();
        }

        // Always align ourselves on pixel boundaries
        const line_height = Math.max(win.DC.CurrentLineHeight, size.y);
        const text_base_offset = Math.max(win.DC.CurrentLineTextBaseOffset, text_offset_y);
        if (g.IO.KeyAlt) 
        {
            win.DrawList.AddRect(win.DC.CursorPos, 
                                 Vec2.AddXY(win.DC.CursorPos, size.x, line_height), 
                                 g.Style.GetColor("_DEBUG2"));
        }
        win.DC.CursorPosPrevLine = new Vec2(win.DC.CursorPos.x + size.x,
                                               win.DC.CursorPos.y);
        win.DC.CursorPos.x = Math.floor(win.Pos.x + win.DC.Indent.x +
                                            win.DC.ColumnsOffset.x);
        win.DC.CursorPos.y = Math.floor(win.DC.CursorPos.y + line_height +
                                            g.Style.ItemSpacing.y);
        win.DC.CursorMaxPos.x = Math.max(win.DC.CursorMaxPos.x,
                                            win.DC.CursorPosPrevLine.x);
        win.DC.CursorMaxPos.y = Math.max(win.DC.CursorMaxPos.y,
                                    win.DC.CursorPos.y-g.Style.ItemSpacing.y);
        /* NaN checks */
        if(win.DC.CursorMaxPos.IsNaN() || win.DC.CursorPos.IsNaN())
        {
            console.assert(0, "hey!");
        }
        //if (g.IO.KeyAlt) win.DrawList->AddCircle(window.DC.CursorMaxPos, 3.0f, IM_COL32(255,0,0,255), 4); // [DEBUG]

        win.DC.PrevLineHeight = line_height;
        win.DC.PrevLineHeightMax = Math.max(line_height, win.DC.CurrentLineHeightMax);
        win.DC.PrevLineTextBaseOffset = text_base_offset;
        win.DC.CurrentLineHeight = win.DC.CurrentLineTextBaseOffset = 0;
        win.DC.CurrentLineHeightMax = 0;

        // Horizontal layout mode
        if (win.DC.LayoutType == LayoutType.Horizontal)
            this.SameLine();
    },

    // Declare item bounding box for clipping and interaction.
    // Note that the size can be different than the one provided to ItemSize().
    // Typically, widgets that spread over available surface declare their
    // minimum size requirement to ItemSize() and then use a larger region for
    // drawing/interaction, which is passed to ItemAdd().
    itemAdd(bb, id, nav_bb=null)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (id != 0)
        {
            // Navigation processing runs prior to clipping early-out
            //  (a) So that NavInitRequest can be honored, for newly opened
            //      windows to select a default widget
            //  (b) So that we can scroll up/down past clipped items. This adds
            //      a small O(N) cost to regular navigation requests unfortunately,
            //      but it is still limited to one window. it may not scale very
            //      well for windows with ten of thousands of item, but at least
            //      NavMoveRequest is only set on user interaction, aka maximum
            //      once a frame. We could early out with
            //          "if (is_clipped && !g.NavInitRequest) return false;"
            //      but then we wouldn't be able to reach unclipped widgets.
            //     This would work if user had explicit scrolling control (e.g.
            //     mapped on a stick).
            win.DC.NavLayerActiveMaskNext |= win.DC.NavLayerCurrentMask;
            if (g.NavId == id || g.NavAnyRequest)
            {
                if (g.NavWindow.RootWindowForNav == win.RootWindowForNav)
                {
                    if (win == g.NavWindow ||
                        ((win.Flags | g.NavWindow.Flags) & WindowFlags.NavFlattened))
                    {
                        this.navProcessItem(win, nav_bb ? nav_bb: bb, id);
                    }
                }
            }
        }

        win.DC.LastItemId = id;
        win.DC.LastItemRect.Copy(bb);
        win.DC.LastItemStatusFlags = ItemStatusFlags.None;

        // Clipping test
        const is_clipped = this.isClippedEx(bb, id, false);
        if (is_clipped)
            return false;
        if (g.IO.KeyAlt) 
        {
            win.DrawList.AddRect(bb.Min, bb.Max, g.Style.GetColor("_DEBUG1"));
        }

        // We need to calculate this now to take account of the current clipping
        // rectangle (as items like Selectable may change them)
        if (this.IsMouseHoveringRect(bb.Min, bb.Max))
            win.DC.LastItemStatusFlags |= ItemStatusFlags.HoveredRect;
        return true;
    },

    isClippedEx(bb, id=0, clip_even_when_logged=false)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (!bb.Overlaps(win.ClipRect))
        {
            if (id == 0 || id != g.ActiveId)
            {
                if (clip_even_when_logged || !g.LogEnabled)
                    return true;
            }
        }
        return false;
    },

}; // end mixin
