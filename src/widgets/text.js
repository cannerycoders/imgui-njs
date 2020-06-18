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
import {ValRef, Vec2, Rect, MutableString} from "../types.js";
import {FormatValues} from "../datatype.js";
import {ItemFlags} from "../flags.js";
import {ButtonFlags} from "./button.js";

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
    AsHyperText: 1 << 19,  
    UseLabelWidth: 1 << 20, // defer to Style for width text
    // [Internal]
    Multiline: 1 << 21   // For internal use by InputTextMultiline()
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

    Set(f)
    {
        this.filter.Set(f);
        this.updateRegexp();
    }

    Get()
    {
        return this.filter.Get();
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
            this.updateRegexp();
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

    updateRegexp()
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

    IsActive()
    {
        return this.filter.Length() > 0;
    }

    PassFilter(input)
    {
        if(this.filter.Length() > 0 && this.regexp)
        {
            if(input)
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
            }
            else
            if(this.filter.Get() == "<undefined>" ||
               this.filter.Get() == "<unknown>")
                return true;
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

    HyperMenu(txt, flags=0)
    {
        let fields = txt.split("##");
        txt = fields[0] + " " + this.guictx.Style._UIcons.SmallDownArrow;
        if(fields.length == 2)
            txt += "##" + fields[1];
        return this.HyperText(txt, flags);
    },

    HyperText(txt, txtflags=0, buttonflags=0)
    {
        return this.textEx(txt, txtflags|
                        TextFlags.NoWidthForLargeClippedText|
                        TextFlags.AsHyperText,
                        buttonflags
                        );
    },

    TextUnformatted(txt, flags=0)
    {
        this.textEx(txt, flags|TextFlags.NoWidthForLargeClippedText);
    },

    Text(fmt, ...args)
    {
        return this.TextV(fmt, args);
    },

    TextV(fmt, args)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        let str = this.formatText(fmt, args);
        return this.textEx(str, TextFlags.NoWidthForLargeClippedText);
    },

    TextColored(col, fmt, ...args)
    {
        return this.TextColoredV(col, fmt, args);
    },

    TextColoredV(col, fmt, args)
    {
        this.PushStyleColor("Text", col);
        let ret = this.TextV(fmt, args);
        this.PopStyleColor();
        return ret;
    },

    TextDisabled(fmt, ...args)
    {
        return this.TextDisabledV(fmt, args);
    },

    TextDisabledV(fmt, args)
    {
        this.PushStyleColor("Text", this.guictx.Style.Colors.TextDisabled);
        let ret = this.TextV(fmt, args);
        this.PopStyleColor();
        return ret;
    },

    TextEmphasized(fmt, ...args)
    {
        return this.TextEmphasizedV(fmt, args);
    },

    TextEmphasizedV(fmt, args)
    {
        this.PushStyleColor("Text", this.guictx.Style.Colors.TextEmphasized);
        let ret = this.TextV(fmt, args);
        this.PopStyleColor();
        return ret;
    },

    TextWrapped(fmt, ...args)
    {
        return this.TextWrappedV(fmt, args);
    },

    TextWrappedV(fmt, args)
    {
        let need_backup = (this.guictx.CurrentWindow.DC.TextWrapPos < 0);
        if (need_backup)
        {
            // Keep existing wrap position if one is already set
            this.PushTextWrapPos(0.);
        }
        let ret = this.TextV(fmt, args);
        if (need_backup)
            this.PopTextWrapPos();
        return ret;
    },

    // Add a text label that has vertical alignment equivalent to
    // input text.  Used to bypass labels on right behavior.
    // NB: this is easy to confuse with LabelText (below)

    LabelDisabled(label, txtflags=TextFlags.UseLabelWidth)
    {
        this.PushStyleColor("Text", this.guictx.Style.Colors.TextDisabled);
        this.Label(label, txtflags);
        this.PopStyleColor();
    },

    Label(label, txtflags=TextFlags.UseLabelWidth)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        let style = g.Style;
        let mtext = label;
        if(txtflags & TextFlags.UseLabelWidth)
            mtext = style.LabelWidth;

        // we cache results of CalcTextSize since it's expensive and
        // the number of labels is presumed limited.
        let key = mtext + g.Font.AsStr();
        if(!this.labelSizeCache) 
            this.labelSizeCache = {};
        let labelSize = this.labelSizeCache[key];
        if(!labelSize)
        {
            labelSize = this.CalcTextSize(mtext, false /*split before ## */);
            this.labelSizeCache[key] = labelSize; // a Vec2
        }
        const labelBB = new Rect(win.DC.CursorPos,
                                  Vec2.AddXY(win.DC.CursorPos,
                                    labelSize.x + style.FramePadding.x, 
                                    labelSize.y + style.FramePadding.y*2));
        /*
        // styleItemInnerSpacing
        const totalBB = new Rect(win.DC.CursorPos,
                                 Vec2.Add(
                                    Vec2.AddXY(win.DC.CursorPos,
                                        w + (labelSize.x > 0 ?
                                                style.ItemInnerSpacing.x : 0),
                                        style.FramePadding.y*2),
                                    labelSize));
        */
        this.itemSize(labelBB, style.FramePadding.y);
        if (!this.itemAdd(labelBB, 0))
            return;
        let tpos = new Vec2(labelBB.Min.x,
                            labelBB.Min.y + style.FramePadding.y);
        this.renderText(tpos, label); // clip?
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

        if(fmt)
        {
            // Render
            let valueTxt = this.formatText(fmt, args);
            this.renderTextClipped(value_bb.Min, value_bb.Max,
                                valueTxt, null, new Vec2(0.,0.5));
        }
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
        const line_height = Math.max(Math.min(win.DC.CurrentLineHeight,
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

    textEx(txt, flags, buttonflags=0)
    {
       let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let id;
        if(flags & TextFlags.AsHyperText)
        {
            id = win.GetID(txt);
            txt = txt.split("##")[0];
        }
        let ret = false;
        const text_pos = new Vec2(win.DC.CursorPos.x,
                            win.DC.CursorPos.y + win.DC.CurrentLineTextBaseOffset);
        const wrap_pos_x = win.DC.TextWrapPos;
        const wrap_enabled = flags&TextFlags.NoWidthForLargeClippedText ? false :
                                (wrap_pos_x >= 0.);
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
            let style = this.GetStyle();
            const wrap_width = wrap_enabled ?
                    this.calcWrapWidthForPos(win.DC.CursorPos, wrap_pos_x) :
                    0.0;
            let stxt = txt;
            if(flags & TextFlags.UseLabelWidth)
                stxt = style.LabelWidth;

            const text_size = this.CalcTextSize(stxt, false, wrap_width);
            let bb = new Rect(text_pos, Vec2.Add(text_pos, text_size));
            this.itemSize(text_size);
            if (!this.itemAdd(bb, 0))
                return ret;
            
            if(flags&TextFlags.AsHyperText)
            {
                let hovered = new ValRef(), held = new ValRef();
                if (win.DC.ItemFlags & ItemFlags.ButtonRepeat)
                    buttonflags |= ButtonFlags.Repeat;
                ret = this.ButtonBehavior(bb, id, hovered, held, buttonflags);
                if (ret)
                    this.markItemEdited(id);
                let disabled = buttonflags & ButtonFlags.Disabled;
                let stylenm = disabled ? "TextDisabled" :
                                (held.get() ? "LinkActive" : 
                                    (hovered.get() ? "LinkHovered" : "Link"));
                this.PushStyleColor("Text", style.GetColor(stylenm));
            }

            // Render (only expect ## in the AsHyperText case)
            this.renderTextWrapped(bb.Min, txt, wrap_width);
            if(flags&TextFlags.AsHyperText)
                this.PopStyleColor();
        }
        return ret;
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
