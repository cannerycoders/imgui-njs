import {HoveredFlags,ItemFlags} from "../flags.js";
import {DragDropFlags} from "../dragdrop.js";
import {InputReadMode, InputSource, NavInput, Dir} from "../enums.js";
import {Rect, Vec1, Vec2, ValRef} from "../types.js";
import {TextFlags} from "./text.js";

//-------------------------------------------------------------------------
// [SECTION] Widgets: Main
//-------------------------------------------------------------------------
// - ButtonBehavior() [Internal]
// - Button()
// - SmallButton()
// - InvisibleButton()
// - ArrowButton()
// - CloseButton() [Internal]
// - CollapseButton() [Internal]
// - Image()
// - ImageButton()
// - Checkbox()
// - CheckboxFlags()
// - RadioButton()
// - ProgressBar()
// - Bullet()

export var ButtonFlags =
{
    None: 0,
    Repeat: 1 << 0,   // hold to repeat
    PressedOnClickRelease: 1 << 1,   // return true on click + release on same item [DEFAULT if no PressedOn* flag is set]
    PressedOnClick: 1 << 2,   // return true on click (default requires click+release)
    PressedOnRelease: 1 << 3,   // return true on release (default requires click+release)
    PressedOnDoubleClick: 1 << 4,   // return true on double-click (default requires click+release)
    FlattenChildren: 1 << 5,   // allow interactions even if a child window is overlapping
    AllowItemOverlap: 1 << 6,   // require previous frame HoveredId to either match id or be null before being usable, use along with SetItemAllowOverlap()
    DontClosePopups: 1 << 7,   // disable automatically closing parent popup on press // [UNUSED]
    Disabled: 1 << 8,   // disable interactions
    AlignTextBaseLine: 1 << 9,   // vertically align button to match text baseline - ButtonEx() only // FIXME: Should be removed and handled by SmallButton(), not possible currently because of DC.CursorPosPrevLine
    NoKeyModifiers: 1 << 10,  // disable interaction if a key modifier is held
    NoHoldingActiveID: 1 << 11,  // don't set ActiveId while holding the mouse (ButtonFlags.PressedOnClick only)
    PressedOnDragDropHold: 1 << 12,  // press when held into while we are drag and dropping another item (used by e.g. tree nodes, collapsing headers)
    NoNavFocus: 1 << 13,   // don't override navigation focus when activated,
    Circle: 1 << 14,
    LongPress: 1 << 15, // only register release-click if held for 
                        //  greater than  IO.LongPressInterval, meaningful
                        // only if PressedOnClickRelease
};

export var Icons =
{
    RightArrow: String.fromCodePoint(0x25B6),
    RightArrow2: String.fromCodePoint(0x25BA),
    DownArrow: String.fromCodePoint(0x25BC),
    Hamburger: String.fromCodePoint(0x2630),
    Gear: String.fromCodePoint(0x2699),
};

export var ImguiButtonMixin =
{
    // out_hovered, out_held are either null or types.ValRef
    ButtonBehavior(bbox, id, out_hovered, out_held, flags=0)
    {
        let win = this.getCurrentWindow();
        let g = this.guictx;

        if (flags & ButtonFlags.Disabled)
        {
            if (out_hovered) out_hovered.set(false);
            if (out_held) out_held.set(false);
            if (g.ActiveId == id) this.clearActiveID();
            return false;
        }

        // Default behavior requires click+release on same spot
        if ((flags & (ButtonFlags.PressedOnClickRelease | ButtonFlags.PressedOnClick |
            ButtonFlags.PressedOnRelease | ButtonFlags.PressedOnDoubleClick)) == 0)
        {
            flags |= ButtonFlags.PressedOnClickRelease;
        }

        let backup_hovered_window = g.HoveredWindow;
        if ((flags & ButtonFlags.FlattenChildren) && g.HoveredRootWindow == win)
            g.HoveredWindow = win;

        let pressed = false;
        let hovered = this.itemHoverable(bbox, id);

        // Drag source doesn't report as hovered
        if (hovered && g.DragDropActive && g.DragDropPayload.SourceId == id &&
            !(g.DragDropSourceFlags & DragDropFlags.SourceNoDisableHover))
        {
            hovered = false;
        }

        // Special mode for Drag and Drop where holding button pressed for a long
        // time while dragging another item triggers the button
        if (g.DragDropActive && (flags & ButtonFlags.PressedOnDragDropHold) &&
            !(g.DragDropSourceFlags & DragDropFlags.SourceNoHoldToOpenOthers))
        {
            if (this.IsItemHovered(HoveredFlags.AllowWhenBlockedByActiveItem))
            {
                hovered = true;
                this.setHoveredID(id);
                // FIXME: Our formula for CalcTypematicPressedRepeatAmount() is fishy
                if (this.calcTypematicPressedRepeatAmount(g.HoveredIdTimer + 0.0001,
                                g.HoveredIdTimer + 0.0001 - g.IO.DeltaTime,
                                0.01, 0.70))
                {
                    pressed = true;
                    this.FocusWindow(win);
                }
            }
        }

        if ((flags & ButtonFlags.FlattenChildren) && g.HoveredRootWindow == win)
            g.HoveredWindow = backup_hovered_window;

        // AllowOverlap mode (rarely used) requires previous frame HoveredId to be null or to match. This allows using patterns where a later submitted widget overlaps a previous one.
        if (hovered && (flags & ButtonFlags.AllowItemOverlap) &&
            (g.HoveredIdPreviousFrame != id && g.HoveredIdPreviousFrame != 0))
        {
            hovered = false;
        }

        // Mouse
        if (hovered)
        {
            if (!(flags & ButtonFlags.NoKeyModifiers) ||
                (!g.IO.KeyCtrl && !g.IO.KeyShift && !g.IO.KeyAlt))
            {
                //                        | CLICKING        | HOLDING with ButtonFlags.Repeat
                // PressedOnClickRelease  |  <on release>*  |  <on repeat> <on repeat> .. (NOT on release)  <-- MOST COMMON! (*) only if both click/release were over bounds
                // PressedOnClick         |  <on click>     |  <on click> <on repeat> <on repeat> ..
                // PressedOnRelease       |  <on release>   |  <on repeat> <on repeat> .. (NOT on release)
                // PressedOnDoubleClick   |  <on dclick>    |  <on dclick> <on repeat> <on repeat> ..
                // FIXME-NAV: We don't honor those different behaviors.
                if ((flags & ButtonFlags.PressedOnClickRelease) && g.IO.MouseClicked[0])
                {
                    this.setActiveID(id, win);
                    if (!(flags & ButtonFlags.NoNavFocus))
                        this.setFocusID(id, win);
                    this.FocusWindow(win);
                }
                if (((flags & ButtonFlags.PressedOnClick) && g.IO.MouseClicked[0]) ||
                ((flags & ButtonFlags.PressedOnDoubleClick) && g.IO.MouseDoubleClicked[0]))
                {
                    pressed = true;
                    if (flags & ButtonFlags.NoHoldingActiveID)
                        this.clearActiveID();
                    else
                        this.setActiveID(id, win); // Hold on ID
                    this.FocusWindow(win);
                }
                // NB: PressedOnRelease registers a click even if the
                //  mouse-wasn't initially pressed here.
                if ((flags & ButtonFlags.PressedOnRelease) && g.IO.MouseReleased[0])
                {
                    // Repeat mode trumps <on release>
                    if(flags & ButtonFlags.LongPress)
                    {
                        pressed = g.IO.MouseDownDuration[0] >= g.IO.LongPressInterval;
                        // 
                    }
                    else
                    if (!((flags & ButtonFlags.Repeat) &&
                        g.IO.MouseDownDurationPrev[0] >= g.IO.KeyRepeatDelay))
                    {
                        pressed = true;
                    }
                    this.clearActiveID();
                }

                // 'Repeat' mode acts when held regardless of _PressedOn flags (see
                // table above). Relies on repeat logic of IsMouseClicked() but we
                // may as well do it ourselves if we end up exposing finer
                // RepeatDelay/RepeatRate settings.
                if ((flags & ButtonFlags.Repeat) && g.ActiveId == id &&
                    g.IO.MouseDownDuration[0] > 0. && this.IsMouseClicked(0, true))
                {
                    pressed = true;
                }
            }

            if (pressed)
                g.NavDisableHighlight = true;
        }

        // Gamepad/Keyboard navigation
        // We report navigated item as hovered but we don't set g.HoveredId to not interfere with mouse.
        if (g.NavId == id && !g.NavDisableHighlight && g.NavDisableMouseHover &&
            (g.ActiveId == 0 || g.ActiveId == id || g.ActiveId == win.MoveId))
        {
            hovered = true;
        }

        if (g.NavActivateDownId == id)
        {
            let nav_activated_by_code = (g.NavActivateId == id);
            let nav_activated_by_inputs = this.isNavInputPressed(NavInput.Activate,
                (flags & ButtonFlags.Repeat) ? InputReadMode.Repeat : InputReadMode.Pressed);
            if (nav_activated_by_code || nav_activated_by_inputs)
                pressed = true;
            if (nav_activated_by_code || nav_activated_by_inputs || g.ActiveId == id)
            {
                // Set active id so it can be queried by user via IsItemActive(), equivalent of holding the mouse button.
                g.NavActivateId = id; // This is so setActiveId assign a Nav source
                this.setActiveID(id, win);
                if ((nav_activated_by_code || nav_activated_by_inputs) &&
                    !(flags & ButtonFlags.NoNavFocus))
                {
                    this.setFocusID(id, win);
                }
                g.ActiveIdAllowNavDirFlags = (1 << Dir.Left) | (1 << Dir.Right) |
                                            (1 << Dir.Up) | (1 << Dir.Down);
            }
        }

        let held = false;
        if (g.ActiveId == id)
        {
            if (pressed)
                g.ActiveIdHasBeenPressed = true;
            if (g.ActiveIdSource == InputSource.Mouse)
            {
                if (g.ActiveIdIsJustActivated)
                    g.ActiveIdClickOffset = Vec2.Subtract(g.IO.MousePos, bbox.Min);
                if (g.IO.MouseDown[0])
                {
                    held = true;
                }
                else
                {
                    if (hovered && (flags & ButtonFlags.PressedOnClickRelease))
                    {
                        // Repeat mode trumps <on release>
                        if (!((flags & ButtonFlags.Repeat) &&
                            g.IO.MouseDownDurationPrev[0] >= g.IO.KeyRepeatDelay))
                        {
                            if (!g.DragDropActive)
                            {
                                if(flags & ButtonFlags.LongPress)
                                {
                                    if(g.IO.MouseDownDurationPrev[0] >= 
                                        g.IO.LongPressInterval)
                                    {
                                        pressed = true;
                                    }
                                }
                                else
                                    pressed = true;
                            }
                        }
                    }
                    this.clearActiveID();
                }
                if (!(flags & ButtonFlags.NoNavFocus))
                    g.NavDisableHighlight = true;
            }
            else
            if (g.ActiveIdSource == InputSource.Nav)
            {
                if (g.NavActivateDownId != id)
                    this.clearActiveID();
            }
        }

        if (out_hovered)
            out_hovered.set(hovered);
        if (out_held)
            out_held.set(held);
        return pressed;
    }, // End ButtonBehavior

    ButtonEx(label, size_arg=null, flags=0)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems) return false;

        let g = this.guictx;
        let style = g.Style;
        let id = win.GetID(label);
        let label_size = this.CalcTextSize(label, true); // Vec2
        let pos = win.DC.CursorPos;
        // Try to vertically align buttons that are smaller/have no padding so
        // that text baseline matches (bit hacky, since it shouldn't be a flag)
        if ((flags & ButtonFlags.AlignTextBaseLine) &&
            style.FramePadding.y < win.DC.CurrentLineTextBaseOffset)
        {
            pos.y += win.DC.CurrentLineTextBaseOffset - style.FramePadding.y;
        }
        let size = this.calcItemSize(size_arg ? size_arg : Vec2.Zero(),
                                    label_size.x + style.FramePadding.x * 2,
                                    label_size.y + style.FramePadding.y * 2);

        let bbox = new Rect(pos, Vec2.Add(pos, size));
        this.itemSize(size, style.FramePadding.y);
        if (!this.itemAdd(bbox, id))
            return false;

        if (win.DC.ItemFlags & ItemFlags.ButtonRepeat)
            flags |= ButtonFlags.Repeat;
        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bbox, id, hovered, held, flags);
        if (pressed)
            this.markItemEdited(id);

        // Render
        let col = style.GetColor((held.get() && hovered.get() ?
                        "ButtonActive" : hovered.get() ? "ButtonHovered" : "Button"));
        this.renderNavHighlight(bbox, id);
        if(flags & ButtonFlags.Circle)
        {
            let radius = .65*Math.max(label_size.x, label_size.y);
            let center = new Vec2(bbox.Min.x + radius, bbox.Min.y + radius);
            win.DrawList.AddCircleFilled(center, Math.max(2., radius), col);
        }
        else
            this.renderFrame(bbox.Min, bbox.Max, col, true, style.FrameRounding);
        this.renderTextClipped(Vec2.Add(bbox.Min, style.FramePadding),
                                Vec2.Subtract(bbox.Max, style.FramePadding),
                                label.split("##")[0], label_size, style.ButtonTextAlign,
                                bbox);
        return pressed;
    },

    // icons may be available in current font https://graphemica.com/
    Button(label, size_arg=null, flags=0)
    {
        return this.ButtonEx(label, size_arg, flags);
    },

    PopupButton(label, size_arg=null, flags=0)
    {
        let fields = label.split("##");
        label = fields[0] + " " + Icons.RightArrow;
        if(fields.length == 2)
            label += "##" + fields[1];
        return this.ButtonEx(label, size_arg, flags);
    },

    // Small buttons fits within text without additional vertical spacing.
    SmallButton(label, flags=ButtonFlags.AlignTextBaseLine)
    {
        let g = this.guictx;
        let backup_padding_y = g.Style.FramePadding.y;
        g.Style.FramePadding.y = 0.;
        let pressed = this.ButtonEx(label, Vec2.Zero(), flags);
        g.Style.FramePadding.y = backup_padding_y;
        return pressed;
    },

    // Tip: use ::PushID()/PopID() to push indices or pointers in the ID stack.
    // Then you can keep 'str_id' empty or the same for all your buttons (instead
    // of creating a string based on a non-string id)
    InvisibleButton(str_id, size_arg)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        // Cannot use zero-size for InvisibleButton(). Unlike Button() there is
        // not way to fallback using the label size.
        console.assert(size_arg.x != 0 && size_arg.y != 0);

        let id = win.GetID(str_id);
        let size = this.calcItemSize(size_arg, 0., 0.); // Vec2
        let bbox = new Rect(win.DC.CursorPos, Vec2.Add(win.DC.CursorPos, size));
        this.itemSize(size);
        if (!this.itemAdd(bbox, id))
            return false;

        return this.ButtonBehavior(bbox, id, null, null);
    },

    ArrowButtonEx(str_id, dir, size, flags)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        if(!size)
        {
            let sz = this.GetFrameHeight();
            size = new Vec2(sz, sz);
        }
        let g = this.guictx;
        let id = win.GetID(str_id);
        let bbox = new Rect(win.DC.CursorPos, Vec2.Add(win.DC.CursorPos, size));
        let default_size = this.GetFrameHeight();
        this.itemSize(bbox, (size.y >= default_size) ? g.Style.FramePadding.y : 0);
        if (!this.itemAdd(bbox, id))
            return false;

        if (win.DC.ItemFlags & ItemFlags.ButtonRepeat)
            flags |= ButtonFlags.Repeat;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bbox, id, hovered, held, flags);
        let disabled = flags & ButtonFlags.Disabled;

        // Render
        let col = g.Style.GetColor((held.get() && hovered.get() ?
                    "ButtonActive" : hovered.get() ? "ButtonHovered" : "Button"));
        this.renderNavHighlight(bbox, id);
        this.renderFrame(bbox.Min, bbox.Max, col, true, g.Style.FrameRounding);
        this.renderArrow(Vec2.Add(bbox.Min,
                            new Vec2(Math.max(0., (size.x - g.FontSize) * 0.5),
                                     Math.max(0., (size.y - g.FontSize) * 0.5))
                                ), dir, 1/*scale*/, disabled);

        return pressed;
    },

    ArrowButton(str_id, dir)
    {
        let sz = this.GetFrameHeight();
        return this.ArrowButtonEx(str_id, dir, new Vec2(sz, sz), 0);
    },

    IconButton(str_id, icon)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;

        let flags = 0;
        let h = this.GetFrameHeight();
        let size = new Vec2(h, h);
        let g = this.guictx;
        let id = win.GetID(str_id);
        let bbox = new Rect(win.DC.CursorPos, Vec2.Add(win.DC.CursorPos, size));
        let default_size = this.GetFrameHeight();
        this.itemSize(bbox, (size.y >= default_size) ? g.Style.FramePadding.y : 0);
        if (!this.itemAdd(bbox, id))
            return false;

        if (win.DC.ItemFlags & ItemFlags.ButtonRepeat)
            flags |= ButtonFlags.Repeat;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bbox, id, hovered, held, flags);

        // Render
        let col = g.Style.GetColor((held.get() && hovered.get() ?
                    "ButtonActive" : hovered.get() ? "ButtonHovered" : "Button"));
        this.renderNavHighlight(bbox, id);
        this.renderFrame(bbox.Min, bbox.Max, col, true, g.Style.FrameRounding);
        this.renderIcon(icon, Vec2.AddXY(bbox.Min,
                            Math.max(0., (size.x - g.FontSize) * 0.5),
                            Math.max(0., (size.y - g.FontSize) * 0.5)));
        return pressed;

    },

    IconButtonAlt(label, icon) // icons may be available in current font https://graphemica.com/
    {
        this.PushFont(this.guictx.Style.GetFont("Icons"));
        let ret = this.Button(`${icon}##${label}`); // add hover
        this.PopFont();
        return ret;
    },

    // Button to close a window
    CloseButton(id=null, pos=null, radius=6)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if(id == null)
            id = win.GetID("#CLOSE");
        let restorePos = null;

        if(!pos)
        {
            restorePos = this.GetCursorPosY();
            if(isNaN(restorePos))
                restorePos = null;
            let startPos = this.GetCursorScreenStartPos(); // in screen coords
            pos = startPos.AddXY(this.GetWindowWidth()-4*radius, 2*radius);
        }

        // We intentionally allow interaction when clipped so that a mechanical
        // Alt,Right,Validate sequence close a window. (this isn't the regular
        // behavior of buttons, but it doesn't affect the user much because
        // navigation tends to keep items visible).
        let r2 = new Vec2(radius, radius);
        let bbox = new Rect(Vec2.Subtract(pos,r2), Vec2.Add(pos, r2));
        let is_clipped = !this.itemAdd(bbox, id);

        if(restorePos)
            this.SetCursorPosY(restorePos);

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bbox, id, hovered, held);
        if (is_clipped)
            return pressed;


        // Render
        let center = bbox.GetCenter();
        if (hovered.get())
        {
            win.DrawList.AddCircleFilled(center, Math.max(2., radius),
                        g.Style.GetColor(held ? "ButtonActive" : "ButtonHovered"));
        }

        let cross_extent = (radius * 0.7071) - 1.0;
        let cross_col = g.Style.GetColor("Text");
        // center.SubtractXY(0.5, 0.5);
        win.DrawList.AddLine(Vec2.AddXY(center, cross_extent, cross_extent),
                                Vec2.AddXY(center, -cross_extent,  -cross_extent),
                                cross_col, 1);
        win.DrawList.AddLine(Vec2.AddXY(center, cross_extent,-cross_extent),
                                Vec2.AddXY(center, -cross_extent,cross_extent),
                                cross_col, 1);
        return pressed;
    },

    CollapseButton(idOrStr, pos)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        let id;
        if(typeof(idOrStr) == "string")
            id = win.GetID(idOrStr);
        else
            id = idOrStr;

        let bbox = new Rect(pos, Vec2.Add(Vec2.AddXY(pos, g.FontSize, g.FontSize),
                                        Vec2.Mult(g.Style.FramePadding, 2.)));
        this.itemAdd(bbox, id);
        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bbox, id, hovered, held, ButtonFlags.None);
        let col = g.Style.GetColor((held.get() && hovered.get() ?
                    "ButtonActive" : hovered.get() ? "ButtonHovered" : "Button"));
        if (hovered.get() || held.get())
        {
            win.DrawList.AddCircleFilled(bbox.GetCenter(),
                                            g.FontSize * 0.5+2, col);
        }
        let apos = bbox.Min.Add(g.Style.FramePadding);
        apos.x += .5; // apos.y += .5;
        this.renderArrow(apos, win.Collapsed ? Dir.Right : Dir.Down);

        // Switch to moving the window after mouse is moved beyond the initial drag threshold
        if (this.IsItemActive() && this.IsMouseDragging())
            this.startMouseMovingWindow(win);
        return pressed;
    },

    // selected can be boolean or ValRef, if boolean then optional toggleFunc is
    // invoked when selected state is changed
    Checkbox(label, selected, toggleFunc=null)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems) return false;

        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);
        const label_size = this.CalcTextSize(label, true);
        const square_sz = this.GetFrameHeight();
        const pos = win.DC.CursorPos.Clone();
        const sz = new Vec2(square_sz + (label_size.x>0?style.ItemInnerSpacing.x+label_size.x:0),
                            label_size.y + style.FramePadding.y * 2.0);
        const max = Vec2.Add(pos, sz);
        const total_bb = new Rect(pos, max);
        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, id))
            return false;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(total_bb, id, hovered, held);
        let sel = (selected.value == undefined) ? selected : selected.get();
        if (pressed)
        {
            // toggle val
            sel = !sel;
            if(selected.value != undefined)
                selected.set(sel);
            else
            if(toggleFunc)
                toggleFunc(sel);
            this.markItemEdited(id);
        }

        const check_bb = new Rect(pos, Vec2.AddXY(pos, square_sz, square_sz));
        this.renderNavHighlight(total_bb, id);
        this.renderFrame(check_bb.Min, check_bb.Max,
                        style.GetColor((held.get() && hovered.get()) ? "FrameBgActive" :
                                        hovered.get() ? "FrameBgHovered" : "FrameBg"),
                        true, style.FrameRounding);
        if (sel)
        {
            const pad = Math.max(1, Math.floor(square_sz / 6.0));
            this.renderCheckMark(Vec2.Add(check_bb.Min, pad),
                                style.GetColor("CheckMark"), square_sz - pad*2);
        }

        if (g.LogEnabled)
            this.logRenderedText(total_bb.Min, selected ? "[x]" : "[ ]");
        if (label_size.x > 0.)
        {
            this.renderText(new Vec2(check_bb.Max.x + style.ItemInnerSpacing.x,
                                     check_bb.Min.y + style.FramePadding.y),
                            label);
        }
        return pressed;
    },

    // modify one bit of a bitflag, toggleFunc is invoked on pressed
    // flags and flags_value are assumed integral numbers. toggleFunc only
    // invoked if on pressed.
    CheckboxFlags(label, flags, flags_bit, onChange=null)
    {
        let v = new ValRef(((flags & flags_bit) == flags_bit));
        let pressed = this.Checkbox(label, v);
        if (pressed && onChange)
        {
            if (v.get())
                flags |= flags_bit;
            else
                flags &= ~flags_bit;
            onChange(flags);
        }
        return pressed;
    },

    // use with e.g. if (RadioButton("one", my_value==1)) { my_value = 1; }
    RadioButton(label, active)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        let g = this.guictx;
        const style = g.Style;
        const id = win.GetID(label);
        const label_size = this.CalcTextSize(label, true);
        const square_sz = this.GetFrameHeight();
        const pos = win.DC.CursorPos;
        const check_bb = new Rect(pos, Vec2.AddXY(pos, square_sz, square_sz));
        const total_bb = new Rect(pos, Vec2.AddXY(pos,
                        square_sz + (label_size.x > 0 ? style.ItemInnerSpacing.x + label_size.x : 0),
                        label_size.y + style.FramePadding.y * 2));
        this.itemSize(total_bb, style.FramePadding.y);
        if (!this.itemAdd(total_bb, id))
            return false;

        let center = check_bb.GetCenter();
        center.x = Math.floor(center.x + 0.5);
        center.y = Math.floor(center.y + 0.5);
        const radius = (square_sz - 1) * 0.5;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(total_bb, id, hovered, held);
        if (pressed)
        {
            this.markItemEdited(id);
        }

        this.renderNavHighlight(total_bb, id);
        win.DrawList.AddCircleFilled(center, radius,
                style.GetColor((held.get() && hovered.get()) ? "FrameBgActive" :
                    hovered.get() ? "FrameBgHovered" : "FrameBg"),
                16);

        if (active)
        {
            const pad = Math.max(1, Math.floor(square_sz / 6));
            win.DrawList.AddCircleFilled(center, radius-pad,
                                        style.GetColor("CheckMark"), 16);
        }

        if (style.FrameBorderSize > 0)
        {
            win.DrawList.AddCircle(Vec2.AddXY(center, 1,1), radius,
                                    style.GetColor("BorderShadow"),
                                    16, style.FrameBorderSize);
            win.DrawList.AddCircle(center, radius,
                                    style.GetColor("Border"),
                                    16, style.FrameBorderSize);
        }

        if (g.LogEnabled)
            this.LogRenderedText(total_bb.Min, active ? "(x)" : "( )");

        if (label_size.x > 0)
        {
            this.renderText(new Vec2(check_bb.Max.x + style.ItemInnerSpacing.x,
                                     check_bb.Min.y + style.FramePadding.y),
                            label);
        }
        return pressed;
    },

    // draw a small circle and keep the cursor on the same line. advance cursor
    // x position by GetTreeNodeToLabelSpacing(), same distance that TreeNode() uses
    Bullet()
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return;

        let g = this.guictx;
        const style = g.Style;
        const line_height = Math.max(Math.min(win.DC.CurrentLineHeight,
                                        g.FontLineHeight + g.Style.FramePadding.y*2),
                                    g.FontLineHeight);
        const bb = new Rect(win.DC.CursorPos,
                        Vec2.AddXY(win.DC.CursorPos,g.FontSize, line_height));
        this.itemSize(bb);
        if (!this.itemAdd(bb, 0))
        {
            this.SameLine(0, style.FramePadding.x*2);
            return;
        }

        // Render and stay on same line
        this.renderBullet(Vec2.AddXY(bb.Min,
                            style.FramePadding.x + g.FontSize*0.5,
                            g.FontSize*0.5));
        this.SameLine(0, style.FramePadding.x*2);
    },

    // size_arg (for each axis) < 0.0f: align to end, 0.0f: auto, > 0.0f: specified size
    ProgressBar(fraction, size_arg, overlay)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems) return;

        let g = this.guictx;
        const style = g.Style;
        let pos = win.DC.CursorPos;
        let size = this.calcItemSize(size_arg, this.CalcItemWidth(),
                                    g.FontSize + style.FramePadding.y*2.0);
        let bb = new Rect(pos, Vec2.Add(pos, size));
        this.itemSize(bb, style.FramePadding.y);
        if (!this.itemAdd(bb, 1))
            return;

        // Render
        fraction = Vec1.Saturate(fraction);
        this.renderFrame(bb.Min, bb.Max, style.GetColor("FrameBg"), true, style.FrameRounding);
        bb.expandXY(-style.FrameBorderSize, -style.FrameBorderSize);
        const fill_br = new Vec2(Vec1.Lerp(bb.Min.x, bb.Max.x, fraction), bb.Max.y);
        this.renderRectFilledRangeH(win.DrawList, bb, style.GetColor("PlotHistogram"),
                                0., fraction, style.FrameRounding);

        // Default displaying the fraction as percentage string, but user can override it
        if (!overlay)
            overlay = `${Math.floor(fraction*100.01)}%`;

        let overlay_size = this.CalcTextSize(overlay);
        if (overlay_size.x > 0)
        {
            let pos = new Vec2();
            pos.x = Vec1.Clamp(fill_br.x + style.ItemSpacing.x, bb.Min.x,
                                bb.Max.x - overlay_size.x - style.ItemInnerSpacing.x),
            pos.y = bb.Min.y;
            this.renderTextClipped(pos, bb.Max, overlay, overlay_size,
                                    new Vec2(0.0,0.5), bb);
        }
    },

    getImage(url, onerror=null)
    {
        if(!this.imageCache)
            this.imageCache = {};
        let cache = this.imageCache;
        let img = cache[url];
        if(img == undefined)
        {
            img = new Image();
            cache[url] = img;
            img.addEventListener("load", function() {
                img._loaded = true;
            });
            img.addEventListener("error", function() {
                img._loaded = false;
                img._error = true;
                if(onerror)
                    onerror(url, cache);
            });
            img.src = url;
            return null;
        }
        else
        if(img._loaded)
        {
            return img;
        }
        if(img._error)
        {
            return this.getImage("img/404.png");
        }
        else
            return null;
    },

    Image(url, size, uv0=null, uv1=null, tint_col=null,
            border_col=null, bg_col = null, onError=null)
    {
        let win = this.getCurrentWindow();
        let bb = new Rect(win.DC.CursorPos,
                        Vec2.Add(win.DC.CursorPos, size));
        if (border_col != null && border_col.a > 0)
            bb.Max.AddXY(2, 2);
        this.itemSize(bb);
        if (!this.itemAdd(bb, 0))
            return;
        let img = this.getImage(url, onError);
        if(bg_col != null && bg_col.a > 0)
            win.DrawList.AddRectFilled(bb.Min, bb.Max, bg_col, 0);
        if (border_col != null && border_col.a > 0)
        {
            win.DrawList.AddRect(bb.Min, bb.Max, border_col, 0);
            if(img)
                win.DrawList.AddImage(img, bb.Expand(-1), uv0, uv1, tint_col);
        }
        else
        {
            if(img)
                win.DrawList.AddImage(img, bb, uv0, uv1, tint_col);
        }
        return img;
    },

    ImageButton(url, size, uv0=null, uv1=null, frame_padding=0,
                bg_col=null, tint_col=null, flags=0, onError=null)
    {
        let win = this.getCurrentWindow();
        if (win.SkipItems)
            return false;
        let g = this.guictx;
        const style = g.Style;

        // Default to using texture ID as ID. User can still push
        // string/integer prefixes. We could hash the size/uv to create
        // a unique ID but that would prevent the user from animating UV.
        this.PushID(url);
        const id = win.GetID("#image");
        this.PopID();

        const padding = (frame_padding >= 0) ?
                new Vec2(frame_padding, frame_padding) : style.FramePadding;
        const bb = Rect.FromXY(win.DC.CursorPos,
                        win.DC.CursorPos.x + size.x + padding.x * 2,
                        win.DC.CursorPos.y + size.y + padding.y * 2);
        const image_bb = Rect.FromXY(
                        Vec2.Add(win.DC.CursorPos, padding),
                        win.DC.CursorPos.x + padding.x + size.x,
                        win.DC.CursorPos.y + padding.y + size.y);
        this.itemSize(bb);
        if (!this.itemAdd(bb, id))
            return false;

        let hovered = new ValRef(), held = new ValRef();
        let pressed = this.ButtonBehavior(bb, id, hovered, held, flags);

        // Render
        let img = this.getImage(url, onError);
        const col = style.GetColor((held.get() && hovered.get()) ? "ButtonActive" :
                                    hovered.get() ? "ButtonHovered" : "Button");
        this.renderNavHighlight(bb, id);
        this.renderFrame(bb.Min, bb.Max, col, true,
            Vec1.Clamp(Math.min(padding.x, padding.y), 0, style.FrameRounding));
        if (bg_col && bg_col.w > 0)
            win.DrawList.AddRectFilled(image_bb.Min, image_bb.Max, bg_col);
        if(img)
            win.DrawList.AddImage(img, image_bb, uv0, uv1, tint_col);
        return pressed;
    }

}; // end mixin
