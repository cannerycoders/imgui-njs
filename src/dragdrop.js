import {Vec2} from "./types.js";
import {CondFlags, ItemStatusFlags} from "./flags.js";
import {GetHash} from "./hashutil.js";

export var DragDropFlags =
{
    None: 0,
    // BeginDragDropSource() flags
    SourceNoPreviewTooltip: 1 << 0,   
        // By default, a successful call to BeginDragDropSource opens a tooltip 
        // so you can display a preview or description of the source contents. 
        // This flag disable this behavior.
    SourceNoDisableHover: 1 << 1,   
        // By default, when dragging we clear data so that IsItemHovered() will 
        // return false, to avoid subsequent user code submitting tooltips. 
        // This flag disable this behavior so you can still call IsItemHovered() 
        // on the source item.
    SourceNoHoldToOpenOthers: 1 << 2,   
        // Disable the behavior that allows to open tree nodes and collapsing 
        //header by holding over them while dragging a source item.
    SourceAllowNullID: 1 << 3,   
        // Allow items such as Text(), Image() that have no unique identifier 
        // to be used as drag source, by manufacturing a temporary identifier 
        // based on their window-relative position. This is extremely unusual 
        // within the dear imgui ecosystem and so we made it explicit.
    SourceExtern: 1 << 4,   
        // External source (from outside of imgui), won't attempt to read 
        // current item/window info. Will always return true. Only one Extern 
        // source can be active simultaneously.
    SourceAutoExpirePayload: 1 << 5,   
        // Automatically expire the payload if the source cease to be submitted 
        // (otherwise payloads are persisting while being dragged)

    // AcceptDragDropPayload() flags
    AcceptBeforeDelivery: 1 << 10,  
        // AcceptDragDropPayload() will returns true even before the mouse 
        // button is released. You can then call IsDelivery() to test if the 
        // payload needs to be delivered.
    AcceptNoDrawDefaultRect: 1 << 11,  
        // Do not draw the default highlight rectangle when hovering over target.
    AcceptNoPreviewTooltip: 1 << 12,  
        // Request hiding the BeginDragDropSource tooltip from the 
        // BeginDragDropTarget site.
};
let f = DragDropFlags;
// For peeking ahead and inspecting the payload before delivery.
f.AcceptPeekOnly = f.AcceptBeforeDelivery | f.AcceptNoDrawDefaultRect;

// Data payload for Drag and Drop operations: 
//      AcceptDragDropPayload(), GetDragDropPayload()
export class Payload
{
    constructor()
    {
        this.Clear();
    }

    IsDataType(typ)
    {
        return this.DataFrameCount != -1 && this.DataType === typ;
    }

    IsPreview() { return this.Preview; }
    IsDelivery() { return this.Delivery; }

    Clear()
    {
        this.SourceId = 0;
        this.SourceParentId = 0;
        this.DataType = "";
        this.Data = null;
        this.DataFrameCount = -1;
        this.Preview = false;
        this.Delivery = false;
    }
}

export var ImguiDragDropMixin =
{
    // [BETA API] API may evolve!
    ClearDragDrop()
    {
        let g = this.guictx;
        g.DragDropActive = false;
        g.DragDropPayload.Clear();
        g.DragDropAcceptFlags = DragDropFlags.None;
        g.DragDropAcceptIdCurr = g.DragDropAcceptIdPrev = 0;
        g.DragDropAcceptIdCurrRectSurface = Number.MAX_VALUE;
        g.DragDropAcceptFrameCount = -1;
    },

    // call when the current item is active. If this returns true, you can
    //  call SetDragDropPayload() + EndDragDropSource()
    BeginDragDropSource(flags = 0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        let source_drag_active = false;
        let source_id = 0;
        let source_parent_id = 0;
        let mouse_button = 0;
        if (!(flags & DragDropFlags.SourceExtern))
        {
            source_id = win.DC.LastItemId;
            // Early out for most common case
            if (source_id != 0 && g.ActiveId != source_id) 
                return false;
            if (g.IO.MouseDown[mouse_button] == false)
                return false;

            if (source_id == 0)
            {
                // If you want to use BeginDragDropSource() on an item with no 
                // unique identifier for interaction, such as Text() or Image(), 
                // you need to:
                //  A) Read the explanation below, 
                //  B) Use the DragDropFlags.SourceAllowNullID flag, 
                //  C) Swallow your programmer pride.
                if (!(flags & DragDropFlags.SourceAllowNullID))
                {
                    console.assert(0);
                    return false;
                }

                // Magic fallback (=somehow reprehensible) to handle items with 
                // no assigned ID, e.g. Text(), Image()
                // We build a throwaway ID based on current ID stack + relative 
                // AABB of items in window.
                // THE IDENTIFIER WON'T SURVIVE ANY REPOSITIONING OF THE WIDGET, 
                // so if your widget moves your dragging operation will be canceled.
                // We don't need to maintain/call ClearActiveID() as releasing 
                // the button will early out this function and trigger !ActiveIdIsAlive.
                let is_hovered = (win.DC.LastItemStatusFlags & ItemStatusFlags.HoveredRect) != 0;
                if (!is_hovered && (g.ActiveId == 0 || g.ActiveIdWindow != win))
                    return false;
                source_id = win.DC.LastItemId = win.GetIDFromRectangle(win.DC.LastItemRect);
                if (is_hovered)
                    this.setHoveredID(source_id);
                if (is_hovered && g.IO.MouseClicked[mouse_button])
                {
                    this.setActiveID(source_id, win);
                    this.FocusWindow(win);
                }
                // Allow the underlying widget to display/return hovered 
                // during the mouse release frame, else we would get a flicker.
                if (g.ActiveId == source_id) 
                    g.ActiveIdAllowOverlap = is_hovered;
            }
            else
            {
                g.ActiveIdAllowOverlap = false;
            }
            if (g.ActiveId != source_id)
                return false;
            source_parent_id = win.IDStack.back();
            source_drag_active = this.IsMouseDragging(mouse_button);
        }
        else
        {
            win = null;
            source_id = GetHash("#SourceExtern");
            source_drag_active = true;
        }

        if (source_drag_active)
        {
            if (!g.DragDropActive)
            {
                console.assert(source_id != 0);
                this.ClearDragDrop();
                let payload = g.DragDropPayload;
                payload.SourceId = source_id;
                payload.SourceParentId = source_parent_id;
                g.DragDropActive = true;
                g.DragDropSourceFlags = flags;
                g.DragDropMouseButton = mouse_button;
            }
            g.DragDropSourceFrameCount = g.FrameCount;
            g.DragDropWithinSourceOrTarget = true;

            if (!(flags & DragDropFlags.SourceNoPreviewTooltip))
            {
                // Target can request the Source to not display its tooltip 
                // (we use a dedicated flag to make this request explicit)
                // We unfortunately can't just modify the source flags and 
                // skip the call to BeginTooltip, as caller may be emitting contents.
                this.BeginTooltip();
                if (g.DragDropAcceptIdPrev && 
                    (g.DragDropAcceptFlags & DragDropFlags.AcceptNoPreviewTooltip))
                {
                    let tooltip_win = g.CurrentWindow;
                    tooltip_win.SkipItems = true;
                    tooltip_win.HiddenFramesCanSkipItems = 1;
                }
            }

            if (!(flags & DragDropFlags.SourceNoDisableHover) && 
                !(flags & DragDropFlags.SourceExtern))
            {
                win.DC.LastItemStatusFlags &= ~ItemStatusFlags.HoveredRect;
            }

            return true;
        }
        return false;
    },

    // only call EndDragDropSource() if BeginDragDropSource() returns true!
    EndDragDropSource()
    {
        let g = this.guictx;
        console.assert(g.DragDropActive);
        console.assert(g.DragDropWithinSourceOrTarget, "Not after a BeginDragDropSource()?");

        if (!(g.DragDropSourceFlags & DragDropFlags.SourceNoPreviewTooltip))
            this.EndTooltip();

        // Discard the drag if have not called SetDragDropPayload()
        if (g.DragDropPayload.DataFrameCount == -1)
            this.ClearDragDrop();
        g.DragDropWithinSourceOrTarget = false;
    },

    // type is a user defined string of maximum 32 characters. Strings
    // starting with '_' are reserved for dear imgui internal types. Data
    // is copied and held by imgui.
    // Use 'cond' to choose to submit payload on drag start or every frame
    SetDragDropPayload(type, data, cond = 0)
    {
        let g = this.guictx;
        let payload = g.DragDropPayload;
        if (cond == 0)
            cond = CondFlags.Always;

        console.assert(type != null);
        console.assert(type.length < 32, "Payload type can be at most 32 characters long");
        console.assert(cond == CondFlags.Always || cond == CondFlags.Once);
        console.assert(payload.SourceId != 0);
            // Not called between BeginDragDropSource() and EndDragDropSource()

        if (cond == CondFlags.Always || payload.DataFrameCount == -1)
        {
            payload.DataType = type;
            payload.Data = data; // XXX: data.Clone, JSON.stringify?
        }
        payload.DataFrameCount = g.FrameCount;

        return (g.DragDropAcceptFrameCount == g.FrameCount) || 
               (g.DragDropAcceptFrameCount == g.FrameCount - 1);
    },

    // call after submitting an item that may receive a payload. If this
    //  returns true, you can call AcceptDragDropPayload() + EndDragDropTarget()
    // We don't use BeginDragDropTargetCustom() and duplicate its code because:
    //  1) we use LastItemRectHoveredRect which handles items that pushes a 
    //     temporarily clip rectangle in their code. Calling 
    //     BeginDragDropTargetCustom(LastItemRect) would not handle them.
    // 2) and it's faster. as this code may be very frequently called, we want 
    //     to early out as fast as we can. Also note how the HoveredWindow test 
    //     is positioned differently in both functions (in both functions 
    //     we optimize for the cheapest early out case)
    BeginDragDropTarget()
    {
        let g = this.guictx;
        if (!g.DragDropActive)
            return false;

        let  win = g.CurrentWindow;
        if (!(win.DC.LastItemStatusFlags & ItemStatusFlags.HoveredRect))
            return false;
        if (g.HoveredWindow == null || 
            win.RootWindow != g.HoveredWindow.RootWindow)
        {
            return false;
        }

        const display_rect = (win.DC.LastItemStatusFlags & ItemStatusFlags.HasDisplayRect) ? 
                                win.DC.LastItemDisplayRect : win.DC.LastItemRect;
        let id = win.DC.LastItemId;
        if (id == 0)
            id = win.GetIDFromRectangle(display_rect);
        if (g.DragDropPayload.SourceId == id)
            return false;

        console.assert(g.DragDropWithinSourceOrTarget == false);
        g.DragDropTargetRect = display_rect.Clone();
        g.DragDropTargetId = id;
        g.DragDropWithinSourceOrTarget = true;
        return true;
    },

    BeginDragDropTargetCustom(bb, id)
    {
        let g = this.guictx;
        if (!g.DragDropActive)
            return false;

        let win = g.CurrentWindow;
        if (g.HoveredWindow == null || win.RootWindow != g.HoveredWindow.RootWindow)
            return false;
        console.assert(id != 0);
        if (!this.IsMouseHoveringRect(bb.Min, bb.Max) || 
            (id == g.DragDropPayload.SourceId))
        {
            return false;
        }
        if (win.SkipItems)
            return false;

        console.assert(g.DragDropWithinSourceOrTarget == false);
        g.DragDropTargetRect = bb;
        g.DragDropTargetId = id;
        g.DragDropWithinSourceOrTarget = true;
        return true;
    },

    isDragDropPayloadBeingAccepted() // unused?
    {
        let g = this.guictx;
        return g.DragDropActive && g.DragDropAcceptIdPrev != 0;
    },

    // accept contents of a given type. If DragDropFlags.AcceptBeforeDelivery
    // is set you can peek into the payload before the mouse button is released.
    // returns payload.
    AcceptDragDropPayload(type, flags = 0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        let payload = g.DragDropPayload;
        console.assert(g.DragDropActive, 
                "Not called between BeginDragDropTargetand EndDragDropTarget?");
        console.assert(payload.DataFrameCount != -1,
                "Forgot to call EndDragDropTarget?");
        if (type != null && !payload.IsDataType(type))
            return null;

        // Accept smallest drag target bounding box, this allows us to nest 
        // drag targets conveniently without ordering constraints.
        // NB: We currently accept null id as target. However, overlapping 
        // targets requires a unique ID to function!
        const was_accepted_previously = (g.DragDropAcceptIdPrev == g.DragDropTargetId);
        let r = g.DragDropTargetRect.Clone();
        let r_surface = r.GetWidth() * r.GetHeight();
        if (r_surface < g.DragDropAcceptIdCurrRectSurface)
        {
            g.DragDropAcceptFlags = flags;
            g.DragDropAcceptIdCurr = g.DragDropTargetId;
            g.DragDropAcceptIdCurrRectSurface = r_surface;
        }

        // Render default drop visuals
        payload.Preview = was_accepted_previously;
        flags |= (g.DragDropSourceFlags & DragDropFlags.AcceptNoDrawDefaultRect); 
            // Source can also inhibit the preview (useful for external sources 
            // that lives for 1 frame)
        if (!(flags & DragDropFlags.AcceptNoDrawDefaultRect) && payload.Preview)
        {
            // FIXME-DRAG: Settle on a proper default visuals for drop target.
            r.Expand(3.5);
            let push_clip_rect = win.ClipRect.Contains(r);
            if (push_clip_rect) win.DrawList.PushClipRect(
                                        Vec2.AddXY(r.Min, -1, -1), 
                                        Vec2.AddXY(r.Max, 1, 1));
            win.DrawList.AddRect(r.Min, r.Max, g.Style.GetColor("DragDropTarget"), 
                                0, ~0, 2);
            if (push_clip_rect) 
                win.DrawList.PopClipRect();
        }

        g.DragDropAcceptFrameCount = g.FrameCount;
        // For extern drag sources affecting os window focus, it's easier 
        // to just test !IsMouseDown() instead of IsMouseReleased()
        payload.Delivery = was_accepted_previously && 
                            !this.IsMouseDown(g.DragDropMouseButton); 
        if (!payload.Delivery && !(flags & DragDropFlags.AcceptBeforeDelivery))
            return null;

        return payload;
    },

    // peek directly into the current payload from anywhere. may return null.
    // use Payload::IsDataType() to test for the payload type.
    GetDragDropPayload()
    {
        let g = this.guictx;
        return g.DragDropActive ? g.DragDropPayload : null;
    },

    // only call EndDragDropTarget() if BeginDragDropTarget() returns true!
    // We don't really use/need this now, but added it for the sake of 
    // consistency and because we might need it later.
    EndDragDropTarget()
    {
        let g = this.guictx;
        console.assert(g.DragDropActive);
        console.assert(g.DragDropWithinSourceOrTarget);
        g.DragDropWithinSourceOrTarget = false;
    },

};