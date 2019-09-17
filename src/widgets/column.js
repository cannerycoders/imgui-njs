import {Rect, Vec1, Vec2, ValRef} from "../types.js";
import {MouseCursor} from "../enums.js";
import {ArrayEx} from "../arrayex.js";

//-----------------------------------------------------------------------------
// [SECTION] COLUMNS
// In the current version, Columns are very weak. Needs to be replaced with a
// more full-featured system.
//-----------------------------------------------------------------------------

export var ColumnsFlags =
{
    None: 0,
    NoBorder: 1 << 0,   // Disable column dividers
    NoResize: 1 << 1,   // Disable resizing columns when clicking on the dividers
    NoPreserveWidths: 1 << 2,   // Disable column width preservation when adjusting columns
    NoForceWithinWindow: 1 << 3,   // Disable forcing columns to fit within window
    GrowParentContentsSize: 1 << 4    // (WIP) Restore pre-1.51 behavior of extending the parent window contents size but _without affecting the columns width at all_. Will eventually remove.
};

export class ColumnData
{
    constructor()
    {
        this.OffsetNorm = 0;
        this.OffsetNormBeforeResize = 0;
        this.Flags = 0; // None
        this.ClipRect = null;
    }
}

const ColumnsHitRectHalfWidth = 4;

export class Columns
{
    constructor()
    {
        this.Columns = new ArrayEx();
        this.Clear();
    }

    Clear()
    {
        this.ID = 0;
        this.Flags = 0;
        this.IsFirstFrame = false;
        this.IsBeingResized = false;
        this.Current = 0;
        this.Count = 1;
        this.MinX = this.MaxX = 0.0;
        this.LineMinY = this.LineMaxY = 0.;
        this.BackupCursorPosY = 0.; // cursor at BeginColumns
        this.BackupCurosrMaxPosX = 0.;
        this.Columns.resize(0); // clear
    }
}

export var ImguiColumnMixin =
{
    // Columns -----------------------------------
    // - You can also use SameLine(pos_x) to mimic simplified columns.
    // - The columns API is work-in-progress and rather lacking (columns are
    //   arguably the worst part of dear imgui at the moment!)
    Columns(count=1, id=null, border=true)
    {
        let win = this.getCurrentWindow();
        console.assert(count >= 1);

        let flags = (border ? 0 : ColumnsFlags.NoBorder);
        //flags |= ImGuiColumnsFlags_NoPreserveWidths; // NB: Legacy behavior
        let columns = win.DC.CurrentColumns;
        if (columns != null && columns.count == count && columns.Flags == flags)
            return;

        if (columns != null)
            this.endColumns();

        if (count != 1)
            this.beginColumns(id, count, flags);
    },

    // next column, defaults to current row or next row if the current row
    // is finished
    NextColumn()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems || win.DC.CurrentColumns == null)
            return;

        let g = this.guictx;
        let columns = win.DC.CurrentColumns;
        if (columns.Count == 1)
        {
            win.DC.CursorPos.x = Math.floor(win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x);
            console.assert(columns.Current == 0);
            return;
        }

        this.PopItemWidth();
        this.PopClipRect();

        columns.LineMaxY = Math.max(columns.LineMaxY, win.DC.CursorPos.y);
        if (++columns.Current < columns.Count)
        {
            // Columns 1+ cancel out IndentX
            win.DC.ColumnsOffset.x = this.GetColumnOffset(columns.Current) -
                                        win.DC.Indent.x + g.Style.ItemSpacing.x;
            win.DrawList.ChannelsSetCurrent(columns.Current);
        }
        else
        {
            // New line
            win.DC.ColumnsOffset.x = 0;
            win.DrawList.ChannelsSetCurrent(0);
            columns.Current = 0;
            columns.LineMinY = columns.LineMaxY;
        }
        win.DC.CursorPos.x = Math.floor(win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x);
        win.DC.CursorPos.y = columns.LineMinY;
        win.DC.CurrentLineHeight = 0;
        win.DC.CurrentLineHeightMax = 0;
        win.DC.CurrentLineTextBaseOffset = 0;

        this.pushColumnClipRect();
        this.PushItemWidth(this.GetColumnWidth() * 0.65);  // FIXME: Move on columns setup
    },

    // get current column index
    GetColumnIndex()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CurrentColumns ? win.DC.CurrentColumns.Current : 0;
    },

    GetColumnsCount()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.CurrentColumns ? win.DC.CurrentColumns.Count : 1;
    },

    offsetNormToPixels(columns, offset_norm)
    {
        return offset_norm * (columns.MaxX - columns.MinX);
    },

    pixelsToOffsetNorm(columns, offset)
    {
        return offset / (columns.MaxX - columns.MinX);
    },

    getDraggedColumnOffset(columns, column_index)
    {
        // Active (dragged) column always follow mouse. The reason we need
        // this is that dragging a column to the right edge of an auto-resizing
        // window creates a feedback loop because we store normalized positions.
        // So while dragging we enforce absolute positioning.
        let g = this.guictx;
        let win = g.CurrentWindow;
        console.assert(column_index > 0); // We are not supposed to drag column 0.
        console.assert(g.ActiveId == columns.ID + column_index);

        let x = g.IO.MousePos.x - g.ActiveIdClickOffset.x
                    + ColumnsHitRectHalfWidth - win.Pos.x;
        x = Math.max(x, this.GetColumnOffset(column_index-1) + g.Style.ColumnsMinSpacing);
        if ((columns.Flags & ColumnsFlags.NoPreserveWidths))
            x = Math.min(x, this.GetColumnOffset(column_index+1) - g.Style.ColumnsMinSpacing);
        return x;
    },

    // get position of column line (in pixels, from the left side of the
    // contents region). pass -1 to use current column, otherwise
    // 0..GetColumnsCount() inclusive. column 0 is typically 0.0f
    GetColumnOffset(column_index=-1)
    {
        let win = this.getCurrentWindowRead();
        let columns = win.DC.CurrentColumns;
        console.assert(columns);
        if (column_index < 0)
            column_index = columns.Current;
        console.assert(column_index < columns.Columns.length);
        const t = columns.Columns[column_index].OffsetNorm;
        const x_offset = Vec1.Lerp(columns.MinX, columns.MaxX, t);
        return x_offset;
    },

    getColumnWidthEx(columns, column_index, before_resize=false)
    {
        if (column_index < 0)
            column_index = columns.Current;
        let offset_norm;
        if (before_resize)
            offset_norm = columns.Columns[column_index+1].OffsetNormBeforeResize
                        - columns.Columns[column_index].OffsetNormBeforeResize;
        else
            offset_norm = columns.Columns[column_index+1].OffsetNorm
                        - columns.Columns[column_index].OffsetNorm;
        return this.offsetNormToPixels(columns, offset_norm);
    },

    // get column width (in pixels). pass -1 to use current column
    GetColumnWidth(column_index=-1)
    {
        let win = this.getCurrentWindowRead();
        let columns = win.DC.CurrentColumns;
        console.assert(columns);
        if (column_index < 0)
            column_index = columns.Current;
        return this.offsetNormToPixels(columns,
                       columns.Columns[column_index+1].OffsetNorm -
                       columns.Columns[column_index].OffsetNorm);
    },

    // set position of column line (in pixels, from the left side of the
    // contents region). pass -1 to use current column
    SetColumnOffset(column_index, offset)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        let columns = win.DC.CurrentColumns;
        console.assert(columns);
        if (column_index < 0)
            column_index = columns.Current;
        console.assert(column_index < columns.Columns.length);
        const preserve_width = !(columns.Flags & ColumnsFlags.NoPreserveWidths) &&
                                (column_index < columns.Count-1);
        const width = preserve_width ? this.getColumnWidthEx(columns, column_index,
                                                columns.IsBeingResized) : 0;

        if (!(columns.Flags & ColumnsFlags.NoForceWithinWindow))
            offset = Math.min(offset, columns.MaxX -
                            g.Style.ColumnsMinSpacing*(columns.Count-column_index));
        columns.Columns[column_index].OffsetNorm =
                    this.pixelsToOffsetNorm(columns, offset - columns.MinX);

        if (preserve_width)
        {
            this.SetColumnOffset(column_index + 1,
                        offset + Math.max(g.Style.ColumnsMinSpacing, width));
        }
    },

    // set column width (in pixels). pass -1 to use current column
    SetColumnWidth(column_index, width)
    {
        let win = this.getCurrentWindowRead();
        let columns = win.DC.CurrentColumns;
        console.assert(columns);
        if (column_index < 0)
            column_index = columns.Current;
        this.SetColumnOffset(column_index + 1,
                        this.GetColumnOffset(column_index) + width);
    },

    pushColumnClipRect(column_index=-1)
    {
        let win = this.getCurrentWindowRead();
        let columns = win.DC.CurrentColumns;
        if (column_index < 0)
            column_index = columns.Current;
        let column = columns.Columns[column_index];
        this.PushClipRect(column.ClipRect.Min, column.ClipRect.Max, false);
    },

    findOrCreateColumns(win, id)
    {
        // We have few columns per window so for now we don't need bother
        // much with turning this into a faster lookup.
        for (let n = 0; n < win.ColumnsStorage.length; n++)
        {
            if (win.ColumnsStorage[n].ID == id)
                return win.ColumnsStorage[n];
        }
        win.ColumnsStorage.push(new Columns());
        let columns = win.ColumnsStorage.back();
        columns.ID = id;
        return columns;
    },

    getColumnsID(str_id, columns_count)
    {
        let win = this.getCurrentWindow();
        // Differentiate column ID with an arbitrary prefix for cases where
        // users name their columns set the same as another widget. In
        // addition, when an identifier isn't explicitly provided we include
        // the number of columns in the hash to make it uniquer.
        this.PushID(0x11223347 + (str_id ? 0 : columns_count));
        let id = win.GetID(str_id ? str_id : "columns");
        this.PopID();
        return id;
    },

    beginColumns(str_id, columns_count, flags)
    {
        let g = this.guictx;
        let win = this.getCurrentWindow();

        console.assert(columns_count >= 1);
        // Nested columns are currently not supported
        console.assert(win.DC.CurrentColumns == null);

        let id = this.getColumnsID(str_id, columns_count);

        // Acquire storage for the columns set
        let columns = this.findOrCreateColumns(win, id);
        console.assert(columns.ID == id);
        columns.Current = 0;
        columns.Count = columns_count;
        columns.Flags = flags;
        win.DC.CurrentColumns = columns;

        // Set state for first column
        const content_region_width = (win.SizeContentsExplicit.x != 0) ?
            (win.SizeContentsExplicit.x) : (win.InnerClipRect.Max.x - win.Pos.x);
        columns.MinX = win.DC.Indent.x - g.Style.ItemSpacing.x; // Lock our horizontal range
        columns.MaxX = Math.max(content_region_width - win.Scroll.x, columns.MinX + 1.);
        columns.BackupCursorPosY = win.DC.CursorPos.y;
        columns.BackupCursorMaxPosX = win.DC.CursorMaxPos.x;
        columns.LineMinY = columns.LineMaxY = win.DC.CursorPos.y;
        win.DC.ColumnsOffset.x = 0;
        win.DC.CursorPos.x = Math.floor(win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x);

        // Clear data if columns count changed
        if (columns.Columns.length != 0 && columns.Columns.length != columns_count + 1)
            columns.Columns.resize(0);

        // Initialize defaults
        columns.IsFirstFrame = (columns.Columns.length == 0);
        if (columns.Columns.length == 0)
        {
            columns.Columns.length = columns_count+1; // reserve
            for (let n = 0; n < columns.Columns.length; n++)
            {
                let column = new ColumnData();
                column.OffsetNorm = n / columns_count;
                columns.Columns[n] = column;
            }
        }

        for (let n = 0; n < columns_count; n++)
        {
            // Compute clipping rectangle
            let column = columns.Columns[n];
            let clip_x1 = Math.floor(0.5 + win.Pos.x + this.GetColumnOffset(n) - 1.);
            let clip_x2 = Math.floor(0.5 + win.Pos.x + this.GetColumnOffset(n+1) - 1.);
            column.ClipRect = new Rect(clip_x1, -Number.MAX_VALUE,
                                       clip_x2, Number.MAX_VALUE);
            column.ClipRect.ClipWith(win.ClipRect);
        }

        if (columns.Count > 1)
        {
            win.DrawList.ChannelsSplit(columns.Count);
            this.pushColumnClipRect();
        }
        this.PushItemWidth(this.GetColumnWidth() * 0.65);
    },

    endColumns()
    {
        let g = this.guictx;
        let style = g.Style;
        let win = this.getCurrentWindow();
        let columns = win.DC.CurrentColumns;
        console.assert(columns);

        this.PopItemWidth();
        if (columns.Count > 1)
        {
            this.PopClipRect();
            win.DrawList.ChannelsMerge();
        }

        columns.LineMaxY = Math.max(columns.LineMaxY, win.DC.CursorPos.y);
        win.DC.CursorPos.y = columns.LineMaxY;
        if (!(columns.Flags & ColumnsFlags.GrowParentContentsSize))
        {
            // Restore cursor max pos, as columns don't grow parent
            win.DC.CursorMaxPos.x = columns.BackupCursorMaxPosX;
        }

        // Draw columns borders and handle resize
        let is_being_resized = false;
        if (!(columns.Flags & ColumnsFlags.NoBorder) && !win.SkipItems)
        {
            const y1 = Math.max(columns.BackupCursorPosY, win.ClipRect.Min.y);
            const y2 = Math.min(win.DC.CursorPos.y, win.ClipRect.Max.y);
            let dragging_column = -1;
            for (let n = 1; n < columns.Count; n++)
            {
                let column = columns.Columns[n];
                let x = win.Pos.x + this.GetColumnOffset(n);
                const column_id = columns.ID + n;
                const column_hit_hw = ColumnsHitRectHalfWidth;
                const column_rect = Rect.FromXY(x - column_hit_hw, y1,
                                                x + column_hit_hw, y2);
                this.keepAliveID(column_id);
                if (this.isClippedEx(column_rect, column_id, false))
                    continue;

                let hovered = new ValRef(false), held = new ValRef(false);
                if (!(columns.Flags & ColumnsFlags.NoResize))
                {
                    this.ButtonBehavior(column_rect, column_id, hovered, held);
                    if (hovered.get() || held.get())
                        g.MouseCursor = MouseCursor.ResizeEW;
                    if (held.get() && !(column.Flags & ColumnsFlags.NoResize))
                        dragging_column = n;
                }

                // Draw column (we clip the Y boundaries CPU side because very
                // long triangles are mishandled by some GPU drivers.)
                const col = style.GetColor(held.get() ? "SeparatorActive" :
                                hovered.get() ? "SeparatorHovered" : "Separator");
                const xi = Math.floor(x);
                win.DrawList.AddLine(new Vec2(xi, y1 + 1),
                                     new Vec2(xi, y2), col);
            }

            // Apply dragging after drawing the column lines, so our rendered
            // lines are in sync with how items were displayed during the frame.
            if (dragging_column != -1)
            {
                if (!columns.IsBeingResized)
                {
                    for (let n = 0; n < columns.Count + 1; n++)
                    {
                        columns.Columns[n].OffsetNormBeforeResize =
                                            columns.Columns[n].OffsetNorm;
                    }
                }
                columns.IsBeingResized = is_being_resized = true;
                let x = this.getDraggedColumnOffset(columns, dragging_column);
                this.SetColumnOffset(dragging_column, x);
            }
        }
        columns.IsBeingResized = is_being_resized;
        win.DC.CurrentColumns = null;
        win.DC.ColumnsOffset.x = 0;
        win.DC.CursorPos.x = Math.floor(win.Pos.x + win.DC.Indent.x + win.DC.ColumnsOffset.x);
    },

};
