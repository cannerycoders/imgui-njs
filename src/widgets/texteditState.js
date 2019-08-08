// Support for editable text.
//  - only instantiate one TextEdit object for each window. Reused according
//    to window focus.
//  - since javscript strings are immutable, we require that they be passed
//    around by reference. A trivial MutablieString class is provided for
//    that purpose.
//  - meta-keys are managed by client.
//  - derived from imstb_textedit.h which itself is derived from
//      https://github.com/nothings/stb.
//  - Licensed under MIT and "unlicense"

export var TextEditMetaKeys =
{
    Left: 0x10000,         // cursor left
    Right: 0x10001,        // cursor right
    Up: 0x10002,           // cursor up
    Down: 0x10003,         // cursor down
    LineStart: 0x10004,    // cursor to start of line
    LineEnd: 0x10005,      // cursor to end of line
    TextStart: 0x10006,    // cursor to start of text
    TextEnd: 0x10007,      // cursor to end of text
    Delete: 0x10008,       // delete selection or character under cursor
    Backspace: 0x10009,    // delete selection or character left of cursor
    Undo: 0x1000A,         // perform undo
    Redo: 0x1000B,         // perform redo
    WordLeft: 0x1000C,     // cursor left one word
    WordRight: 0x1000D,    // cursor right one word
    ToggleInsert: 0x1000E,
    Insert: 0x1000F,
    Shift: 0x20000,
};

// UndoRecord tracks two textedit operations:
//  1. delete length (no CharStorage)
//  2. insert length (yes CharStorage)
const UndoOp =
{
    Insert:1,
    Replace:2,
    Delete:4,
    DoneFlag:8
};

class UndoRecord
{
    constructor(op, where, insertLen, deleteLen, str)
    {
        this.op = op; // the op represents what we must *undo*
        this.where = where;
        this.insertLen = insertLen;
        this.deleteLen = deleteLen;
        switch(this.op)
        {
        case UndoOp.Insert:
            this.charStorage = null;
            break;
        case UndoOp.Delete:
        case UndoOp.Replace:
            this.charStorage = str.GetChars(where, deleteLen);
            break;
        }
        this.op |= UndoOp.DoneFlag;
    }

    Undo(str)
    {
        switch(this.op)
        {
        case UndoOp.Insert | UndoOp.DoneFlag:
            // delete inserted chars from str, store them
            // for potential redo
            this.charStorage = str.GetChars(this.where, this.insertLen);
            str.DeleteChars(this.where, this.insertLen);
            break;
        case UndoOp.Delete | UndoOp.DoneFlag:
            // reinsert the deleted chars
            str.InsertChars(this.where, this.charStorage);
            break;
        case UndoOp.Replace | UndoOp.DoneFlag:
            // undo replace: delete/copy insertLen, then insert
            //
            {
                let newchars = str.GetChars(this.where, this.insertLen);
                str.DeleteChars(this.where, this.insertLen);
                str.InsertChars(this.where, this.charStorage);
                this.charStorage = newchars;
            }
            break;
        default:
            console.assert(0, "most unexpected undo");
            break;
        }
        this.op &= ~UndoOp.DoneFlag;
    }

    Redo(str)
    {
        switch(this.op)
        {
        case UndoOp.Insert:
            console.assert(this.charStorage);
            str.InsertChars(this.where, this.charStorage);
            break;
        case UndoOp.Delete:
            console.assert(this.charStorage == str.GetChars(this.where, this.deleteLen));
            str.DeleteChars(this.where, this.insertLen);
            break;
        case UndoOp.Replace:
            {
                let oldchars = str.GetChars(this.where, this.deleteLen);
                str.DeleteChars(this.where, this.deleteLen);
                str.InsertChars(this.where, this.charStorage);
                this.charStorage = oldchars;
            }
            break;
        default:
            console.assert(0, "most unexpected redo");
            break;
        }
        this.op |= UndoOp.DoneFlag;
    }
}

// UndoMgr tracks the state of done, undoable, redoable:
//  * text edit operations push new UndoRecords on the Deque.
//    Insert operations rely on the underlying string to contain
//    the inserted characters.  In contrast a delete operation
//    must include the characters removed.
//  * An undo record has a dual life.  On creation it merely records
//    the underlying operation.  While the record resides on the deque
//    it is either in its undo or its redo state. Ie: after an undo
//    it transmutes itself to the do representation.
//  * Conceptually the current state of the string is the "integral"
//    of all operations on the deque up to the "current". Until the
//    first undo operation, the undoPoint is the tail of the deque.
//    As the user issues repeated undo requests, we decrement the
//    undo point while preserving the deque contents for potential
//    redo.  If we encounter any Track events, we clear the redo
//    state. If we exceed UndoStateCount, we release the oldest
//    undo records (from the "front" of the deque).
class UndoMgr
{
    constructor()
    {
        this.Clear();
    }

    Clear()
    {
        this.cmdDeque = []; // of UndoRecord
        this.cmdIndex = -1; // index into cmdDeque representing "now"
    }

    GetUndoAvailCount()
    {
        Math.max(0, this.cmdIndex+1);
    }

    GetRedoAvailCount()
    {
        Math.max(0, this.cmdDeque.length - this.cmdIndex -1);
    }

    PerformUndo(str)
    {
        if(this.cmdIndex >= 0)
        {
            console.assert(this.cmdIndex < this.cmdDeque.length);
            this.cmdDeque[this.cmdIndex].Undo(str);
            this.cmdIndex--;
        }
    }

    PerformRedo(str)
    {
        let redoIndex = this.cmdIndex+1;
        if(redoIndex < this.cmdDeque.length)
        {
            this.cmdDeque[redoIndex].Redo(str);
            this.cmdIndex = redoIndex;
        }
    }

    // called *after* chars have been insertted
    TrackInsert(where, length)
    {
        this.createUndo(UndoOp.Insert, where, length, 0, null);
    }

    // called *before* deleting chars.
    TrackDelete(str, where, length)
    {
        this.createUndo(UndoOp.Delete, where, 0, length, str);
    }

    // called *before* to delete+insert
    TrackReplace(str, where, oldLen, newLen)
    {
        this.createUndo(UndoOp.Replace, where, oldLen, newLen, str);
    }

    createUndo(op, pos, insertLen, deleteLen, str)
    {
        if(this.cmdIndex < this.cmdDeque.length-1)
            this.cmdDeque.length = this.cmdIndex+1; // flush our redo

        let r = new UndoRecord(op, pos, insertLen, deleteLen, str);
        this.cmdDeque.push(r);
        this.cmdIndex = this.cmdDeque.length-1;
        return r;
    }
}

// Result of layout query, used to determine where the text in each row is.
class Row
{
    construct()
    {
        this.x0 = 0; // start/end location in row
        this.x1 = 0;
        this.baselineYDelta = 0; // position of baseline relative to prior row's
        this.ymin = 0;  // height of row above and below baseline
        this.ymax = 0;
        this.numChars = 0;
    }
}

class FindState
{
    constructor()
    {
        this.x = 0;
        this.y = 0;
        this.height = 0;    // height of line
        this.firstChar = 0; // first char of this row
        this.length = 0;
        this.prevFirst = 0; // first char of previous row
    }
}

// State associated with string editing. We maintain cursor and selection
// state and perform layout, modification and undo/redo.  Client "owns"
// the string which is assumed to implement the MutableString interface.
// We don't store the string internally which makes it easier to share
// an instance across multiple strings.
export class TextEditState
{
    constructor(guictx)
    {
        // public member vars

        this.Cursor = -1; // position of the text cursor within the string
        this.SelectStart = 0;
        this.SelectEnd = 0;
        this.InsertMode = 0;

        // private ---
        this.guictx = guictx; // for CurrentFont
        this.initialized = false;
        this.preferredX = undefined; // cursor up/down
        this.singleLine = false;

        this.row = new Row();
        this.finder = new FindState();
        this.undoMgr = new UndoMgr();
    }

    Init(singleLine=true, clearUndo=true)
    {
        if(clearUndo)
            this.undoMgr.Clear();

        this.singleLine = singleLine;

        this.SelectEnd = 0;
        this.SelectStart = 0;
        this.Cursor = 0;
        this.preferredX = null;
        this.cursorAtEndOfLine = 0;
        this.initialized = true;
        this.insertMode = 0;
    }

    // move the cursor to the clicked location, and reset the selection
    Click(str, x, y)
    {
        // In single-line mode, just always make y = 0. This lets the drag
        // keep working if the mouse goes off the top or bottom of the text
        if(this.singleLine)
        {
            this.layoutRow(this.row, str, 0);
            y = this.row.ymin;
        }

        this.Cursor = this.locateCoord(str, x, y);
        this.SelectStart = this.Cursor;
        this.SelectEnd = this.Cursor;
        this.preferredX = null; // !hasPreferredX
    }

    // make the selection/cursor state valid if client altered the string
    ClampCursor(str)
    {
        let n = str.Length();
        if (this.HasSelection())
        {
            if (this.SelectStart > n) this.SelectStart = n;
            if (this.SelectEnd > n) this.SelectEnd = n;
            // if clamping forced them to be equal, move the cursor to match
            if (this.SelectStart == this.SelectEnd)
                this.Cursor = this.SelectStart;
        }
        if (this.Cursor > n)
            this.Cursor = n;
    }

    HasSelection()
    {
        return this.SelectStart != this.SelectEnd;
    }

    GetSelectedText(str)
    {
        if(!this.HasSelection()) return null;
        this.sortSelection();
        return str.GetChars(this.SelectStart, this.SelectEnd-this.SelectStart);
    }

    ClearSelection()
    {
        this.SelectStart = this.SelectEnd = 0;
    }

    SelectAll(str)
    {
        this.SelectStart = 0;
        this.SelectEnd = this.Cursor = str.Length();
        this.preferredX = null;
    }

    GetUndoAvailCount()
    {
        this.undoMgr.GetUndoAvailCount();
    }

    GetRedoAvailCount()
    {
        this.undoMgr.GetRedoAvailCount();
    }

    // move the cursor and selection endpoint to the clicked location
    Drag(str, x, y)
    {
        let p = 0;

        // In single-line mode, just always make y = 0. This lets the drag keep
        // working if the mouse goes off the top or bottom of the text
        if(this.singleLine)
        {
           this.layoutRow(this.row, str, 0);
           y = this.row.ymin;
        }

        if (this.SelectStart == this.SelectEnd)
           this.SelectStart = this.Cursor;

        p = this.locateCoord(str, x, y);
        this.Cursor = this.SelectEnd = p;
    }

    // API cut: delete selection
    Cut(str)
    {
        if(this.HasSelection())
        {
            this.deleteSelection(str);
            this.preferredX = null;
            return 1;
        }
        return 0;
    }

    // API paste: replace existing selection with passed-in text
    Paste(str, newchars)
    {
        // if there's a selection, the paste should delete it
        this.ClampCursor(str);
        this.deleteSelection(str);
        // try to insert the characters
        if (this.insertChars(str, this.Cursor, newchars))
        {
            let len = newchars.length;
            this.undoMgr.TrackInsert(this.Cursor, len);
            this.Cursor += len;
            this.preferredX = null;
            return 1;
        }
        return 0;
    }

    // process a keyboard input
    Key(str,key)
    {
        let c;
        switch (key)
        {
        default:
            c = this.keyToText(key);
            if (c != null)
            {
                let ch = c;
                // can't add newline in single-line mode
                if (c == "\n" && this.singleLine)
                    break;

                if (this.insertMode && !this.HasSelection() &&
                    this.Cursor < str.Length())
                {
                    this.undoMgr.TrackReplace(str, this.Cursor, 1, 1);
                    this.deleteChars(str, this.Cursor, 1);
                    if (this.insertChars(str, this.Cursor, ch))
                    {
                        ++this.Cursor;
                        this.hasPreferredX = null;
                    }
                }
                else
                {
                    this.deleteSelection(str); // implicitly clamps, tracks delete
                    if (this.insertChars(str, this.Cursor, ch))
                    {
                        // console.log(`insert ${ch} before ${this.Cursor}`);
                        this.undoMgr.TrackInsert(this.Cursor, 1);
                        this.Cursor++;
                        this.preferredX = null;
                    }
                }
            }
            break;

        case TextEditMetaKeys.Insert:
            this.insertMode = !this.insertMode;
            break;

        case TextEditMetaKeys.Undo:
            this.undoMgr.PerformUndo(str);
            this.preferredX = null;
            this.ClampCursor(str);
            break;

        case TextEditMetaKeys.Redo:
            this.undoMgr.PerformRedo(str);
            this.preferredX = null;
            this.ClampCursor(str);
            break;

        case TextEditMetaKeys.Left:
            // if currently there's a selection, move cursor to start of selection
            if (this.HasSelection())
                this.moveToFirst();
            else
            if (this.Cursor > 0)
                this.Cursor--;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.Right:
            // if currently there's a selection, move cursor to end of selection
            if (this.HasSelection())
                this.moveToLast(str);
            else
                this.Cursor++;
            this.ClampCursor(str);
            this.preferredX = null;
            break;

        case TextEditMetaKeys.Left | TextEditMetaKeys.Shift:
            this.ClampCursor(str);
            this.prepSelectionAtCursor();
            // move selection left
            if (this.SelectEnd > 0)
                this.SelectEnd--;
            this.Cursor = this.SelectEnd;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.WordLeft:
            if (this.HasSelection())
                this.moveToFirst();
            else
            {
                this.Cursor = this.moveWordLeft(str, this.Cursor);
                this.ClampCursor(str);
            }
            break;

        case TextEditMetaKeys.WordLeft | TextEditMetaKeys.Shift:
            if (this.HasSelection())
                this.prepSelectionAtCursor();

            this.Cursor = this.moveWordLeft(str, this.Cursor);
            this.SelectEnd = this.Cursor;
            this.ClampCursor(str);
            break;

        case TextEditMetaKeys.WordRight:
            if (this.HasSelection())
                this.moveToLast(str);
            else
            {
                this.Cursor = this.moveWordRight(str, this.Cursor);
                this.ClampCursor(str);
            }
            break;

        case TextEditMetaKeys.WordRight | TextEditMetaKeys.Shift:
            if (this.HasSelection())
                this.prepSelectionAtCursor();

            this.Cursor = this.moveWordRight(str, this.Cursor);
            this.SelectEnd = this.Cursor;
            this.ClampCursor(str);
            break;

        case TextEditMetaKeys.Right | TextEditMetaKeys.Shift:
            this.prepSelectionAtCursor();
            // move selection right
            this.SelectEnd++;
            this.ClampCursor(str);
            this.Cursor = this.SelectEnd;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.Down:
        case TextEditMetaKeys.Down | TextEditMetaKeys.Shift:
            {
                if (this.singleLine)
                {
                    // on windows, up&down in single-line behave like left&right
                    key = TextEditMetaKeys.Right | (key & TextEditMetaKeys.Shift);
                    return this.Key(str, key); // retry
                }

                let find = this.finder;
                let row = this.row;
                let i, sel = (key & TextEditMetaKeys.Shift) != 0;

                if (sel)
                    this.prepSelectionAtCursor();
                else
                if (this.HasSelection)
                    this.moveToLast(str);

                // compute current position of cursor point
                this.ClampCursor(str);
                this.findCharPos(str, this.Cursor, this.singleLine, find);

                // now find character position down a row
                if (find.length)
                {
                    let goal_x = this.preferredX != null ? this.preferredX : find.x;
                    let x;
                    let start = find.firstChar + find.length;
                    this.Cursor = start;
                    this.layoutRow(row, str, this.Cursor);
                    x = row.x0;
                    for (i=0; i<row.numChars; ++i)
                    {
                        let dx = this.getWidth(str, start, i);
                        x += dx;
                        if (x > goal_x)
                            break;
                        this.Cursor++;
                    }
                    this.ClampCursor(str);
                    this.preferredX = goal_x;
                    if (sel)
                        this.SelectEnd = this.Cursor;
                }
                else
                {
                    // console.log("down (no length): " + this.Cursor);
                }
            }
            break;

        case TextEditMetaKeys.Up:
        case TextEditMetaKeys.Up | TextEditMetaKeys.Shift:
            {
                if (this.singleLine)
                {
                    // on windows, up&down become left&right
                    key = TextEditMetaKeys.Left | (key & TextEditMetaKeys.Shift);
                    return this.Key(str, key); // retry
                }

                let find = this.finder;
                let row = this.row;
                let i, sel = (key & TextEditMetaKeys.Shift) != 0;

                if (sel)
                    this.prepSelectionAtCursor();
                else
                if (this.HasSelection())
                    this.moveToFirst();

                // compute current position of cursor point
                this.ClampCursor(str);
                this.findCharPos(str, this.Cursor, this.singleLine, find);

                // can only go up if there's a previous row
                if (find.prevFirst != find.firstChar)
                {
                    // now find character position up a row
                    let old = this.Cursor;
                    let goal_x = this.preferredX != null ? this.preferredX : find.x;
                    let x;
                    this.Cursor = find.prevFirst;
                    this.layoutRow(row, str, this.Cursor);
                    if(goal_x > row.x1)
                        this.Cursor += row.numChars-1;
                    else
                    if(row.x1 > 0) // bypass newline-only case
                    {
                        x = row.x0;
                        for (i=0; i < row.numChars; ++i)
                        {
                            let dx = this.getWidth(str, find.prevFirst, i);
                            x += dx;
                            if (x > goal_x)
                                break;
                            this.Cursor++;
                        }
                    }
                    // console.log(`old:${old} goal:${goal_x} => new:${this.Cursor}`);
                    this.ClampCursor(str);
                    this.preferredX = goal_x;
                    if (sel)
                        this.SelectEnd = this.Cursor;
                }
                else
                {
                    // console.log("top:" + this.Cursor);
                }
            }
            break;

        case TextEditMetaKeys.Delete:
        case TextEditMetaKeys.Delete | TextEditMetaKeys.Shift:
            if (this.HasSelection())
                this.deleteSelection(str);
            else
            {
                let n = str.Length();
                if (this.Cursor < n)
                    this.delete(str, this.Cursor, 1);
            }
            this.preferredX = null;
            break;

        case TextEditMetaKeys.Backspace:
        case TextEditMetaKeys.Backspace | TextEditMetaKeys.Shift:
            if (this.HasSelection())
                this.deleteSelection(str);
            else
            {
                this.ClampCursor(str);
                if (this.Cursor > 0)
                {
                    this.delete(str, this.Cursor-1, 1);
                    this.Cursor--;
                }
            }
            this.preferredX = null;
            break;

        case TextEditMetaKeys.TextStart:
            this.Cursor = this.SelectStart = this.SelectEnd = 0;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.TextStart | TextEditMetaKeys.Shift:
            this.prepSelectionAtCursor();
            this.Cursor = this.SelectEnd = 0;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.TextEnd:
            this.Cursor = str.Length();
            this.SelectStart = this.SelectEnd = 0;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.TextEnd | TextEditMetaKeys.Shift:
            this.prepSelectionAtCursor();
            this.Cursor = this.SelectEnd = str.Length();
            this.preferredX = null;
            break;

        case TextEditMetaKeys.LineStart:
            this.ClampCursor(str);
            this.moveToFirst();
            if (this.singleLine)
                this.Cursor = 0;
            else
            while (this.Cursor > 0 && !str.IsNewLine(this.Cursor-1))
                this.Cursor--;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.LineStart | TextEditMetaKeys.Shift:
            this.ClampCursor(str);
            this.prepSelectionAtCursor();
            if (this.singleLine)
                this.Cursor = 0;
            else
            while (this.Cursor > 0 && !str.IsNewLine(this.Cursor-1))
            {
                this.Cursor--;
            }
            this.SelectEnd = this.Cursor;
            this.preferredX = null;
            break;

        case TextEditMetaKeys.LineEnd:
            {
                let n = str.Length();
                this.ClampCursor(str);
                this.moveToFirst();
                if (this.singleLine)
                    this.Cursor = n;
                else
                while (this.Cursor < n && !str.IsNewLine(this.Cursor))
                {
                    this.Cursor++;
                }
                this.preferredX = null;
            }
            break;

        case TextEditMetaKeys.LineEnd | TextEditMetaKeys.Shift:
            {
                let n = str.Length();
                this.ClampCursor(str);
                this.prepSelectionAtCursor();
                if (this.singleLine)
                    this.Cursor = n;
                else
                while (this.Cursor < n && !str.IsNewLine(this.Cursor))
                    this.Cursor++;
                this.SelectEnd = this.Cursor;
                this.preferredX = null;
            }
            break;
        }
    } // end Key()

    // returns information about the shape of one displayed row of characters
    // assuming they start on the i'th character: the width and the height
    // and the number of characters consumed. This allows this library to
    // traverse the entire layout incrementally. You need to compute
    // word-wrapping here.
    layoutRow(row, str, lineStart, stopOnNewline=true)
    {
        let ts = this.CalcTextRunSize(str, lineStart, -1, stopOnNewline);
        row.x0 = 0.;
        row.x1 = ts.x;
        row.baselineYDelta = ts.y;
        row.ymin = 0.;
        row.ymax = ts.y;
        row.numChars = ts.consumed - lineStart;
        // numChars may be 0!
    }

    // returns
    //   { x: width, y: height, consumed: lastIndex}
    CalcTextRunSize(str, lineStart, lineEnd=-1, stopOnNewline=true)
    {
        let g = this.guictx;
        const lineHeight = g.Font.Size * g.Style.TextLineHeightPct;
        let ret = {x: 0, y:0};
        let lineWidth = 0.;
        let i = lineStart;
        if(lineEnd == -1)
            lineEnd = str.Length();
        g.Font.MeasureBegin();
        while (i < lineEnd)
        {
            let c = str.GetCharCode(i++);
            if (c == 10) // 0x0a, "\n"
            {
                ret.x = Math.max(ret.x, lineWidth);
                ret.y += lineHeight;
                lineWidth = 0;
                if (stopOnNewline)
                    break;
                continue;
            }
            if (c == 13) // 0x0d, "\r"
                continue;

            lineWidth += g.Font.MeasureWidth(String.fromCharCode(c));
        }
        ret.consumed = i;
        g.Font.MeasureEnd();
        if (ret.x < lineWidth)
            ret.x = lineWidth;

        if (lineWidth > 0 || ret.y == 0)
            ret.y += lineHeight;

        return ret;
    }

    // returns the pixel delta from the xpos of the i'th character to the xpos
    // of the i+1'th char for a line of characters starting at character n
    // (i.e. accounts for kerning with previous char)
    getWidth(str, lineStart, charIdx)
    {
        let g = this.guictx;
        let c = str.GetChar(lineStart + charIdx);
        if ("\n\r".indexOf(c) != -1) return 0;
        return g.Font.MeasureWidth(c);
    }

    keyToText(key)
    {
        return key >= 0x10000 ? null : String.fromCharCode(key);
    }

    isWordBoundaryFromRight(str, idx)
    {
        return idx > 0 ?
            str.IsSeparator(idx-1) && !str.IsSeparator(idx) : 1;
    }

    moveWordLeft(str, idx)
    {
        idx--;
        while (idx >= 0 && !this.isWordBoundaryFromRight(str, idx))
            idx--;
        return idx < 0 ? 0 : idx;
    }

    moveWordRight(str, idx)
    {
        idx++;
        let len = str.Length();
        while (idx < len && !this.isWordBoundaryFromRight(str, idx))
            idx++;
        return idx > len ? len : idx;
    }

    prepSelectionAtCursor()
    {
        if(!this.HasSelection())
            this.SelectStart = this.SelectEnd = this.Cursor;
        else
            this.Cursor = this.SelectEnd;
    }

    deleteChars(str, pos, n)
    {
        str.DeleteChars(pos, n);
    }

    insertChars(str, pos, newchars)
    {
        // console.log(`insert ${newchars} at $`)
        str.InsertChars(pos, newchars);
        return true; // XXX: a little more care required here.
    }

    // mouse position
    // traverse layout to locate the nearest character to a display position
    locateCoord(str, x, y)
    {
        let r = new Row();
        let n = str.Length();
        let base_y = 0;
        let i=0, k;
        let g = this.guictx;

        r.x0 = r.x1 = 0;
        r.ymin = r.ymax = 0;
        r.numChars = 0;

        try
        {
            g.Font.MeasureBegin(); // MeasureEnd in finally block
            // search rows to find one that straddles 'y'
            while (i < n)
            {
                this.layoutRow(r, str, i);
                if (r.numChars <= 0)
                    return n;
                if (i==0 && y < base_y + r.ymin)
                    return 0;
                if (y < base_y + r.ymax)
                    break;
                i += r.numChars;
                base_y += r.baselineYDelta;
            }

            // below all text, return 'after' last character
            if (i >= n)
                return n;

            // check if it's before the beginning of the line
            if (x < r.x0)
                return i;

            // check if it's before the end of the line
            if (x < r.x1)
            {
                // search characters in row for one that straddles 'x'
                let prev_x = r.x0;
                for (k=0; k < r.numChars; ++k)
                {
                    let w = this.getWidth(str, i, k);
                    let next_x = prev_x + w;
                    if (x < next_x)
                    {
                        if (x < prev_x+w/2)
                            return k+i;
                        else
                            return k+i+1;
                    }
                    prev_x =  next_x;
                }
                // shouldn't happen, but if it does, fall through to end-of-line case
            }

            // if the last character is a newline, return that. otherwise return
            // 'after' the last character
            if (str[i+r.numChars-1] == "\n") // XXX: more newlines?
                return i+r.numChars-1;
            else
                return i+r.numChars;
        }
        finally
        {
            // to handle myriad internal returns
            g.Font.MeasureEnd();
        }
    } // end locateCoord

    // find the x/y location of a character, and remember info about the
    // previous row in case we get a move-up event (for page up, we'll have
    // to rescan)
    findCharPos(str, n, singleLine, find)
    {
        let prev_linestart = 0;
        let z = str.Length();
        let i=0;
        let r = this.row;
        if (n == z) // location of one-past last character
        {
            // if it's at the end, then find the last line -- simpler than
            // trying to explicitly handle this case in the regular code
            if (singleLine)
            {
                this.layoutRow(r, str, 0);
                find.y = 0;
                find.firstChar = 0;
                find.length = z;
                find.height = r.ymax - r.ymin;
                find.x = r.x1;
            }
            else
            {
                find.y = 0;
                find.x = 0;
                find.height = 1;
                while (i < z)
                {
                    this.layoutRow(r, str, i);
                    prev_linestart = i;
                    i += r.numChars;
                }
                find.firstChar = i;
                find.length = 0;
                find.prevFirst = prev_linestart;
            }
            return;
        }
        // cursor is not at end of buffer,
        // search rows to find the one that straddles character n
        find.y = 0;
        while(i < str.Length())
        {
            this.layoutRow(r, str, i);
            if (n < i + r.numChars)
              break;
            prev_linestart = i;
            i += r.numChars;
            find.y += r.baselineYDelta;
        }

        find.firstChar = i;
        find.length = r.numChars;
        find.height = r.ymax - r.ymin;
        find.prevFirst = prev_linestart;

        // now scan to find xpos
        find.x = 0;
        for (i=0; find.firstChar+i < n; ++i)
           find.x += this.getWidth(str, find.firstChar, i);
    }

    // delete characters while updating undo
    delete(str, where, len)
    {
        this.undoMgr.TrackDelete(str, where, len);
        str.DeleteChars(where, len); //
        this.preferredX = null;
    }

    // delete the selection
    deleteSelection(str)
    {
        this.ClampCursor(str);
        if (this.HasSelection())
        {
            if (this.SelectStart < this.SelectEnd)
            {
                this.delete(str, this.SelectStart, this.SelectEnd - this.SelectStart);
                this.SelectEnd = this.Cursor = this.SelectStart;
            }
            else
            {
                this.delete(str, this.SelectEnd, this.SelectStart - this.SelectEnd);
                this.SelectStart = this.Cursor = this.SelectEnd;
            }
            this.preferredX = null;
        }
    }

    // canonicalize the selection so start <= end
    sortSelection()
    {
        if (this.SelectEnd < this.SelectStart)
        {
            let temp = this.SelectEnd;
            this.SelectEnd = this.SelectStart;
            this.SelectStart = temp;
        }
    }

    // move cursor to first character of selection
    moveToFirst()
    {
        if (this.HasSelection())
        {
            this.sortSelection();
            this.Cursor = this.SelectStart;
            this.SelectEnd = this.SelectStart;
            this.preferredX = null;
        }
    }

    // move cursor to last character of selection
    moveToLast(str)
    {
        if (this.HasSelection())
        {
            this.sortSelection();
            this.ClampCursor(str);
            this.Cursor = this.SelectEnd;
            this.SelectStart = this.SelectEnd;
            this.preferredX = null;
        }
    }

}