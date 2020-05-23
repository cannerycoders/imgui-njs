/* global App */
import {Axis, Dir, InputSource, Key,
        MouseCursor, NavInput} from "../enums.js";
import {ButtonFlags} from "./button.js";
import {DataType,DataTypeApplyOpFromText,DataTypeApplyOp,
        FormatValues} from "../datatype.js";
import {TextEditState, TextEditMetaKeys} from "./texteditState.js";
import {Vec2, Rect, MutableString} from "../types.js";

export var InputTextFlags =
{
    None: 0,
    CharsDecimal: 1 << 0,   // Allow 0123456789.+-*/
    CharsHexadecimal: 1 << 1,   // Allow 0123456789ABCDEFabcdef
    CharsUppercase: 1 << 2,   // Turn a..z into A..Z
    CharsNoBlank: 1 << 3,   // Filter out spaces, tabs
    AutoSelectAll: 1 << 4,   // Select entire text when first taking mouse focus
    EnterReturnsTrue: 1 << 5,
        // Return 'true' when Enter is pressed (as opposed to every time the
        // value was modified). Consider looking at the
        // IsItemDeactivatedAfterEdit() function.
    CallbackCompletion: 1 << 6,   // Callback on pressing TAB (for completion handling)
    CallbackHistory: 1 << 7,   // Callback on pressing Up/Down arrows (for history handling)
    CallbackAlways: 1 << 8,
        // Callback on each iteration. User code may query cursor position,
        // modify text buffer.
    CallbackCharFilter: 1 << 9,
        // Callback on character inputs to replace or discard them.
        // Modify 'EventChar' to replace or discard, or return 1 in callback to discard.
    AllowTabInput: 1 << 10,  // Pressing TAB input a '\t' character into the text field
    CtrlEnterForNewLine: 1 << 11,
        // In multi-line mode, unfocus with Enter, add new line with Ctrl+Enter
        // (default is opposite: unfocus with Ctrl+Enter, add line with Enter).
    NoHorizontalScroll: 1 << 12,  // Disable following the cursor horizontally
    AlwaysInsertMode: 1 << 13,  // Insert mode
    ReadOnly: 1 << 14,  // Read-only mode
    Password: 1 << 15,  // Password mode, display all characters as '*'
    NoUndoRedo: 1 << 16,
        // Disable undo/redo. Note that input text owns the text data while
        // active, if you want to provide your own undo/redo stack you need
        // e.g. to call clearActiveID().
    CharsScientific: 1 << 17,  // Allow 0123456789.+-*/eE (Scientific notation input)
    CallbackResize: 1 << 18,
        // Callback on buffer capacity changes request (beyond 'buf_size'
        // parameter value), allowing the string to grow. Notify when the string
        // wants to be resized (for string types which hold a cache of their
        // Size). You will be provided a new BufSize in the callback and NEED
        // to honor it. (see misc/cpp/imgui_stdlib.h for an example of using this)
    // [Internal] -----------------
    Multiline: 1 << 20   // For internal use by InputTextMultiline()
};

const ValidChars =
{
    Decimal: "0123456789.-+*/",
    Scientific: "0123456789.-+*/eE",
    Hex: "0123456789AaBbCcDdEeFf",
};

const MaxDisplayLength = 2 * 1024 * 1024; // 2M chars (seems like a lot!)o
let DOMTextEditing = null;  // in order to trigger mobile input, we expose 
                            // input text fields to the DOM.

// Internal state of the currently focused/edited text input box
// This is stored on guictx and valid for <= 1 active/focused text
// fields.
//
// javascript strings:
//      are internally utf-16
//      values are immutable
//
export class InputTextState // NB: contains TextEditState
{
    constructor(imgui)
    {
        this.imgui = imgui;
        this.ID = 0; // widget id owning the text state
        this.Text = null;
        this.TextIsValid = false;
        this.CurrentLen = 0;
        this.InitialText = null;
        this.ScrollX = 0.; // horizontal scrolling/offset
        this.EditState = new TextEditState(imgui);
        this.CursorAnim = 0.; // timer for cursor blink, reset on every user action so the cursor reappears immediately
        this.CursorFollow = false; // set when we want scrolling to follow the current cursor position (not always!)
        this.SelectedAllMouseLock = false;  // after a double-click to select all, we ignore further mouse drags to update selection

        // Temporarily set when active
        this.UserFlags = 0;
        this.UserCallback = null;
        this.UserCallbackData = null;

        if(DOMTextEditing == null)
            DOMTextEditing = App.IsMobileDevice(); // for debugging: || true;
    }

    Init(text)
    {
        if(text.IsMutable)
        {
            this.Text = text.Clone();
            this.InitialText = text.toString();
        }
        else
        {
            this.Text = new MutableString(text);
            this.InitialText = text;
        }
    }

    InitTextEdit(singleLine, fontScale) //
    {
        this.EditState.Init(singleLine, fontScale);
    }

    Update(imgui, id, frame, vis, multiline)
    {
        if(DOMTextEditing)
        {
            // InputTextState instances are shared accross multiple
            // inputtext fields. Update messages are delivered
            // to create as well as to hide our inputtext entry.
            // We have only a two DOM entriews, but only act on
            // the hide request if the hiding id is currently visible.
            if(!this.domElements) this.domElements = {};
            let eltype;
            if(multiline)
                eltype = "_multi";
            else
                eltype = "_single";
            let idstr = `imgui_inputtext${eltype}`;
            let domEl = this.domElements[eltype];
            if(vis)
            {
                let io = imgui.GetIO();
                if(!domEl)
                {
                    let style = imgui.GetStyle();
                    let bgcolor = style.GetColor("FrameBg").AsHashStr(true);
                    let txtcolor = style.GetColor("Text").AsStr();
                    let bordercolor = style.GetColor("Border").AsStr();
                    let rad = style.FrameRounding;
                    // make element child of canvas so absolute positioning is
                    // relative to its location.
                    if(multiline)
                        domEl = document.createElement("textarea");
                    else
                    {
                        domEl = document.createElement("input");
                        domEl.setAttribute("type", "text");
                    }
                    this.domElements[eltype] = domEl;
                    domEl.style.position = "absolute";
                    domEl.style.display = "inline";
                    domEl.style.backgroundColor = bgcolor;
                    domEl.style.color = txtcolor;
                    domEl.style.borderRadius = `${rad}px ${rad}px`;
                    domEl.style.borderWidth = ".5px";
                    domEl.style.borderColor = bordercolor;
                    // keypress doesn't work on android browser
                    // keyup only returns a keycode of 229 (buffer busy) 
                    // unless enter is pressed (13) because auto-correct, etc
                    domEl.onkeyup = (evt) => 
                    {
                        if(evt.keyCode == 13 && !multiline) // Enter
                        {
                            // Transfer text from domElement to our internal state.
                            // dismiss overlay.
                            // console.debug("yippee:" + domEl.value);
                            this.Text.Set(domEl.value);
                            domEl.blur();
                            domEl.style.display = "none";
                            imgui.FocusWindow(null);
                        }
                        else
                        {
                            // console.debug("hm:" + evt.keyCode);
                            if(multiline)
                                this.Text.Set(domEl.value);
                        }
                    };
                    document.body.appendChild(domEl);
                }
                domEl.setAttribute("id", idstr);
                let el = io.canvas;
                let top = el.offsetTop;
                let left = el.offsetLeft;
                while(el.offsetParent) 
                {
                    el = el.offsetParent;
                    top += el.offsetTop;
                    left += el.offsetLeft;
                }
                domEl.style.left = left + frame.Min.x + "px";
                domEl.style.top = top + frame.Min.y + "px";
                domEl.style.width = (frame.Max.x - frame.Min.x) + "px";
                domEl.style.height = (frame.Max.y - frame.Min.y) + "px";
                domEl.style.display = "inline";
                /*
                let s = domEl.style;
                console.debug("inputtext style\n" + 
                                `  left: ${s.left}\n` +
                                `  top: ${s.top}\n` +
                                `  width: ${s.width}\n` +
                                `  heigth: ${s.height}\n`);
                */
                domEl.value = this.Text.Get();
                domEl.focus();
            }
            else
            if(domEl && domEl.id == idstr)
                domEl.style.display = "none";
        }
    }

    CursorAnimReset()
    {
        // After a user-input the cursor stays on for a while without blinking
        this.CursorAnim = -0.3;
    }

    CursorClamp()
    {
        this.EditState.ClampCursor(this.Text);
    }

    Cut()
    {
        this.EditState.Cut(this.Text);
    }

    Paste(pasteTxt)
    {
        this.EditState.Paste(this.Text, pasteTxt);
    }

    HasSelection()
    {
        return this.EditState.HasSelection();
    }

    GetSelectedText()
    {
        return this.EditState.GetSelectedText(this.Text);
    }

    ClearSelection()
    {
        return this.EditState.ClearSelection();
    }

    SelectAll()
    {
        this.EditState.SelectAll(this.Text);
    }

    GetUndoAvailCount()
    {
        return this.EditState.GetUndoAvailCount();
    }

    GetRedoAvailCount()
    {
        return this.EditState.GetRedoAvailCount();
    }

    Click(x, y)
    {
        this.EditState.Click(this.Text, x, y);
    }

    Drag(x, y)
    {
        return this.EditState.Drag(this.Text, x, y);
    }

    OnKeyPressed(key)
    {
        this.EditState.Key(this.Text, key);
        this.CursorFollow = true;
        this.CursorAnimReset();
    }
}

// Shared state of InputText(), passed as an argument to your callback when a
// InputTextFlags.Callback* flag is used. The callback function should return
//  0 by default.
// Callbacks (follow a flag name and see comments in InputTextFlags declarations
//  for more details)
// - InputTextFlags.CallbackCompletion:  Callback on pressing TAB
// - InputTextFlags.CallbackHistory:     Callback on pressing Up/Down arrows
// - InputTextFlags.CallbackAlways:      Callback on each iteration
// - InputTextFlags.CallbackCharFilter:  Callback on character inputs to replace or discard them. Modify 'EventChar' to replace or discard, or return 1 in callback to discard.
// - InputTextFlags.CallbackResize:      Callback on buffer capacity changes request (beyond 'buf_size' parameter value), allowing the string to grow.
export class InputTextCallbackData
{
    constructor()
    {
        this.EventFlag = 0;
        this.Flags = 0; //  values passed into InputText
        this.UserData = null;

        // Arguments for the different callback events
        // - To modify the text buffer in a callback, prefer using the
        //   InsertChars() / DeleteChars() function. InsertChars() will take
        //   care of calling the resize callback if necessary.
        // - If you know your edits are not going to resize the underlying
        //   buffer allocation, you may modify the contents of 'Buf[]' directly.
        //   You need to update 'BufTextLen' accordingly (0 <= BufTextLen < BufSize)
        //   and set 'BufDirty'' to true so InputText can update its internal state.
        this.EventChar = 0; // Character input Read-write [CharFilter]
                            // Replace character with another one, or set to
                            // zero to drop. return 1 is equivalent to setting
                            // EventChar=0;
        this.EventKey = 0;   // Key pressed (Up/Down/TAB) Read-only [Completion,History]
        this.Text = null;    // Mutable Text instance (to internal state)
        this.TextDirty = false; // callback should signal dirty if Text changed
        this.CursorPos = 0;     // Read-write   // [Completion,History,Always]
        this.SelectionStart = 0; // Read-write
                                // [Completion,History,Always] == to SelectionEnd
                                // when no selection)
        this.SelectionEnd = 0;  // Read-write [Completion,History,Always]
    }

    // Helper method for text manipulation.
    // Use those function to benefit from the CallbackResize behaviors. Calling
    // those function reset the selection.
    ImGuiInputTextCallbackData()
    {
    }

    DeleteChars(pos, num)
    {

    }

    InsertChars(pos, text)
    {

    }

    HasSelection()
    {
        return this.SelectionStart != this.SelectionEnd;
    }
}

const IFmt = "%d";
const FFmt = "%.3f";
const DFmt = "%.6f";
const HFmt = "%.8x"; // XXX;b

export var ImguiInputMixin =
{
    InputText(label, mstr, flags=0, onEdit=null, editData=null, onChange=null)
    {
        console.assert(!(flags & InputTextFlags.Multiline)); // call InputTextMultiline()
        return this.inputTextEx(label, null, mstr, new Vec2(0,0), flags,
                        onEdit, editData, onChange);
    },

    InputTextMultiline(label, mstr, size, flags=0, onEdit=null, editData=null)
    {
        return this.inputTextEx(label, null, mstr, size,
                         flags|InputTextFlags.Multiline, onEdit, editData);
    },

    InputTextWithHint(label, hint, mstr, flags, onEdit, editData)
    {
        console.assert(!(flags & InputTextFlags.Multiline)); // call InputTextMultiline()
        return this.inputTextEx(label, hint, mstr, new Vec2(0,0), flags, onEdit, editData);
    },

    InputFloat(label, v, step=0, step_fast=0, format=null,
                flags=0, onChange)
    {
        if(format==null) format = FFmt;
        flags |= InputTextFlags.CharsScientific;
        return this.InputScalar(label, DataType.Float, v, step > 0 ? step : null,
                step_fast >0 ? step_fast : null, format, flags, onChange);
    },

    InputDouble(label, v, step=0, step_fast=0, format=null,
                flags=0, onChange)
    {
        if(format==null) format = DFmt;
        return this.InputFloat(label, v, step, step_fast, format, flags, onChange);
    },

    InputFloat2(label, v, format=null, flags=0, onChange)
    {
        if(format==null) format = FFmt;
        return this.InputScalarN(label, DataType.Float, v, 2, null, null,
                                format, flags, onChange);
    },

    InputFloat3(label, v, format=null, flags=0, onChange)
    {
        if(format==null) format = FFmt;
        return this.InputScalarN(label, DataType.Float, v, 3, null, null,
                                format, flags, onChange);
    },

    InputFloat4(label, v, format=null, flags=0, onChange)
    {
        if(format==null) format = FFmt;
        return this.InputScalarN(label, DataType.Float, v, 4, null, null,
                                format, flags, onChange);
    },

    InputInt(label, v, step=1, step_fast=100, flags=0, onChange)
    {
        // Hexadecimal input provided as a convenience but the flag name is
        // awkward. Typically you'd use InputText() to parse your own data, if
        // you want to handle prefixes.
        const format = (flags & InputTextFlags.CharsHexadecimal) ? HFmt : IFmt;
        return this.InputScalar(label, DataType.S32, v, step>0 ? step : null,
                    step_fast >0 ? step_fast : null, format, flags, onChange);
    },

    InputInt2(label, v, flags=0, onChange)
    {
        return this.InputScalarN(label, DataType.S32, v, 2, null, null,
                                IFmt, flags, onChange);
    },

    InputInt3(label, v, flags=0, onChange)
    {
        return this.InputScalarN(label, DataType.S32, v, 3, null, null,
                                IFmt, flags, onChange);
    },

    InputInt4(label, v, flags=0, onChange)
    {
        return this.InputScalarN(label, DataType.S32, v, 4, null, null,
                                IFmt, flags, onChange);
    },

    InputScalarN(label, data_type, v, nch, step, step_fast, fmt,
                flags, onChange)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let  g = this.guictx;
        let value_changed = false;
        this.BeginGroup();
        this.PushID(label);
        this.pushMultiItemsWidths(nch, this.getNextItemWidth());
        for (let i=0; i < nch; i++)
        {
            this.PushID(i);
            value_changed |= this.InputScalar("", data_type, v[i], step, step_fast,
                                            fmt, flags, function(newval) {
                                                v[i] = newval;
                                            });
            this.SameLine(0, g.Style.ItemInnerSpacing.x);
            this.PopID();
            this.PopItemWidth();
        }
        this.PopID();
        this.textEx(label.split("##")[0]);
        this.EndGroup();
        if(value_changed && onChange)
            onChange(v);
        return value_changed;
    },

    InputScalar(label, data_type, v, step, step_fast, format=null,
                flags=0, onChange=null)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let g = this.guictx;
        let style = g.Style;
        if (format == null)
            format = (data_type == DataType.Float) ? FFmt : IFmt;
        let buf = FormatValues(format, [v]); // import from dataype.js
        let value_changed = false;
        if ((flags & (InputTextFlags.CharsHexadecimal |
                      InputTextFlags.CharsScientific)) == 0)
            flags |= InputTextFlags.CharsDecimal;
        flags |= InputTextFlags.AutoSelectAll;
        let origStr = g.InputTextState.InitialText;
        if (step != null && step != 0)
        {
            const button_size = this.GetFrameHeight();

            // The only purpose of the group here is to allow the caller to
            // query item data e.g. IsItemActive()
            this.BeginGroup();
            this.PushID(label);
            this.SetNextItemWidth(Math.max(1,
                    this.getNextItemWidth() - (button_size + style.ItemInnerSpacing.x) * 2));
            this.InputText("", buf, flags, null, null, function(newval)
            {
                value_changed = DataTypeApplyOpFromText(newval, origStr, data_type, format,
                                            (newval) => { buf = newval; });
            });
            // PushId(label) + "" gives us the expected ID from outside point of view

            // Step buttons
            const backup_frame_padding = style.FramePadding.Clone();
            style.FramePadding.x = style.FramePadding.y;
            let button_flags = ButtonFlags.Repeat | ButtonFlags.DontClosePopups;
            if (flags & InputTextFlags.ReadOnly)
                button_flags |= ButtonFlags.Disabled;
            this.SameLine(0, style.ItemInnerSpacing.x);
            if (this.ButtonEx("-", new Vec2(button_size, button_size), button_flags))
            {
                buf = DataTypeApplyOp(data_type, "-", buf,
                                    g.IO.KeyCtrl && step_fast ? step_fast : step);
                value_changed = true;
            }
            this.SameLine(0, style.ItemInnerSpacing.x);
            if (this.ButtonEx("+", new Vec2(button_size, button_size), button_flags))
            {
                buf = DataTypeApplyOp(data_type, "+", buf,
                                    g.IO.KeyCtrl && step_fast ? step_fast : step);
                value_changed = true;
            }
            this.SameLine(0, style.ItemInnerSpacing.x);
            this.textEx(label.split("##")[0]);
            style.FramePadding = backup_frame_padding;
            this.PopID();
            this.EndGroup();
        }
        else
        {
            this.InputText(label, buf, flags, null, null, function(newval)
                {
                    value_changed = DataTypeApplyOpFromText(
                                        newval, origStr, data_type, format,
                                        (newval) => buf = newval);
                });
        }

        if(value_changed && onChange)
            onChange(buf);

        return value_changed;
    },

    // Create text input in place of an active drag/slider (used when doing
    // a CTRL+Click on drag/slider widgets)
    inputScalarAsWidgetReplacement(bb, id, label, datatype, val, format)
    {
        // IM_UNUSED(id);
        let g = this.guictx;

        // On the first frame, g.ScalarAsInputTextId == 0, then on subsequent
        // frames it becomes == id. We clear ActiveID on the first frame to
        // allow the InputText() taking it back.
        if (g.ScalarAsInputTextId == 0)
            this.clearActiveID();

        console.assert(0, "implement me");
        /*  WIP
        let fmt_buf[32];
        char data_buf[32];
        let format = ImParseFormatTrimDecorations(format, fmt_buf, IM_ARRAYSIZE(fmt_buf));
        DataTypeFormatString(data_buf, IM_ARRAYSIZE(data_buf), data_type, data_ptr, format);
        ImStrTrimBlanks(data_buf);
        ImGuiInputTextFlags flags = ImGuiInputTextFlags_AutoSelectAll | ((data_type == ImGuiDataType_Float || data_type == ImGuiDataType_Double) ? ImGuiInputTextFlags_CharsScientific : ImGuiInputTextFlags_CharsDecimal);
        bool value_changed = InputTextEx(label, NULL, data_buf, IM_ARRAYSIZE(data_buf), bb.GetSize(), flags);
        if (g.ScalarAsInputTextId == 0)
        {
            // First frame we started displaying the InputText widget, we expect it to take the active id.
            IM_ASSERT(g.ActiveId == id);
            g.ScalarAsInputTextId = g.ActiveId;
        }
        if (value_changed)
            return DataTypeApplyOpFromText(data_buf, g.InputTextState.InitialTextA.Data, data_type, data_ptr, NULL);
        */
        return false;
    },

    // Edit a string of text
    // - When active, hold on a privately held copy of the text (and apply
    // back to 'buf'). So changing 'buf' while the InputText is active has
    // no effect.
    inputTextEx(label, hint, val, size_arg, flags, onEdit, editData, onChange)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        // Can't use both together (they both use up/down keys)
        console.assert(!((flags & InputTextFlags.CallbackHistory) &&
                         (flags & InputTextFlags.Multiline)));
        // Can't use both together (they both use tab key)
        console.assert(!((flags & InputTextFlags.CallbackCompletion) &&
                         (flags & InputTextFlags.AllowTabInput)));

        let g = this.guictx;
        let io = g.IO;
        const style = g.Style;
        const ismultiline = flags & InputTextFlags.Multiline;

        const RENDER_SELECTION_WHEN_INACTIVE = false;
        const is_multiline = (flags & InputTextFlags.Multiline) != 0;
        const is_readonly = (flags & InputTextFlags.ReadOnly) != 0;
        const is_password = (flags & InputTextFlags.Password) != 0;
        const is_undoable = (flags & InputTextFlags.NoUndoRedo) == 0;
        const is_resizable = (flags & InputTextFlags.CallbackResize) != 0;

        // Must provide a callback when InputTextFlags.CallbackResize
        if (is_resizable)
            console.assert(onEdit != null);

        // Open group before calling GetID() because groups tracks id
        // created within their scope,
        if (is_multiline)
            this.BeginGroup();
        const id = win.GetID(label);
        const label_size = this.CalcTextSize(label, true);
        // Arbitrary default of 8 lines high for multi-line
        let size = this.calcItemSize(size_arg, this.getNextItemWidth(),
                    (is_multiline ? this.GetTextLineHeight() * 8. : label_size.y) +
                        style.FramePadding.y*2);
        const frame_bb = new Rect(win.DC.CursorPos, Vec2.Add(win.DC.CursorPos, size));
        const total_bb = new Rect(frame_bb.Min,
                                Vec2.AddXY(frame_bb.Max,
                                    label_size.x > 0 ? (style.ItemInnerSpacing.x + label_size.x) : 0,
                                    0));

        let draw_window = win;
        if (is_multiline)
        {
            if (!this.itemAdd(total_bb, id, frame_bb))
            {
                this.itemSize(total_bb, style.FramePadding.y);
                this.EndGroup();
                return false;
            }
            if (!this.BeginChildFrame(id, frame_bb.GetSize()))
            {
                this.EndChildFrame();
                this.EndGroup();
                return false;
            }
            draw_window = this.getCurrentWindow();
            // This is to ensure that EndChild() will display a navigation highlight
            draw_window.DC.NavLayerActiveMaskNext |= draw_window.DC.NavLayerCurrentMask;
            size.x -= draw_window.ScrollbarSizes.x;
        }
        else
        {
            this.itemSize(total_bb, style.FramePadding.y);
            if (!this.itemAdd(total_bb, id, frame_bb))
                return false;
        }
        const hovered = this.itemHoverable(frame_bb, id);
        if (hovered)
        {
            g.MouseCursor = MouseCursor.TextInput;
            // console.log("hovered");
        }

        // NB: we are only allowed to access 'edit_state' if we are the active widget.
        let istate = null;
        if (g.InputTextState.ID == id)
            istate = g.InputTextState;

        const focus_requested = this.focusableItemRegister(win, id);
        const focus_requested_by_code = focus_requested &&
                                (g.FocusRequestCurrWindow == win &&
                                g.FocusRequestCurrCounterAll == win.DC.FocusCounterAll);
        const focus_requested_by_tab = focus_requested && !focus_requested_by_code;

        const user_clicked = hovered && io.MouseClicked[0];
        const user_nav_input_start = (g.ActiveId != id) &&
                                      ((g.NavInputId == id) ||
                                        (g.NavActivateId == id &&
                                         g.NavInputSource == InputSource.NavKeyboard));
        const user_scroll_finish = is_multiline && istate != null && g.ActiveId == 0 &&
                g.ActiveIdPreviousFrame == this.getScrollbarID(draw_window, Axis.Y);
        const user_scroll_active = is_multiline && istate != null &&
                    g.ActiveId == this.getScrollbarID(draw_window, Axis.Y);

        let clear_active_id = false;
        let select_all = (g.ActiveId != id) &&
            ((flags & InputTextFlags.AutoSelectAll) != 0 || user_nav_input_start)
                && (!is_multiline);

        const init_make_active = (focus_requested || user_clicked ||
                                user_scroll_finish || user_nav_input_start);
        const init_state = (init_make_active || user_scroll_active);
        if (init_state && g.ActiveId != id)
        {
            // Access state even if we don't own it yet.
            istate = g.InputTextState;
            istate.CursorAnimReset();

            // Take a copy of the initial value. From the moment we focused we are
            // ignoring the content of 'buf' (unless we are in read-only mode)
            istate.Init(val);

            // Preserve cursor position and undo/redo stack if we come back to
            // same widget FIXME: For non-readonly widgets we might be able to
            // require that TextIsValid && Text == val ? (untested) and
            // discard undo stack if user buffer has changed.
            const recycle_state = (istate.ID == id);
            if (recycle_state)
            {
                // Recycle existing cursor/selection/undo stack but clamp position
                // Note a single mouse click will override the cursor/position
                // immediately by calling stb_textedit_click handler.
                istate.CursorClamp();
            }
            else
            {
                istate.ID = id;
                istate.ScrollX = 0;
                istate.InitTextEdit(!is_multiline);
                if (!is_multiline && focus_requested_by_code)
                    select_all = true;
            }
            istate.EditState.InsertMode = (flags & InputTextFlags.AlwaysInsertMode);
            if (!is_multiline && (focus_requested_by_tab || (user_clicked && io.KeyCtrl)))
                select_all = true;
        }

        if (g.ActiveId != id && init_make_active)
        {
            console.assert(istate && istate.ID == id);
            this.setActiveID(id, win);
            this.setFocusID(id, win);
            this.FocusWindow(win);
            istate.Update(this, id, frame_bb, true, ismultiline);
            console.assert(NavInput.COUNT < 32);
            g.ActiveIdBlockNavInputFlags = (1 << NavInput.Cancel);
            if (flags & (InputTextFlags.CallbackCompletion | InputTextFlags.AllowTabInput))
            {
                // Disable keyboard tabbing out as we will use the \t character.
                g.ActiveIdBlockNavInputFlags |= (1 << NavInput.KeyTab);
            }
            if (!is_multiline && !(flags & InputTextFlags.CallbackHistory))
                g.ActiveIdAllowNavDirFlags = ((1 << Dir.Up) | (1 << Dir.Down));
            if(App.IsMobileDevice() || true)
            {
                // console.log(`make active ${frame_bb.Min.x}, ${frame_bb.Min.y}`);
            }
        }

        // We have an edge case if ActiveId was set through another widget (e.g.
        // widget being swapped), clear id immediately (don't wait until the end
        // of the function)
        if (g.ActiveId == id && istate == null)
            this.clearActiveID();

        // Release focus when we click outside
        if (g.ActiveId == id && io.MouseClicked[0] && !init_state && !init_make_active) //-V560
            clear_active_id = true;

        // Lock the decision of whether we are going to take the path displaying
        // the cursor or selection
        const render_cursor = (g.ActiveId == id) || (istate && user_scroll_active);
        let render_selection = istate && istate.HasSelection() &&
                               (RENDER_SELECTION_WHEN_INACTIVE || render_cursor);
        let value_changed = false;
        let enter_pressed = false;
        let enter_returns_true = (flags & InputTextFlags.EnterReturnsTrue) != 0;

        // When read-only we always use the live data passed to the function
        // FIXME-OPT: Because our selection/cursor code currently needs the
        // wide text we need to convert it when active, which is not ideal :(
        if (is_readonly && istate != null && (render_cursor || render_selection))
        {
            istate.Init(val);
            istate.CursorClamp();
            render_selection &= istate.HasSelection();
        }

        // Select the buffer to render.
        const val_display_from_state = (render_cursor || render_selection ||
                    g.ActiveId == id) && !is_readonly && istate && istate.TextIsValid;
        let is_displaying_hint = false;
        if(hint != null)
        {
            if(val_display_from_state)
                is_displaying_hint = (istate.Text.Length() == 0);
            else
                is_displaying_hint = (val.Length() == 0);
        }
        // k(hint != null && (buf_display_from_state ? state->TextA.Data : buf)[0] == 0);

        // Password pushes a temporary font with only a fallback glyph
        if (is_password && !is_displaying_hint)
        {
            this.PushFont(g.InputTextPasswordFont);
        }

        // Process mouse inputs and character inputs
        if (g.ActiveId == id)
        {
            console.assert(istate != null);
            istate.UserFlags = flags;
            istate.UserCallback = onEdit;
            istate.UserCallbackData = editData;

            // Although we are active we don't prevent mouse from hovering other
            // elements unless we are interacting right now with the widget.
            // Down the line we should have a cleaner library-wide concept of
            // Selected vs Active.
            g.ActiveIdAllowOverlap = !io.MouseDown[0];
            g.WantTextInputNextFrame = 1;

            // Edit in progress
            const mouse_x = (io.MousePos.x - frame_bb.Min.x - style.FramePadding.x) + istate.ScrollX;
            const mouse_y = is_multiline ? (io.MousePos.y - draw_window.DC.CursorPos.y - style.FramePadding.y)
                                        : (g.FontLineHeight*0.5);

            const is_osx = io.ConfigMacOSXBehaviors;
            if (select_all || (hovered && !is_osx && io.MouseDoubleClicked[0]))
            {
                istate.SelectAll();
                istate.SelectedAllMouseLock = true;
            }
            else
            if (hovered && is_osx && io.MouseDoubleClicked[0])
            {
                // Double-click select a word only, OS X style (by simulating keystrokes)
                istate.OnKeyPressed(TextEditMetaKeys.WordLeft);
                istate.OnKeyPressed(TextEditMetaKeys.WordRight | TextEditMetaKeys.Shift);
            }
            else
            if (io.MouseClicked[0] && !istate.SelectedAllMouseLock)
            {
                if (hovered)
                {
                    istate.Click(mouse_x, mouse_y);
                    istate.CursorAnimReset();
                }
            }
            else
            if (io.MouseDown[0] && !istate.SelectedAllMouseLock &&
                (io.MouseDelta.x != 0 || io.MouseDelta.y != 0.))
            {
                istate.Drag(mouse_x, mouse_y);
                istate.CursorAnimReset();
                istate.CursorFollow = true;
            }
            if (istate.SelectedAllMouseLock && !io.MouseDown[0])
                istate.SelectedAllMouseLock = false;

            // It is ill-defined whether the back-end needs to send a \t
            // character when pressing the TAB keys. Win32 and GLFW naturally
            // do it but not SDL.
            const ignore_char_inputs = (io.KeyCtrl && !io.KeyAlt) || (is_osx && io.KeySuper);
            if ((flags & InputTextFlags.AllowTabInput) &&
                this.isKeyPressedMap(Key.Tab) && !ignore_char_inputs &&
                !io.KeyShift && !is_readonly)
            {
                // Insert TAB (XXX?)
                let c = this.inputTextFilterChar("\t", flags, onEdit, editData);
                if (c)
                    istate.OnKeyPressed(c.charCodeAt(0));
            }

            // Process regular text input (before we check for Return because
            // using some IME will effectively send a Return?) We ignore CTRL
            // inputs, but need to allow ALT+CTRL as some keyboards
            // (e.g. German) use AltGR (which _is_ Alt+Ctrl) to input certain characters.
            if (io.InputKeyEvents.length > 0)
            {
                if (!ignore_char_inputs && !is_readonly && !user_nav_input_start)
                {
                    for (let n = 0; n < io.InputKeyEvents.length; n++)
                    {
                        // Insert character if they pass filtering
                        let evt = io.InputKeyEvents[n];
                        let key = evt.key; // May be "a", "A", "Tab"", "Escape",
                        let keyCode = evt.keyCode; // a _KEY_, not _CHAR_ code
                        if (keyCode == 9 && evt.shiftKey) // shift-tab
                            continue;
                        // skip all control and nav keys since we handle
                        // them below
                        if(evt.ctrlKey || evt.metaKey || evt.altKey)
                            continue;
                        if(io.NavKeys[key] != undefined)
                            continue;
                        let char = this.inputTextFilterChar(
                                            key, flags, onEdit, editData);
                        if (char)
                            istate.OnKeyPressed(char.charCodeAt(0));
                    }
                }
                // Consume all characters, even navkeys.
                io.InputKeyEvents.resize(0);
            }
        }

        // Process other shortcuts/key-presses
        let cancel_edit = false;
        if (g.ActiveId == id && !g.ActiveIdIsJustActivated && !clear_active_id)
        {
            console.assert(istate != null);
            const k_mask = (io.KeyShift ? TextEditMetaKeys.Shift : 0);
            const is_osx = io.ConfigMacOSXBehaviors;
            // OS X style: Shortcuts using Cmd/Super instead of Ctrl
            const is_shortcut_key = (is_osx ? (io.KeySuper && !io.KeyCtrl) :
                    (io.KeyCtrl && !io.KeySuper)) && !io.KeyAlt && !io.KeyShift;
            const is_osx_shift_shortcut = is_osx && io.KeySuper && io.KeyShift
                                            && !io.KeyCtrl && !io.KeyAlt;
            // OS X style: Text editing cursor movement using Alt instead of Ctrl
            const is_wordmove_key_down = is_osx ? io.KeyAlt : io.KeyCtrl;
            // OS X style: Line/Text Start and End using Cmd+Arrows instead of Home/End
            const is_startend_key_down = is_osx && io.KeySuper && !io.KeyCtrl && !io.KeyAlt;
            const is_ctrl_key_only = io.KeyCtrl && !io.KeyShift && !io.KeyAlt && !io.KeySuper;
            const is_shift_key_only = io.KeyShift && !io.KeyCtrl && !io.KeyAlt && !io.KeySuper;

            const is_cut   = ((is_shortcut_key && this.isKeyPressedMap(Key.X)) ||
                              (is_shift_key_only && this.isKeyPressedMap(Key.Delete)))
                            && !is_readonly && !is_password &&
                            (!is_multiline || istate.HasSelection());
            const is_copy  = ((is_shortcut_key && this.isKeyPressedMap(Key.C)) ||
                            (is_ctrl_key_only  && this.isKeyPressedMap(Key.Insert)))
                            && !is_password && (!is_multiline || istate.HasSelection());
            const is_paste = ((is_shortcut_key && this.isKeyPressedMap(Key.V)) ||
                            (is_shift_key_only && this.isKeyPressedMap(Key.Insert)))
                            && !is_readonly;
            const is_undo  = ((is_shortcut_key && this.isKeyPressedMap(Key.Z)) &&
                            !is_readonly && is_undoable);
            const is_redo  = ((is_shortcut_key && this.isKeyPressedMap(Key.Y)) ||
                            (is_osx_shift_shortcut && this.isKeyPressedMap(Key.Z)))
                            && !is_readonly && is_undoable;

            if (this.isKeyPressedMap(Key.LeftArrow))
            {
                istate.OnKeyPressed((is_startend_key_down ? TextEditMetaKeys.LineStart :
                        is_wordmove_key_down ? TextEditMetaKeys.WordLeft :
                        TextEditMetaKeys.Left) | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.RightArrow))
            {
                istate.OnKeyPressed((is_startend_key_down ?
                        TextEditMetaKeys.LineEnd : is_wordmove_key_down ?
                        TextEditMetaKeys.WordRight :
                        TextEditMetaKeys.Right) | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.UpArrow) && is_multiline)
            {
                if (io.KeyCtrl)
                    draw_window.SetWindowScrollY(Math.max(draw_window.Scroll.y - g.FontLineHeight, 0.));
                else
                    istate.OnKeyPressed((is_startend_key_down ?
                            TextEditMetaKeys.TextStart :
                            TextEditMetaKeys.Up) | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.DownArrow) && is_multiline)
            {
                if (io.KeyCtrl)
                    draw_window.SetWindowScrollY(Math.max(draw_window.Scroll.y + g.FontLineHeight,
                                                                this.GetScrollMaxY()));
                else
                    istate.OnKeyPressed((is_startend_key_down ?
                            TextEditMetaKeys.TextEnd :
                            TextEditMetaKeys.Down) | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.Home))
            {
                istate.OnKeyPressed(io.KeyCtrl ?
                    (TextEditMetaKeys.TextStart | k_mask) :
                    (TextEditMetaKeys.LineStart | k_mask));
            }
            else
            if (this.isKeyPressedMap(Key.End))
            {
                istate.OnKeyPressed(io.KeyCtrl ?
                    (TextEditMetaKeys.TextEnd | k_mask) :
                    (TextEditMetaKeys.LineEnd | k_mask));
            }
            else
            if (this.isKeyPressedMap(Key.Delete) && !is_readonly)
            {
                istate.OnKeyPressed(TextEditMetaKeys.Delete | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.Backspace) && !is_readonly)
            {
                if (!istate.HasSelection())
                {
                    if (is_wordmove_key_down)
                        istate.OnKeyPressed(TextEditMetaKeys.WordLeft|
                                           TextEditMetaKeys.Shift);
                    else
                    if (is_osx && io.KeySuper && !io.KeyAlt && !io.KeyCtrl)
                        istate.OnKeyPressed(TextEditMetaKeys.LineStart|
                                           TextEditMetaKeys.Shift);
                }
                istate.OnKeyPressed(TextEditMetaKeys.Backspace | k_mask);
            }
            else
            if (this.isKeyPressedMap(Key.Enter))
            {
                let ctrl_nl = (flags & InputTextFlags.CtrlEnterForNewLine) != 0;
                if (!is_multiline || (ctrl_nl && !io.KeyCtrl) ||
                    (!ctrl_nl && io.KeyCtrl))
                {
                    enter_pressed = clear_active_id = true;
                }
                else
                if (!is_readonly)
                {
                    let c = this.inputTextFilterChar("\n", flags, onEdit, editData);
                    if(c)
                        istate.OnKeyPressed(c.charCodeAt(0));
                }
            }
            else
            if (this.isKeyPressedMap(Key.Escape))
            {
                clear_active_id = cancel_edit = true;
            }
            else
            if (is_undo || is_redo)
            {
                istate.OnKeyPressed(is_undo ?
                    TextEditMetaKeys.Undo : TextEditMetaKeys.Redo);
                istate.ClearSelection();
            }
            else
            if (is_shortcut_key && this.isKeyPressedMap(Key.A))
            {
                istate.SelectAll();
                istate.CursorFollow = true;
            }
            else
            if (is_cut || is_copy)
            {
                // Cut, Copy
                const selTxt = istate.GetSelectedText();
                if(selTxt != null)
                    this.SetClipboardText(selTxt);
                if (is_cut)
                {
                    if (!istate.HasSelection())
                        istate.SelectAll();
                    istate.CursorFollow = true;
                    istate.Cut();
                }
            }
            else
            if (is_paste)
            {
                // NB: GetClipboardText is async
                this.GetClipboardText((clipboard) =>
                {
                    if (!clipboard || !clipboard.length)
                    {
                        console.debug("empty clipboard");
                        return;
                    }

                    // Filter pasted buffer
                    let clipFiltered = [];
                    for(let i=0;i<clipboard.length;i++)
                    {
                        let c = clipboard[i];
                        let code = c.charCodeAt(0);
                        if (code == 0)
                            break;
                        if (code >= 0x10000)
                            continue;
                        c = this.inputTextFilterChar(c, flags, onEdit, editData);
                        if(!c)
                            continue;
                        clipFiltered.push(c);
                    }
                    clipFiltered = clipFiltered.join("");
                    // If everything was filtered, ignore the pasting operation
                    if (clipFiltered.length > 0)
                    {
                        istate.Paste(clipFiltered);
                        istate.CursorFollow = true;
                    }
                });
            }

            // Update render selection flag after events have been handled, so
            // selection highlight can be displayed during the same frame.
            render_selection |= istate.HasSelection() &&
                            (RENDER_SELECTION_WHEN_INACTIVE || render_cursor);
        }

        // Process callbacks and apply result back to user's buffer.
        if (g.ActiveId == id)
        {
            console.assert(istate != null);
            let apply_new_text = null;
            if (cancel_edit)
            {
                // Restore initial value. Only return true if restoring to the
                // initial value changes the current buffer contents.
                if (!is_readonly && val != istate.InitialText)
                    apply_new_text = istate.InitialText;
            }

            // When using 'ImGuiInputTextFlags_EnterReturnsTrue' as a special
            // case we reapply the live buffer back to the input buffer before
            // clearing ActiveId, even though strictly speaking it wasn't
            // modified on this frame. If we didn't do that, code like
            // InputInt() with ImGuiInputTextFlags_EnterReturnsTrue would fail.
            // Also this allows the user to use InputText() with
            // InputTextFlags.EnterReturnsTrue without maintaining any user-side
            // storage.
            let apply_edit_back_to_user_buffer = !cancel_edit || 
                                    (enter_pressed && enter_returns_true);
            if (apply_edit_back_to_user_buffer)
            {
                // Apply new value immediately - copy modified buffer back
                // Note that as soon as the input box is active, the in-widget
                // value gets priority over any underlying modification of the
                // input buffer FIXME: We actually always render 'buf' when
                // calling DrawList->AddText, making the comment above incorrect.
                // FIXME-OPT: CPU waste to do this every time the widget is
                // active, should mark dirty state from the stb_textedit callbacks.
                if (!is_readonly)
                {
                    istate.TextIsValid = true;
                }

                // User callback
                if ((flags & (InputTextFlags.CallbackCompletion |
                             InputTextFlags.CallbackHistory |
                             InputTextFlags.CallbackAlways)) != 0)
                {
                    console.assert(onEdit != null || enter_returns_true);

                    // The reason we specify the usage semantic
                    // (Completion/History) is that Completion needs to disable
                    // keyboard TABBING at the moment.
                    let event_flag = 0;
                    let event_key = Key.COUNT;
                    if ((flags & InputTextFlags.CallbackCompletion) != 0 &&
                        this.isKeyPressedMap(Key.Tab))
                    {
                        event_flag = InputTextFlags.CallbackCompletion;
                        event_key = Key.Tab;
                    }
                    else
                    if ((flags & InputTextFlags.CallbackHistory) != 0 &&
                        this.isKeyPressedMap(Key.UpArrow))
                    {
                        event_flag = InputTextFlags.CallbackHistory;
                        event_key = Key.UpArrow;
                    }
                    else
                    if ((flags & InputTextFlags.CallbackHistory) != 0 &&
                        this.isKeyPressedMap(Key.DownArrow))
                    {
                        event_flag = InputTextFlags.CallbackHistory;
                        event_key = Key.DownArrow;
                    }
                    else
                    if (flags & InputTextFlags.CallbackAlways)
                        event_flag = InputTextFlags.CallbackAlways;

                    if (event_flag)
                    {
                        let callback_data = new InputTextCallbackData();
                        callback_data.EventFlag = event_flag;
                        callback_data.Flags = flags;
                        callback_data.UserData = editData;

                        callback_data.EventKey = event_key;
                        callback_data.Text = istate.Text;
                        callback_data.TextDirty = false;

                        callback_data.CursorPos = istate.EditState.Cursor;
                        callback_data.SelectionStart = istate.EditState.SelectionStart;
                        callback_data.SelectionEnd = istate.EditState.SelectionEnd;

                        // Call user code
                        if(onEdit)
                            onEdit(callback_data);
                        else
                        if(event_key == Key.Tab && enter_returns_true)
                        {
                            // or return true on Tab
                            enter_pressed = clear_active_id = true;
                        }

                        // Read back what user may have modified
                        console.assert(callback_data.Flags == flags);
                        istate.EditState.Cursor = callback_data.CursorPos;
                        istate.EditState.SelectionStart = callback_data.SelectionStart;
                        istate.EditState.SelectionEnd = callback_data.SelectionEnd;
                        if (callback_data.TextDirty)
                        {
                            istate.CursorAnimReset();
                        }
                    }
                }

                // Will copy result string if modified
                if (!is_readonly && !istate.Text.Equals(val))
                {
                    apply_new_text = istate.Text;
                }
            }

            // Copy result to user buffer
            if (apply_new_text)
            {
                // no resize event here...
                if(val.Copy != undefined)
                    val.Copy(apply_new_text); // otherwise, onchange is responsible
                value_changed = true;
            }

            // Clear temporary user storage
            istate.UserFlags = 0;
            istate.UserCallback = null;
            istate.UserCallbackData = null;
        }

        // Release active ID at the end of the function (so e.g. pressing
        // Return still does a final application of the value)
        if (clear_active_id && g.ActiveId == id)
        {
            this.clearActiveID();
            istate.Update(this, id, frame_bb, false, ismultiline);
        }

        // Render frame
        if (!is_multiline)
        {
            this.renderNavHighlight(frame_bb, id);
            this.renderFrame(frame_bb.Min, frame_bb.Max, style.GetColor("FrameBg"),
                            true, style.FrameRounding);
        }

        // Not using frame_bb.Max because we have adjusted size
        const clip_rect = Rect.FromXY(frame_bb.Min.x, frame_bb.Min.y,
                            frame_bb.Min.x + size.x, frame_bb.Min.y + size.y);

        let draw_pos = is_multiline ? draw_window.DC.CursorPos.Clone() :
                        Vec2.Add(frame_bb.Min, style.FramePadding);
        let text_size = Vec2.Zero();

        // val_display can either be str or MutableString
        let val_display = val_display_from_state ? istate.Text : val; //-V595
        let val_display_length=0;
        if (is_displaying_hint)
        {
            val_display = hint;
        }

        // Render text. We currently only render selection when the widget is
        // active or while scrolling. FIXME: We could remove the '&& render_cursor'
        // to keep rendering selection when inactive.
        if (render_cursor || render_selection)
        {
            console.assert(istate != null);

            // Render text (with cursor and selection)
            // This is going to be messy. We need to:
            // - Display the text (this alone can be more easily clipped)
            // - Handle scrolling, highlight selection, display cursor (those
            //   all requires some form of 1d->2d cursor position calculation)
            // - Measure text height (for scrollbar)
            // We are attempting to do most of that in **one main pass** to
            // minimize the computation cost (non-negligible for large amount
            //  of text) + 2nd pass for selection rendering (we could merge them
            //  by an extra refactoring effort)
            // FIXME: This should occur on val_display but we'd need to maintain
            //  cursor/select_start/select_end for UTF-8.
            let cursor_offset = new Vec2();
            let select_start_offset = new Vec2();

            {
                // Find line numbers straddling 'cursor' (slot 0) and
                // 'SelectStart' (slot 1) positions.
                let searches_input_offset = [ 0, 0 ];
                let searches_result_line_no = [ -1000, -1000 ];
                let searches_remaining = 0;
                if (render_cursor)
                {
                    searches_input_offset[0] = istate.EditState.Cursor;
                    searches_result_line_no[0] = -1;
                    searches_remaining++;
                }
                if (render_selection)
                {
                    searches_input_offset[1] = Math.min(istate.EditState.SelectStart,
                                                     istate.EditState.SelectEnd);
                    searches_result_line_no[1] = -1;
                    searches_remaining++;
                }

                // Iterate all lines to find our line numbers
                // In multi-line mode, we never exit the loop until all lines
                // are counted, so add one extra to the searches_remaining counter.
                searches_remaining += is_multiline ? 1 : 0;
                let line_count = 0;
                for (let i=0;i<istate.Text.Length();i++)
                {
                    if (istate.Text.IsNewline(i))
                    {
                        line_count++;
                        if (searches_result_line_no[0] == -1 &&
                            i >= searches_input_offset[0])
                        {
                            searches_result_line_no[0] = line_count;
                            if (--searches_remaining <= 0)
                                break;
                        }
                        if (searches_result_line_no[1] == -1 &&
                            i >= searches_input_offset[1])
                        {
                            searches_result_line_no[1] = line_count;
                            if (--searches_remaining <= 0)
                                break;
                        }
                    }
                }
                line_count++;
                if (searches_result_line_no[0] == -1)
                    searches_result_line_no[0] = line_count;
                if (searches_result_line_no[1] == -1)
                    searches_result_line_no[1] = line_count;

                // Calculate 2d position by finding the beginning of the line
                // and measuring distance
                let lineBegin = istate.Text.FindLineBegin(searches_input_offset[0]);
                cursor_offset.x = istate.EditState.CalcTextRunSize(istate.Text, lineBegin,
                                                searches_input_offset[0], true).x;
                cursor_offset.y = searches_result_line_no[0] * g.FontLineHeight;
                if (searches_result_line_no[1] >= 0)
                {
                    lineBegin = istate.Text.FindLineBegin(searches_input_offset[1]);
                    select_start_offset.x = istate.EditState.CalcTextRunSize(istate.Text,
                                                lineBegin, searches_input_offset[1],
                                                true).x;
                   select_start_offset.y = searches_result_line_no[1] * g.FontLineHeight;
                }

                // Store text height (note that we haven't calculated text width
                // at all, see GitHub issues #383, #1224)
                if (is_multiline)
                    text_size = new Vec2(size.x, line_count * g.FontLineHeight);
            }

            // Scroll
            if (render_cursor && istate.CursorFollow)
            {
                // Horizontal scroll in chunks of quarter width
                if (!(flags & InputTextFlags.NoHorizontalScroll))
                {
                    const scroll_increment_x = size.x * 0.25;
                    if (cursor_offset.x < istate.ScrollX)
                        istate.ScrollX = Math.floor(Math.max(0, cursor_offset.x - scroll_increment_x));
                    else
                    if (cursor_offset.x - size.x >= istate.ScrollX)
                        istate.ScrollX = Math.floor(cursor_offset.x - size.x + scroll_increment_x);
                }
                else
                {
                    istate.ScrollX = 0.;
                }

                // Vertical scroll
                if (is_multiline)
                {
                    let scroll_y = draw_window.Scroll.y;
                    if (cursor_offset.y - g.FontLineHeight < scroll_y)
                        scroll_y = Math.max(0, cursor_offset.y - g.FontLineHeight);
                    else
                    if (cursor_offset.y - size.y >= scroll_y)
                        scroll_y = cursor_offset.y - size.y;
                    // Manipulate cursor pos immediately avoid a frame of lag
                    draw_window.DC.CursorPos.y += (draw_window.Scroll.y - scroll_y);
                    draw_window.Scroll.y = scroll_y;
                    draw_pos.y = draw_window.DC.CursorPos.y;
                }

                istate.CursorFollow = false;
            }

            // Draw selection
            const draw_scroll = new Vec2(istate.ScrollX, 0);
            if (render_selection)
            {
                let text_selected_begin = Math.min(istate.EditState.SelectStart, istate.EditState.SelectEnd);
                let text_selected_end = Math.max(istate.EditState.SelectStart, istate.EditState.SelectEnd);

                // FIXME: current code flow mandate that render_cursor is always
                // true here, we are leaving the transparent one for tests.
                let bg_color = style.GetColor("TextSelectedBg",
                                            render_cursor ? 1 : 0.6);
                // FIXME: those offsets should be part of the style? they don't
                // play so well with multi-line selection.
                let bg_offy_up = is_multiline ? 0 : -1;
                let bg_offy_dn = is_multiline ? 0 : 2;
                let rect_pos = Vec2.Subtract(Vec2.Add(draw_pos, select_start_offset),
                                             draw_scroll);
                g.Font.MeasureBegin();
                for (let p = text_selected_begin; p < text_selected_end; )
                {
                    if (rect_pos.y > clip_rect.w + g.FontLineHeight)
                        break;
                    if (rect_pos.y < clip_rect.y)
                    {
                        //p = (const ImWchar*)wmemchr((const wchar_t*)p, '\n', text_selected_end - p);  // FIXME-OPT: Could use this when wchar_t are 16-bits
                        //p = p ? p + 1 : text_selected_end;
                        while (p < text_selected_end)
                        {
                            if(istate.Text.IsNewline(p++))
                                break;
                        }
                    }
                    else
                    {
                        let ret = istate.EditState.CalcTextRunSize(istate.Text,
                                                p, text_selected_end, true);
                        p = ret.lastIndex;
                        if (ret.x <= 0)
                            ret.x = Math.floor(g.Font.MeasureWidth(" ") * 0.5); // So we can see selected empty lines
                        let rect = new Rect(Vec2.AddXY(rect_pos, 0., bg_offy_up - g.FontLineHeight),
                                            Vec2.AddXY(rect_pos, ret.x, bg_offy_dn));
                        rect.ClipWith(clip_rect);
                        if (rect.Overlaps(clip_rect))
                            draw_window.DrawList.AddRectFilled(rect.Min, rect.Max, bg_color);
                    }
                    rect_pos.x = draw_pos.x - draw_scroll.x;
                    rect_pos.y += g.FontLineHeight;
                }
                g.Font.MeasureEnd();
            }

            // We test for 'val_display_max_length' as a way to avoid some
            // pathological cases (e.g. single-line 1 MB string) which would
            // make ImDrawList crash.
            if (is_multiline || val_display_length < MaxDisplayLength)
            {
                let col = style.GetColor(is_displaying_hint ? "TextDisabled" : "Text");
                let str = val_display.toString(); // to handle polymorphism
                draw_window.DrawList.AddText(str,
                                Vec2.Subtract(draw_pos, draw_scroll),
                                g.Font, g.FontLineHeight, col, 0,
                                is_multiline ? null : clip_rect);
            }

            // Draw blinking cursor
            if (render_cursor)
            {
                istate.CursorAnim += io.DeltaTime;
                let cursor_is_visible = (!g.IO.ConfigInputTextCursorBlink) ||
                            (istate.CursorAnim <= 0) ||
                            ((istate.CursorAnim % 1.2) <= 0.8);
                let cursor_screen_pos = Vec2.Subtract(Vec2.Add(draw_pos, cursor_offset),
                                                    draw_scroll);
                let cursor_screen_rect = Rect.FromXY(cursor_screen_pos.x,
                                            cursor_screen_pos.y - g.FontLineHeight + 0.5,
                                            cursor_screen_pos.x + 1.0,
                                            cursor_screen_pos.y - 1.5);
                if (cursor_is_visible && cursor_screen_rect.Overlaps(clip_rect))
                {
                    draw_window.DrawList.AddLine(cursor_screen_rect.Min,
                                        cursor_screen_rect.GetBL(),
                                        style.GetColor("Text"));
                }

                // Notify OS of text input position for advanced IME (-1 x
                // offset so that Windows IME can cover our cursor. Bit of an
                // extra nicety.)
                if (!is_readonly)
                    g.PlatformImePos = new Vec2(cursor_screen_pos.x - 1,
                                            cursor_screen_pos.y - g.FontLineHeight);
            }
        }
        else // !(render_cursor || render_selection)
        {
            // Render text only (no selection, no cursor)
            let str = val_display.toString();
            if (is_multiline)
            {
                // We don't need width
                text_size = new Vec2(size.x,
                                this.calcTextLineCount(val_display)*g.FontLineHeight);
            }
            else
                val_display_length = str ? str.length : 0;

            if (is_multiline || val_display_length < MaxDisplayLength)
            {
                let col = style.GetColor(is_displaying_hint ? "TextDisabled" : "Text");
                draw_window.DrawList.AddText(str, draw_pos, g.Font, g.FontLineHeight,
                            col, 0.0, is_multiline ? null : clip_rect);
            }
        }

        if (is_multiline)
        {
            // Always add room to scroll an extra line
            this.Dummy(Vec2.AddXY(text_size, 0., g.FontLineHeight));
            this.EndChildFrame();
            this.EndGroup();
        }

        if (is_password && !is_displaying_hint)
            this.PopFont();

        // Log as text
        if (g.LogEnabled && !(is_password && !is_displaying_hint))
            this.logRenderedText(draw_pos, val_display);

        if (label_size.x > 0)
            this.renderText(new Vec2(frame_bb.Max.x + style.ItemInnerSpacing.x,
                                     frame_bb.Min.y + style.FramePadding.y), label);

        if (value_changed)
        {
            this.markItemEdited(id);
            if(onChange)
                onChange(istate.Text.toString());
        }

        if ((flags & InputTextFlags.EnterReturnsTrue) != 0)
            return enter_pressed;
        else
            return value_changed;
    }, // end inputTextEx

    calcTextLineCount(mstr)
    {
        return mstr.CountLines();
    },

    // return null to discard a character, potentially replace
    // c with altc if requested.
    inputTextFilterChar(c, flags, onEdit, userdata)
    {
        // Filter non-printable (NB: isprint is unreliable! see #2467)
        let ccode = c.charCodeAt(0);
        if (ccode < 0x20)
        {
            let pass = false;
            pass |= (c == "\n" && (flags & InputTextFlags.Multiline));
            pass |= (c == "\t" && (flags & InputTextFlags.AllowTabInput));
            if (!pass)
                return null;
        }

        // Filter private Unicode range. GLFW on OSX seems to send private
        // characters for special keys like arrow keys (FIXME)
        if (ccode >= 0xE000 && ccode <= 0xF8FF)
            return null;

        // Generic named filters
        if (flags & (InputTextFlags.CharsDecimal | InputTextFlags.CharsHexadecimal |
                    InputTextFlags.CharsUppercase | InputTextFlags.CharsNoBlank |
                    InputTextFlags.CharsScientific))
        {
            if (flags & InputTextFlags.CharsDecimal)
            {
                if(ValidChars.Decimal.indexOf(c) == -1)
                    return null;
            }

            if (flags & InputTextFlags.CharsScientific)
            {
                if(ValidChars.Scientific.indexOf(c) == -1)
                    return null;
            }

            if (flags & InputTextFlags.CharsHexadecimal)
            {
                if(ValidChars.Hex.indexOf(c) == -1)
                    return null;
            }

            if (flags & InputTextFlags.CharsUppercase)
            {
                if (c >= "a" && c <= "z")
                {
                    c = c.toUpperCase();
                }
            }

            if (flags & InputTextFlags.CharsNoBlank)
            {
                if (/\s/.test(c))
                    return null;
            }
        }

        // Custom callback filter
        if (flags & InputTextFlags.CallbackCharFilter)
        {
            let callback_data = new InputTextCallbackData();
            callback_data.EventFlag = InputTextFlags.CallbackCharFilter;
            callback_data.EventChar = c;
            callback_data.Flags = flags;
            callback_data.UserData = userdata;
            if (onEdit(callback_data) != 0)
                return null;
            if (!callback_data.EventChar)
                return null;
            if(callback_data.EventChar != c)
            {
                c = callback_data.EventChar;
            }
        }
        return c;
    },

}; // end InputTextMixin