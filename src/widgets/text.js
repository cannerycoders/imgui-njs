//-------------------------------------------------------------------------
// [SECTION] Widgets: Text, etc.
//-------------------------------------------------------------------------
// - TextUnformatted()
// - Text()
// - TextV()
// - TextColored()
// - TextColoredV()
// - TextDisabled()
// - TextDisabledV()
// - TextWrapped()
// - TextWrappedV()
// - LabelText()
// - LabelTextV()
// - BulletText()
// - BulletTextV()
//-------------------------------------------------------------------------
import {Vec2, Rect, MutableString} from "../types.js";
import {FormatValues} from "../datatype.js";

export var TextFlags =
{
    None: 0,
    CharsDecimal: 1 << 0,   // Allow 0123456789.+-*/
    CharsHexadecimal: 1 << 1,   // Allow 0123456789ABCDEFabcdef
    CharsUppercase: 1 << 2,   // Turn a..z into A..Z
    CharsNoBlank: 1 << 3,   // Filter out spaces, tabs
    AutoSelectAll: 1 << 4,   // Select entire text when first taking mouse focus
    EnterReturnsTrue: 1 << 5,   // Return 'true' when Enter is pressed (as opposed to every time the value was modified). Consider looking at the IsItemDeactivatedAfterEdit() function.
    CallbackCompletion: 1 << 6,   // Callback on pressing TAB (for completion handling)
    CallbackHistory: 1 << 7,   // Callback on pressing Up/Down arrows (for history handling)
    CallbackAlways: 1 << 8,   // Callback on each iteration. User code may query cursor position, modify text buffer.
    CallbackCharFilter: 1 << 9,   // Callback on character inputs to replace or discard them. Modify 'EventChar' to replace or discard, or return 1 in callback to discard.
    AllowTabInput: 1 << 10,  // Pressing TAB input a '\t' character into the text field
    CtrlEnterForNewLine: 1 << 11,  // In multi-line mode, unfocus with Enter, add new line with Ctrl+Enter (default is opposite: unfocus with Ctrl+Enter, add line with Enter).
    NoHorizontalScroll: 1 << 12,  // Disable following the cursor horizontally
    AlwaysInsertMode: 1 << 13,  // Insert mode
    ReadOnly: 1 << 14,  // Read-only mode
    Password: 1 << 15,  // Password mode, display all characters as '*'
    NoUndoRedo: 1 << 16,  // Disable undo/redo. Note that input text owns the text data while active, if you want to provide your own undo/redo stack you need e.g. to call ClearActiveID().
    CharsScientific: 1 << 17,  // Allow 0123456789.+-*/eE (Scientific notation input)
    CallbackResize: 1 << 18,  // Callback on buffer capacity changes request (beyond 'buf_size' parameter value), allowing the string to grow. Notify when the string wants to be resized (for string types which hold a cache of their Size). You will be provided a new BufSize in the callback and NEED to honor it. (see misc/cpp/imgui_stdlib.h for an example of using this)
    // [Internal]
    Multiline: 1 << 20   // For internal use by InputTextMultiline()
};

// A text filter widget includes the filter value and is able to draw itself.
// The filter may be changed as a side-effect of calling Draw.
export class TextFilter
{
    constructor(imgui, defaultFilter="")
    {
        this.imgui = imgui;
        this.filter = new MutableString(defaultFilter);
        this.regexp = null;
        this.regexpErr = null;
    }

    Draw(label = "Filter", width=0, flags=0)
    {
        if (width != 0)
            this.imgui.PushItemWidth(width);
        let value_changed = this.imgui.InputText(label, this.filter, flags);
        if (width != 0)
            this.imgui.PopItemWidth();
        if(value_changed)
        {
            try
            {
                let r = new RegExp(this.filter.toString());
                this.regexp = r;
                this.regexpErr = null;
            }
            catch(err)
            {
                // report errors?
                this.regexpErr = err.message;
            }
        }
        if(this.regexpErr)
        {
            const style = this.imgui.guictx.Style;
            this.imgui.SameLine();
            this.imgui.PushFont(style.GetFont("Small"));
            this.imgui.TextColored(style.GetColor("TextError"), this.regexpErr);
            this.imgui.PopFont();
        }
        return value_changed;
    }

    IsActive()
    {
        return this.filter.Length() > 0;
    }

    PassFilter(input)
    {
        if(this.filter.Length() > 0 && this.regexp)
        {
            if(!Array.isArray(input))
                return this.regexp.test(input);
            else
            {
                for(let str of input)
                {
                    if(this.regexp.test(str))
                        return true;
                }
            }
            return false;
        }
        else
            return true;
    }

    Clear()
    {
        this.filter.Set("");
    }
}

export var ImguiTextMixin =
{
    GetTextLineHeight()
    {
        return this.guictx.FontLineHeight;
    },

    GetTextLineHeightWithSpacing()
    {
        return this.guictx.FontLineHeight + this.guictx.Style.ItemSpacing.y;
    },

    TextUnformatted(txt)
    {
        this.textEx(txt, TextFlags.NoWidthForLargeClippedText);
    },

    Text(fmt, ...args)
    {
        this.TextV(fmt, args);
    },

    TextV(fmt, args)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;
        let str = this.formatText(fmt, args);
        this.textEx(str, TextFlags.NoWidthForLargeClippedText);
    },

    TextColored(col, fmt, ...args)
    {
        this.TextColoredV(col, fmt, args);
    },

    TextColoredV(col, fmt, args)
    {
        this.PushStyleColor("Text", col);
        this.TextV(fmt, args);
        this.PopStyleColor();
    },

    TextDisabled(fmt, ...args)
    {
        this.TextDisabledV(fmt, args);
    },

    TextDisabledV(fmt, args)
    {
        this.PushStyleColor("Text", this.guictx.Style.Colors.TextDisabled);
        this.TextV(fmt, args);
        this.PopStyleColor();
    },

    TextWrapped(fmt, ...args)
    {
        this.TextWrappedV(fmt, args);
    },

    TextWrappedV(fmt, args)
    {
        let need_backup = (this.guictx.CurrentWindow.DC.TextWrapPos < 0);
        if (need_backup)
        {
            // Keep existing wrap position if one is already set
            this.PushTextWrapPos(0.);
        }
        this.TextV(fmt, args);
        if (need_backup)
            this.PopTextWrapPos();
    },

    textEx(txt, flags)
    {
       let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        const text_pos = new Vec2(win.DC.CursorPos.x,
                            win.DC.CursorPos.y + win.DC.CurrentLineTextBaseOffset);
        const wrap_pos_x = win.DC.TextWrapPos;
        const wrap_enabled = (wrap_pos_x >= 0.);
        if (txt.length > 2000 && !wrap_enabled)
        {
            // Long text!
            // Perform manual coarse clipping to optimize for long multi-line text
            // - From this point we will only compute the width of lines that are
            //   visible. Optimization only available when word-wrapping is disabled.
            // - We also don't vertically center the text within the line full
            //   height, which is unlikely to matter because we are likely the
            //   biggest and only item on the line.
            // - We use memchr(), pay attention that well optimized versions of
            //   those str/mem functions are much faster than a casually written
            //   loop.
            console.assert(0, "long text not implemented");
        }
        else
        {
            const wrap_width = wrap_enabled ?
                    this.calcWrapWidthForPos(win.DC.CursorPos, wrap_pos_x) :
                    0.0;
            const text_size = this.CalcTextSize(txt, false, wrap_width);

            let bb = new Rect(text_pos, Vec2.Add(text_pos, text_size));
            this.itemSize(text_size);
            if (!this.itemAdd(bb, 0))
                return;

            // Render (we don't hide text after ## in this end-user function)
            this.renderTextWrapped(bb.Min, txt, wrap_width);
        }
    },

    LabelText(label, fmt, ...args)
    {
        this.LabelTextV(label, fmt, args);
    },

    // Add a label+text combo aligned to other label+value widgets
    LabelTextV(label, fmt, args)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        let style = g.Style;
        const w = this.CalcItemWidth();
        const label_size = this.CalcTextSize(label, true);
        const value_bb = new Rect(win.DC.CursorPos,
                                  Vec2.AddXY(win.DC.CursorPos,
                                        w, label_size.y + style.FramePadding.y*2));
        const total_bb = new Rect(win.DC.CursorPos,
                                 Vec2.Add(
                                    Vec2.AddXY(win.DC.CursorPos,
                                        w + (label_size.x > 0 ?
                                                style.ItemInnerSpacing.x : 0),
                                        style.FramePadding.y*2),
                                    label_size));
        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, 0))
            return;

        // Render
        let valueTxt = this.formatText(fmt, args);
        this.renderTextClipped(value_bb.Min, value_bb.Max,
                                valueTxt, null, new Vec2(0.,0.5));
        if (label_size.x > 0)
        {
            this.renderText(
                new Vec2(value_bb.Max.x + style.ItemInnerSpacing.x,
                         value_bb.Min.y + style.FramePadding.y), label);
        }
    },

    BulletText(fmt, ...args)
    {
        this.BulletTextV(fmt, args);
    },

    // Text with a little bullet aligned to the typical tree node.
    BulletTextV(fmt, args)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        const style = g.Style;

        let text = this.formatText(fmt, args);
        const label_size = this.CalcTextSize(text, false);
        // Latch before ItemSize changes it
        const text_base_offset_y = Math.max(0, win.DC.CurrentLineTextBaseOffset);
        const line_height = Math.max(Math.min(win.DC.CurrentLineSize.y,
                                        g.FontLineHeight + g.Style.FramePadding.y*2),
                                    g.FontSize);
        // Empty text doesn't add padding
        const bb = new Rect(win.DC.CursorPos,
                            Vec2.AddXY(win.DC.CursorPos,
                                    g.FontSize + (label_size.x > 0 ?
                                        (label_size.x + style.FramePadding.x*2) : 0),
                                    Math.max(line_height, label_size.y)));
        this.itemSize(bb);
        if (!this.itemAdd(bb, 0))
            return;

        // Render
        this.renderBullet(Vec2.AddXY(bb.Min,
                                style.FramePadding.x + g.FontSize*0.5,
                                g.FontSize*0.5));
        this.renderText(Vec2.AddXY(bb.Min,
                                g.FontSize + style.FramePadding.x*2,
                                text_base_offset_y),
                        text, false);
    },

    formatNumber(n, radix=10, pad=0, pad_char="0")
    {
        return pad > 0 ?
            (pad_char.repeat(pad) + n.toString(radix)).substr(-pad) :
            n.toString(radix);
    },

    formatNumberDec(n, pad=0, pad_char="0")
    {
       return this.formatNumber(n, 10, pad, pad_char);
    },

    formatNumberHex(n, pad, pad_char="0")
    {
        return this.formatNumber(n, 16, pad, pad_char);
    },

    formatText(fmt, args)
    {
        return FormatValues(fmt, args);
    }

};  // end mixin