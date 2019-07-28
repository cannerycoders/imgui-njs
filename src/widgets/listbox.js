import {Rect, Vec2, Vec1} from "../types.js";
import {Dir} from "../enums.js";

export class ListClipper
{
    constructor(imgui, items_count=-1, items_height=-1)
    {
        console.assert(imgui);
        this.imgui = imgui;
        this.Begin(items_count, items_height);
    }

    Begin(count, items_height=-1)
    {
        this.StartPosY = this.imgui.GetCursorPosY();
        this.ItemsHeight = items_height;
        this.ItemsCount = count;
        this.StepNo = 0;
        this.DisplayEnd = this.DisplayStart = -1;
        if (this.ItemsHeight > 0)
        {
            // calculate how many to clip/display
            let out = this.imgui.CalcListClipping(this.ItemsCount, this.ItemsHeight);
            this.DisplayStart = out[0];
            this.DisplayEnd = out[1];
            if (this.DisplayStart > 0)
            {
                // advance cursor
                this.imgui.SetCursorPosYAndSetupDummyPrevLine(
                    this.StartPosY + this.DisplayStart * this.ItemsHeight,
                    this.ItemsHeight);
            }
            this.StepNo = 2;
        }
    }

    End()
    {
        if (this.ItemsCount < 0)
            return;
        // In theory here we should assert
        //      GetCursorPosY() == StartPosY + DisplayEnd * ItemsHeight
        // but it feels saner to just seek at End and not assert/crash the user.
        if (this.ItemsCount < Number.MAX_SAFE_INTEGER)
        {
            this.imgui.SetCursorPosYAndSetupDummyPrevLine(
                this.StartPosY + this.ItemsCount * this.ItemsHeight,
                this.ItemsHeight); // advance cursor
        }
        this.ItemsCount = -1;
        this.StepNo = 3;
    }

    Step()
    {
        if (this.ItemsCount == 0 || this.imgui.getCurrentWindowRead().SkipItems)
        {
            this.ItemsCount = -1;
            return false;
        }
        // Step 0: the clipper let you process the first element, regardless of
        // it being visible or not, so we can measure the element height.
        if (this.StepNo == 0)
        {
            this.DisplayStart = 0;
            this.DisplayEnd = 1;
            this.StartPosY = this.imgui.GetCursorPosY();
            this.StepNo = 1;
            return true;
        }
        // Step 1: the clipper infer height from first element, calculate the
        // actual range of elements to display, and position the cursor before
        // the first element.
        if (this.StepNo == 1)
        {
            if (this.ItemsCount == 1)
            {
                this.ItemsCount = -1;
                return false;
            }
            let items_height = this.imgui.GetCursorPosY() - this.StartPosY;
            // If this triggers, it means Item 0 hasn't moved the cursor vertically
            console.assert(items_height > 0);
            this.Begin(this.ItemsCount-1, items_height);
            this.DisplayStart++;
            this.DisplayEnd++;
            this.StepNo = 3;
            return true;
        }
        // Step 2: dummy step only required if an explicit items_height was
        // passed to constructor or Begin() and user still call Step(). Does
        // nothing and switch to Step 3.
        if (this.StepNo == 2)
        {
            console.assert(this.DisplayStart >= 0 && this.DisplayEnd >= 0);
            this.StepNo = 3;
            return true;
        }
        // Step 3: the clipper validate that we have reached the expected Y
        // position (corresponding to element DisplayEnd), advance the cursor
        // to the end of the list and then returns 'false' to end the loop.
        if (this.StepNo == 3)
            this.End();
        return false;
    }
}

export var ImguiListboxMixin =
{
    // Helper to calculate coarse clipping of large list of evenly sized items.
    // Prefer using the ImGuiListClipper higher-level helper if you can.
    // NB: 'items_count' is only used to clamp the result, if you don't know
    // your count you can use INT_MAX
    // NB: we return a list of length 2: DisplayStart, DisplayEnd
    CalcListClipping(items_count, items_height)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (g.LogEnabled)
        {
            // If logging is active, do not perform any clipping
            return [ 0, items_count ];
        }
        if (win.SkipItems)
        {
            return [ 0, 0 ];
        }

        // We create the union of the ClipRect and the NavScoringRect which
        // at worst should be 1 page away from ClipRect
        let unclipped_rect = win.ClipRect.Clone();
        if (g.NavMoveRequest)
            unclipped_rect.Add(g.NavScoringRectScreen);

        const pos = win.DC.CursorPos;
        let start = Math.floor((unclipped_rect.Min.y - pos.y) / items_height);
        let end = Math.floor((unclipped_rect.Max.y - pos.y) / items_height);

        // When performing a navigation request, ensure we have one item extra
        // in the direction we are moving to
        if (g.NavMoveRequest && g.NavMoveClipDir == Dir.Up)
            start--;
        if (g.NavMoveRequest && g.NavMoveClipDir == Dir.Down)
            end++;

        start = Vec1.Clamp(start, 0, items_count);
        end = Vec1.Clamp(end + 1, start, items_count);
        if(isNaN(start) || isNaN(end))
        {
            console.assert(0);
        }
        return [start, end];
    },

    //-------------------------------------------------------------------------
    // [SECTION] Widgets: ListBox
    //-------------------------------------------------------------------------
    // - ListBox()
    // - ListBoxHeader()
    // - ListBoxFooter()
    //-------------------------------------------------------------------------
    // FIXME: This is an old API. We should redesign some of it, rename
    // ListBoxHeader->BeginListBox, ListBoxFooter->EndListBox
    // and promote using them over existing ListBox() functions, similarly to
    // change with combo boxes.
    //-------------------------------------------------------------------------

    // FIXME: In principle this function should be called BeginListBox().
    // We should rename it after re-evaluating if we want to keep the same
    // signature. Helper to calculate the size of a listbox and display a
    // label on the right.
    // Tip: To have a list filling the entire window width, PushItemWidth(-1)
    // and pass an non-visible label e.g. "##empty"
    ListBoxHeader(label, items_count, height_in_items)
    {
        if(items_count.x != undefined)
        {
            // it's actually a size..
            return this.ListBoxHeaderEx(label, items_count);
        }
        // Size default to hold ~7.25 items.
        // We add +25% worth of item height to allow the user to see at a glance
        // if there are more items up/down, without looking at the scrollbar.
        // We don't add this extra bit if items_count <= height_in_items. It is
        // slightly dodgy, because it means a dynamic list of items will make
        // the widget resize occasionally when it crosses that size.
        // I am expecting that someone will come and complain about this behavior
        // in a remote future, then we can advise on a better solution.
        if (height_in_items < 0)
            height_in_items = Math.min(items_count, 7);
        const style = this.GetStyle();
        let height_in_items_f = (height_in_items < items_count) ?
                (height_in_items + 0.25) : (height_in_items + 0.);

        // We include ItemSpacing.y so that a list sized for the exact number
        // of items doesn't make a scrollbar appears. We could also enforce that
        // by passing a flag to BeginChild().
        let size = new Vec2();
        size.x = 0.;
        size.y = this.GetTextLineHeightWithSpacing() * height_in_items_f +
                        style.FramePadding.y * 2.;
        return this.ListBoxHeaderEx(label, size);
    },

    ListBoxHeaderEx(label, size_arg)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        const style = this.GetStyle();
        const id = this.GetID(label);
        const label_size = this.CalcTextSize(label, true);

        // Size default to hold ~7 items. Fractional number of items helps
        // seeing that we can scroll down/up without looking at scrollbar.
        let size = this.calcItemSize(size_arg, this.getNextItemWidth(),
                    this.GetTextLineHeightWithSpacing() * 7.4 + style.ItemSpacing.y);
        let frame_size = new Vec2(size.x, Math.max(size.y, label_size.y));
        let frame_bb = new Rect(win.DC.CursorPos,
                            Vec2.Add(win.DC.CursorPos, frame_size));
        let bb = new Rect(frame_bb.Min,
                            Vec2.AddXY(frame_bb.Max,
                                label_size.x > 0 ?
                                    style.ItemInnerSpacing.x + label_size.x : 0,
                                0.));
        win.DC.LastItemRect = bb; // Forward storage for ListBoxFooter.. dodgy.

        if (!this.IsRectVisible(bb.Min, bb.Max))
        {
            this.itemSize(bb.GetSize(), style.FramePadding.y);
            this.itemAdd(bb, 0, frame_bb);
            return false;
        }

        this.BeginGroup();
        if (label_size.x > 0)
        {
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                     frame_bb.Min.y + style.FramePadding.y),
                            label);
        }

        this.BeginChildFrame(id, frame_bb.GetSize());
        return true;
    },

    // FIXME: In principle this function should be called EndListBox().
    // We should rename it after re-evaluating if we want to keep the same
    // signature.
    ListBoxFooter()
    {
        let parent_window = this.getCurrentWindow().ParentWindow;
        const bb = parent_window.DC.LastItemRect;
        const style = this.GetStyle();

        this.EndChildFrame();

        // Redeclare item size so that it includes the label (we have stored
        // the full size in LastItemRect)
        // We call SameLine() to restore DC.CurrentLine* data
        this.SameLine();
        parent_window.DC.CursorPos = bb.Min.Clone();
        this.itemSize(bb, style.FramePadding.y);
        this.EndGroup();
    },

    ListBox(label, current_item, items, height_items=-1, onChange)
    {
        let getter = function(i)
        {
            return items[i];
        };
        return this.ListBoxCB(label, current_item, getter, items.length,
                                height_items, onChange);
    },

    // windowed/deferred listbox
    ListBoxCB(label, current_item, items_getter, items_count,
                height_in_items, onChange)
    {
        let g = this.guictx;
        let value_changed = false;
        if(this.ListBoxHeader(label, items_count, height_in_items))
        {
            // Assume all items have even height (= 1 line of text). If you
            // need items of different or variable sizes you can create a
            // custom version of ListBox() in your code without using the clipper.
            // We know exactly our line height here so we pass it as a minor
            // optimization, but generally you don't need to.
            let clipper = new ListClipper(this, items_count,
                                    this.GetTextLineHeightWithSpacing());
            while (clipper.Step())
            {
                for (let i = clipper.DisplayStart; i < clipper.DisplayEnd; i++)
                {
                    const item_selected = (i == current_item);
                    let item_text =  items_getter(i);
                    if(item_text == undefined)
                        item_text = "*Unknown item*";

                    this.PushID(i);
                    if (this.Selectable(item_text, item_selected))
                    {
                        current_item = i;
                        value_changed = true;
                    }
                    if (item_selected)
                        this.SetItemDefaultFocus();
                    this.PopID();
                }
            }
            this.ListBoxFooter();
        }
        if(value_changed)
        {
            if(onChange) onChange(current_item);
            this.markItemEdited(g.CurrentWindow.DC.LastItemId);
        }
        return value_changed;
    },

};