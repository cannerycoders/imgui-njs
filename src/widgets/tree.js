import {Rect, ValRef, Vec2} from "../types.js";
import {ItemHoveredDataBackup} from "../misc.js";
import {CondFlags, ItemStatusFlags, NavHighlightFlags} from "../flags.js";
import {Dir} from "../enums.js";
import {ButtonFlags} from "./button.js";

//-------------------------------------------------------------------------
// [SECTION] Widgets: TreeNode, CollapsingHeader, etc.
//-------------------------------------------------------------------------
// - TreeNode()
// - TreeNodeV()
// - TreeNodeEx()
// - TreeNodeExV()
// - treeNodeBehavior() [Internal]
// - TreePush()
// - TreePop()
// - TreeAdvanceToLabelPos()
// - GetTreeNodeToLabelSpacing()
// - SetNextTreeNodeOpen()
// - CollapsingHeader()
//-------------------------------------------------------------------------

export var TreeNodeFlags =
{
    None: 0,
    Selected: 1 << 0,   // Draw as selected
    Framed: 1 << 1,   // Full colored frame (e.g. for CollapsingHeader)
    AllowItemOverlap: 1 << 2,   // Hit testing to allow subsequent widgets to overlap this one
    NoTreePushOnOpen: 1 << 3,   // Don't do a TreePush() when open (e.g. for CollapsingHeader) = no extra indent nor pushing on ID stack
    NoAutoOpenOnLog: 1 << 4,   // Don't automatically and temporarily open node when Logging is active (by default logging will automatically open tree nodes)
    DefaultOpen: 1 << 5,   // Default node to be open
    OpenOnDoubleClick: 1 << 6,   // Need double-click to open node
    OpenOnArrow: 1 << 7,   // Only open when clicking on the arrow part. If ImGuiTreeNodeFlags_OpenOnDoubleClick is also set, single-click arrow or double-click all box to open.
    Leaf: 1 << 8,   // No collapsing, no arrow (use as a convenience for leaf nodes).
    Bullet: 1 << 9,   // Display a bullet instead of arrow
    FramePadding: 1 << 10,  // Use FramePadding (even for an unframed text node) to vertically align text baseline to regular widget height. Equivalent to calling AlignTextToFramePadding().
    //SpanAllAvailWidth: 1 << 11,  // FIXME: TODO: Extend hit box horizontally even if not framed
    //NoScrollOnOpen: 1 << 12,  // FIXME: TODO: Disable automatic scroll on TreePop() if node got just open and contents is not visible
    NavLeftJumpsBackHere: 1 << 13,  // (WIP) Nav: left direction may move to this TreeNode() from any of its child (items submitted between TreeNode and TreePop)
};

TreeNodeFlags.CollapsingHeader = TreeNodeFlags.Framed |
                                TreeNodeFlags.NoTreePushOnOpen |
                                TreeNodeFlags.NoAutoOpenOnLog;

export var ImguiTreeMixin =
{
    // - TreeNode functions return true when the node is open, in which case
    //  you need to also call TreePop() when you are finished displaying the
    //  tree node contents. In the c binding, there are several variants.
    //  Those accepting varargs produce a label so we just assume that
    //  callers will always produce a unique label and we'll generate
    //  an ID from there.
    //      TreeNode(void*, fmt, ...) // id derived from pointer
    //      TreeNode(char*, fmt, ...) // id derived from string
    //      TreeNode(label, flags // id derived from string
    TreeNode(label, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems) return false;
        let g = this.guictx;
        return this.treeNodeBehavior(win.GetID(label), flags,
                                    label.split("##")[0]);
    },

    TreeNodeEx(label, flags=0)
    {
        return this.TreeNode(label, flags);
    },

    // ~ Indent()+PushId(). Already called by TreeNode() when returning true,
    // but you can call TreePush/TreePop yourself if desired.
    TreePush(str_id=null)
    {
        let win = this.getCurrentWindow();
        this.Indent();
        win.DC.TreeDepth++;
        this.PushID(str_id ? str_id : "#TreePush");
    },

    // ~ Unindent()+PopId()
    TreePop()
    {
        let g = this.guictx;
        let win = this.getCurrentWindow();
        this.Unindent();
        win.DC.TreeDepth--;
        if (g.NavMoveDir == Dir.Left && g.NavWindow == win &&
            this.navMoveRequestButNoResultYet())
        {
            if (g.NavIdIsAlive &&
                (win.DC.TreeDepthMayJumpToParentOnPop & (1 << win.DC.TreeDepth)))
            {
                this.setNavID(win.IDStack.back(), g.NavLayer);
                this.navMoveRequestCancel();
            }
        }
        win.DC.TreeDepthMayJumpToParentOnPop &= (1 << win.DC.TreeDepth) - 1;

        // There should always be 1 element in the IDStack (pushed during
        // window creation). If this triggers you called TreePop/PopID too much.
        console.assert(win.IDStack.length > 1);
        this.PopID();
    },

    // advance cursor x position by GetTreeNodeToLabelSpacing()
    TreeAdvanceToLabelPos()
    {
        let g = this.guictx;
        g.CurrentWindow.DC.CursorPos.x += this.GetTreeNodeToLabelSpacing();
    },

    // horizontal distance preceding label when using TreeNode*() or Bullet() ==
    // (g.FontSize + style.FramePadding.x*2) for a regular unframed TreeNode
    GetTreeNodeToLabelSpacing()
    {
        let g = this.guictx;
        return g.FontSize + (g.Style.FramePadding.x * 2.);
    },

    // set next TreeNode/CollapsingHeader open state.
    SetNextTreeNodeOpen(is_open, cond)
    {
        let g = this.guictx;
        if (g.CurrentWindow.SkipItems)
            return;
        g.NextTreeNodeOpenVal = is_open;
        g.NextTreeNodeOpenCond = cond ? cond : CondFlags.Always;
    },

    // if returning 'true' the header is open. doesn't indent nor push on
    // ID stack. user doesn't have to call TreePop().
    // when 'open' isn't NULL, display an additional small close button on
    // upper right of the header
    CollapsingHeader(label, flags=0)
    {
        let win = this.getCurrentWindow();
        if(win.SkipItems) return false;
        return this.treeNodeBehavior(win.GetID(label),
                                flags|TreeNodeFlags.CollapsingHeader, label);
    },

    CollapsingHeaderO(label, p_open=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems) return false;

        if (p_open && !p_open.get())
            return false;

        let id = win.GetID(label);
        let is_open = this.treeNodeBehavior(id,
                            flags|TreeNodeFlags.CollapsingHeader|
                            (p_open ? TreeNodeFlags.AllowItemOverlap:0), label);
        if (p_open)
        {
            // Create a small overlapping close button
            // FIXME: We can  evolve this into user accessible helpers to add
            // extra buttons on title bars, headers, etc.
            let g = this.guictx;
            let last_item_backup = new ItemHoveredDataBackup(g);
            let button_radius = g.FontSize * 0.5;
            let button_center = new Vec2(
                    Math.min(win.DC.LastItemRect.Max.x, win.ClipRect.Max.x) - g.Style.FramePadding.x - button_radius,
                    win.DC.LastItemRect.GetCenter().y);
            if (this.CloseButton(win.GetID(id+"_1"), button_center, button_radius))
                p_open.set(false);
            else
                p_open.set(true);
            last_item_backup.Restore();
        }
        return is_open;
    },

    treeNodeBehavior(id, flags, label)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        const style = g.Style;
        const display_frame = (flags & TreeNodeFlags.Framed) != 0;
        const padding = (display_frame || (flags & TreeNodeFlags.FramePadding)) ?
                    style.FramePadding : new Vec2(style.FramePadding.x, 0.);
        const label_size = this.CalcTextSize(label, false);

        // We vertically grow up to current line height up the typical widget height.
        const text_base_offset_y = Math.max(padding.y, win.DC.CurrentLineTextBaseOffset); // Latch before ItemSize changes it
        const frame_height = Math.max(Math.min(win.DC.CurrentLineHeight,
                                            g.FontSize+style.FramePadding.y*2),
                                      label_size.y + padding.y*2);
        let frame_bb = Rect.FromXY(win.DC.CursorPos,
                                    win.Pos.x + this.GetContentRegionMax().x,
                                    win.DC.CursorPos.y + frame_height);
        if (display_frame)
        {
            // Framed header expand a little outside the default padding
            frame_bb.Min.x -= Math.floor(win.WindowPadding.x*0.5) - 1;
            frame_bb.Max.x += Math.floor(win.WindowPadding.x*0.5) - 1;
        }

        // Collapser arrow width + Spacing
        const text_offset_x = (g.FontSize + (display_frame ? padding.x*3 : padding.x*2));
        // Include collapser
        const text_width = g.FontSize + (label_size.x > 0 ? label_size.x + padding.x*2 : 0);
        this.itemSize(new Vec2(text_width, frame_height), text_base_offset_y);

        // For regular tree nodes, we arbitrary allow to click past 2 worth of ItemSpacing
        // (Ideally we'd want to add a flag for the user to specify if we want the hit test to be done up to the right side of the content or not)
        const interact_bb = display_frame ? frame_bb : Rect.FromXY(frame_bb.Min,
                                frame_bb.Min.x + text_width + style.ItemSpacing.x*2,
                                frame_bb.Max.y);
        let is_open = this.treeNodeBehaviorIsOpen(id, flags);
        let is_leaf = (flags & TreeNodeFlags.Leaf) != 0;

        // Store a flag for the current depth to tell if we will allow closing
        // this node when navigating one of its child. For this purpose we
        // essentially compare if g.NavIdIsAlive went from 0 to 1 between
        // TreeNode() and TreePop(). This currently only supports 32 level
        // deep and we are fine with (1 << Depth) overflowing into a zero.
        if (is_open && !g.NavIdIsAlive &&
            (flags & TreeNodeFlags.NavLeftJumpsBackHere) &&
            !(flags & TreeNodeFlags.NoTreePushOnOpen))
        {
            win.DC.TreeDepthMayJumpToParentOnPop |= (1 << win.DC.TreeDepth);
        }

        let item_add = this.itemAdd(interact_bb, id);
        win.DC.LastItemStatusFlags |= ItemStatusFlags.HasDisplayRect;
        win.DC.LastItemDisplayRect = frame_bb;
        if (!item_add)
        {
            if (is_open && !(flags & TreeNodeFlags.NoTreePushOnOpen))
                this.treePushRawID(id);
            return is_open;
        }

        // Flags that affects opening behavior:
        // - 0 (default) .................... single-click anywhere to open
        // - OpenOnDoubleClick .............. double-click anywhere to open
        // - OpenOnArrow .................... single-click on arrow to open
        // - OpenOnDoubleClick|OpenOnArrow .. single-click on arrow or double-click anywhere to open
        let button_flags = ButtonFlags.NoKeyModifiers;
        if (flags & TreeNodeFlags.AllowItemOverlap)
            button_flags |= ButtonFlags.AllowItemOverlap;
        if (flags & TreeNodeFlags.OpenOnDoubleClick)
        {
            button_flags |= ButtonFlags.PressedOnDoubleClick |
                ((flags & TreeNodeFlags.OpenOnArrow) ? ButtonFlags.PressedOnClickRelease : 0);
        }
        if (!is_leaf)
            button_flags |= ButtonFlags.PressedOnDragDropHold;

        let selected = (flags & TreeNodeFlags.Selected) != 0;
        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(interact_bb, id, hovered, held, button_flags);
        let toggled = false;
        if (!is_leaf)
        {
            if (pressed)
            {
                toggled = !(flags & (TreeNodeFlags.OpenOnArrow | TreeNodeFlags.OpenOnDoubleClick))
                            || (g.NavActivateId == id);
                if (flags & TreeNodeFlags.OpenOnArrow)
                {
                    toggled |= this.IsMouseHoveringRect(interact_bb.Min,
                                    new Vec2(interact_bb.Min.x + text_offset_x, interact_bb.Max.y))
                                && (!g.NavDisableMouseHover);
                }
                if (flags & TreeNodeFlags.OpenOnDoubleClick)
                    toggled |= g.IO.MouseDoubleClicked[0];
                // When using Drag and Drop "hold to open" we keep the node
                // highlighted after opening, but never close it again.
                if (g.DragDropActive && is_open)
                    toggled = false;
            }

            if (g.NavId == id && g.NavMoveRequest &&
                g.NavMoveDir == Dir.Left && is_open)
            {
                toggled = true;
                this.navMoveRequestCancel();
            }
            // If there's something upcoming on the line we may want to
            // give it the priority?
            if (g.NavId == id && g.NavMoveRequest &&
                g.NavMoveDir == Dir.Right && !is_open)
            {
                toggled = true;
                this.navMoveRequestCancel();
            }

            if (toggled)
            {
                is_open = !is_open;
                win.DC.StateStorage.SetInt(id, is_open);
            }
        }
        if (flags & TreeNodeFlags.AllowItemOverlap)
            this.SetItemAllowOverlap();

        // Render
        const col = style.GetColor((held.get() && hovered.get()) ?
            "HeaderActive" : hovered.get() ? "HeaderHovered" : "Header");
        const text_pos = Vec2.AddXY(frame_bb.Min, text_offset_x, text_base_offset_y);
        let nav_highlight_flags = NavHighlightFlags.TypeThin;
        if (display_frame)
        {
            // Framed type
            this.renderFrame(frame_bb.Min, frame_bb.Max, col, true, style.FrameRounding);
            this.renderNavHighlight(frame_bb, id, nav_highlight_flags);
            this.renderArrow(Vec2.AddXY(frame_bb.Min, padding.x, text_base_offset_y),
                            is_open ? Dir.Down : Dir.Right, 1.);
            if (g.LogEnabled)
            {
                // NB: '##' is normally used to hide text (as a library-wide feature),
                // so we need to specify the text range to make sure the ## aren't
                // stripped out here.
                const log_prefix = "\n##";
                const log_suffix = "##";
                this.LogRenderedText(text_pos, log_prefix);
                this.renderTextClipped(text_pos, frame_bb.Max, label);
                this.LogRenderedText(text_pos, log_suffix);
            }
            else
            {
                this.renderTextClipped(text_pos, frame_bb.Max, label, label_size);
            }
        }
        else
        {
            // Unframed typed for tree nodes
            if (hovered.get() || selected)
            {
                this.renderFrame(frame_bb.Min, frame_bb.Max, col, false);
                this.renderNavHighlight(frame_bb, id, nav_highlight_flags);
            }

            if (flags & TreeNodeFlags.Bullet)
            {
                this.renderBullet(Vec2.AddXY(frame_bb.Min,
                        text_offset_x * 0.5, g.FontSize*0.5 + text_base_offset_y));
            }
            else
            if (!is_leaf)
            {
                this.renderArrow(Vec2.AddXY(frame_bb.Min, padding.x,
                                        g.FontSize*0.15 + text_base_offset_y),
                                is_open ? Dir.Down : Dir.Right, 0.70);
            }
            this.renderText(text_pos, label, false);
        }

        if (is_open && !(flags & TreeNodeFlags.NoTreePushOnOpen))
            this.treePushRawID(id);
        return is_open;
    }, // end treeNodeBehavior

    treeNodeBehaviorIsOpen(id, flags)
    {
        if (flags & TreeNodeFlags.Leaf)
            return true;

        // We only write to the tree storage if the user clicks (or explicitly
        // use SetNextTreeNode*** functions)
        let g = this.guictx;
        let win = g.CurrentWindow;
        let storage = win.DC.StateStorage;
        let is_open;
        if (g.NextTreeNodeOpenCond != 0)
        {
            if (g.NextTreeNodeOpenCond & CondFlags.Always)
            {
                is_open = g.NextTreeNodeOpenVal;
                storage.SetInt(id, is_open);
            }
            else
            {
                // We treat Cond.Once and Cond.FirstUseEver the same because
                // tree node state are not saved persistently.
                const stored_value = storage.GetInt(id, -1);
                if (stored_value == -1)
                {
                    is_open = g.NextTreeNodeOpenVal;
                    storage.SetInt(id, is_open);
                }
                else
                {
                    is_open = stored_value != 0;
                }
            }
            g.NextTreeNodeOpenCond = 0;
        }
        else
        {
            let def = (flags&TreeNodeFlags.DefaultOpen) ? 1 : 0;
            is_open = 0 != storage.GetInt(id, def);
        }

        // When logging is enabled, we automatically expand tree nodes
        // (but *NOT* collapsing headers.. seems like sensible behavior).
        // NB- If we are above max depth we still allow manually opened
        // nodes to be logged.
        if (g.LogEnabled && !(flags & TreeNodeFlags.NoAutoOpenOnLog) &&
            (win.DC.TreeDepth - g.LogDepthRef) < g.LogDepthToExpand)
            is_open = true;

        return is_open;
    },

    treePushRawID(id)
    {
        let w = this.getCurrentWindow();
        this.Indent();
        w.DC.TreeDepth++;
        w.IDStack.push(id);
    }
};