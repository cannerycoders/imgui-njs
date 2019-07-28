let f;
export var FocusedFlags =
{
    None: 0,
    ChildWindows: 1 << 0,   // IsWindowFocused(): Return true if any children of the window is focused
    RootWindow: 1 << 1,   // IsWindowFocused(): Test from root window (top most parent of the current hierarchy)
    AnyWindow: 1 << 2,   // IsWindowFocused(): Return true if any window is focused. Important: If you are trying to tell how to dispatch your low-level inputs, do NOT use this. Use ImGui::GetIO().WantCaptureMouse instead.
};
FocusedFlags.RootAndChildWindows = FocusedFlags.RootWindow |
                                   FocusedFlags.ChildWindows;
// Flags for ImGui::IsItemHovered(), ImGui::IsWindowHovered()
// Note: if you are trying to check whether your mouse should be dispatched to imgui or to your app, you should use the 'io.WantCaptureMouse' boolean for that. Please read the FAQ!
// Note: windows with the ImGuiWindowFlags_NoInputs flag are ignored by IsWindowHovered() calls.

export var HoveredFlags =
{
    None: 0,        // Return true if directly over the item/window, not obstructed by another window, not obstructed by an active popup or modal blocking inputs under them.
    ChildWindows: 1 << 0,   // IsWindowHovered() only: Return true if any children of the window is hovered
    RootWindow: 1 << 1,   // IsWindowHovered() only: Test from root window (top most parent of the current hierarchy)
    AnyWindow: 1 << 2,   // IsWindowHovered() only: Return true if any window is hovered
    AllowWhenBlockedByPopup: 1 << 3,   // Return true even if a popup window is normally blocking access to this item/window
    //AllowWhenBlockedByModal: 1 << 4,   // Return true even if a modal popup window is normally blocking access to this item/window. FIXME-TODO: Unavailable yet.
    AllowWhenBlockedByActiveItem: 1 << 5,   // Return true even if an active item is blocking access to this item/window. Useful for Drag and Drop patterns.
    AllowWhenOverlapped: 1 << 6,   // Return true even if the position is overlapped by another window
    AllowWhenDisabled: 1 << 7,   // Return true even if the item is disabled
};
HoveredFlags.RectOnly = HoveredFlags.AllowWhenBlockedByPopup |
                        HoveredFlags.AllowWhenBlockedByActiveItem |
                        HoveredFlags.AllowWhenOverlapped;
HoveredFlags.RootAndChildWindows = HoveredFlags.RootWindow |
                        HoveredFlags.ChildWindows;

export var NavHighlightFlags =
{
    None: 0,
    TypeDefault: 1 << 0,
    TypeThin: 1 << 1,
    AlwaysDraw: 1 << 2, // Draw rectangular highlight if (g.NavId == id) _even_ when using the mouse.
    NoRounding: 1 << 3
};

export var NavMoveFlags =
{
    None: 0,
    LoopX: 1 << 0, // On failed request, restart from opposite side
    LoopY: 1 << 1,
    WrapX: 1 << 2, // On failed request, request from opposite side one line
                   // down (when NavDir==right) or one line up (when NavDir==left)
    WrapY: 1 << 3, // This is not super useful for provided for completeness
    AllowCurrentNavId: 1 << 4, // Allow scoring and considering the current
                               // NavId as a move target candidate. This is used
                               // when the move source is offset (e.g. pressing
                               // PageDown actually needs to send a Up move
                               // request, if we are pressing PageDown from the
                               // bottom-most item we need to stay in place)

    AlsoScoreVisibleSet: 1 << 5// Store alternate result in NavMoveResultLocalVisibleSet
                               // that only comprise elements that are already fully
                               // visible.
};

export var ItemFlags =
{
    Default: 0,
    NoTabStop: 1 << 0,  // false
    ButtonRepeat: 1 << 1,  // false    // Button() will return true multiple times based on io.KeyRepeatDelay and io.KeyRepeatRate settings.
    Disabled: 1 << 2,  // false    // [BETA] Disable interactions but doesn't affect visuals yet. See github.com/ocornut/imgui/issues/211
    NoNav: 1 << 3,  // false
    NoNavDefaultFocus: 1 << 4,  // false
    SelectableDontClosePopup: 1 << 5,  // false    // MenuItem/Selectable() automatically closes current Popup window
};

export var ItemStatusFlags =
{
    None: 0,
    HoveredRect: 1,
    HasDisplayRect: 2,
    Edited: 4,  // Value exposed by item was edited in the current frame
                // (should match the bool return value of most widgets)
};

export var CondFlags =
{
    None: 0,
    Always: 1,
    Once: 2, // once per runtime session (only the first call with succeed)
    FirstUseEver: 4, // object has no persistently saved data (no entry in .ini file)
    Appearing: 8 // if object is appearing after being hidden/inactive (or the first time)
};

export var ConfigFlags =
{
    None: 0,
    // Master keyboard navigation enable flag. NewFrame() will automatically
    // fill io.NavInputs[] based on io.KeysDown[].
    NavEnableKeyboard: 1 << 0,
    // Master gamepad navigation enable flag. This is mostly to instruct your
    // imgui back-end to fill io.NavInputs[]. Back-end also needs to set
    // BackendFlags.HasGamepad.
    NavEnableGamepad: 1 << 1,
    // Instruct navigation to move the mouse cursor. May be useful on
    // TV/console systems where moving a virtual mouse is awkward. Will
    // update io.MousePos and set io.WantSetMousePos=true. If enabled you
    // MUST honor io.WantSetMousePos requests in your binding, otherwise
    // ImGui will react as if the mouse is jumping around back and forth.
    NavEnableSetMousePos: 1 << 2,
    // Instruct navigation to not set the io.WantCaptureKeyboard flag when
    // io.NavActive is set.
    NavNoCaptureKeyboard: 1 << 3,
    // Instruct imgui to clear mouse position/buttons in NewFrame(). This
    // allows ignoring the mouse information set by the back-end.
    NoMouse: 1 << 4,
    // Instruct back-end to not alter mouse cursor shape and visibility.
    // Use if the back-end cursor changes are interfering with yours and
    // you don't want to use SetMouseCursor() to change mouse cursor. You
    // may want to honor requests from imgui by reading GetMouseCursor()
    // yourself instead.
    NoMouseCursorChange: 1 << 5,

    // User storage (to allow your back-end/engine to communicate to code
    // that may be shared between multiple projects. Those flags are not
    // used by core ImGui)

    // Application is SRGB-aware.
    IsSRGB: 1 << 20,

    // Application is using a touch screen instead of a mouse.
    IsTouchScreen: 1 << 21
};

// Back-end capabilities flags stored in io.BackendFlags. Set by
// imgui_impl_xxx or custom back-end.
export var BackendFlags =
{
    None: 0,
    // Back-end supports gamepad and currently has one connected.
    HasGamepad: 1 << 0,
    // Back-end supports honoring GetMouseCursor() value to change
    // the OS cursor shape.
    HasMouseCursors: 1 << 1,
    // Back-end supports io.WantSetMousePos requests to reposition
    // the OS mouse position (only used if ConfigFlags.NavEnableSetMousePos
    // is set).
    HasSetMousePos: 1 << 2
};

export var ColorEditFlags =
{
    None: 0,
    NoAlpha: 1 << 1,   // ColorEdit, ColorPicker, ColorButton: ignore Alpha component (will only read 3 components from the input pointer).
    NoPicker: 1 << 2,   // ColorEdit: disable picker when clicking on colored square.
    NoOptions: 1 << 3,   // ColorEdit: disable toggling options menu when right-clicking on inputs/small preview.
    NoSmallPreview: 1 << 4,   // ColorEdit, ColorPicker: disable colored square preview next to the inputs. (e.g. to show only the inputs)
    NoInputs: 1 << 5,   // ColorEdit, ColorPicker: disable inputs sliders/text widgets (e.g. to show only the small preview colored square).
    NoTooltip: 1 << 6,   // ColorEdit, ColorPicker, ColorButton: disable tooltip when hovering the preview.
    NoLabel: 1 << 7,   // ColorEdit, ColorPicker: disable display of inline text label (the label is still forwarded to the tooltip and picker).
    NoSidePreview: 1 << 8,   // ColorPicker: disable bigger color preview on right side of the picker, use small colored square preview instead.
    NoDragDrop: 1 << 9,   // ColorEdit: disable drag and drop target. ColorButton: disable drag and drop source.

    // User Options (right-click on widget to change some of them).
    AlphaBar: 1 << 16,  // ColorEdit, ColorPicker: show vertical alpha bar/gradient in picker.
    AlphaPreview: 1 << 17,  // ColorEdit, ColorPicker, ColorButton: display preview as a transparent color over a checkerboard, instead of opaque.
    AlphaPreviewHalf: 1 << 18,  // ColorEdit, ColorPicker, ColorButton: display half opaque / half checkerboard, instead of opaque.
    HDR: 1 << 19,  // (WIP) ColorEdit: Currently only disable 0.0f..1.0f limits in RGBA edition (note: you probably want to use ImGuiColorEditFlags_Float flag as well).
    DisplayRGB: 1 << 20,  // ColorEdit: override _display_ type among RGB/HSV/Hex. ColorPicker: select any combination using one or more of RGB/HSV/Hex.
    DisplayHSV: 1 << 21,
    DisplayHex: 1 << 22,
    Uint8: 1 << 23,  // ColorEdit, ColorPicker, ColorButton: _display_ values formatted as 0..255.
    Float: 1 << 24,  // ColorEdit, ColorPicker, ColorButton: _display_ values formatted as 0.0f..1.0f floats instead of 0..255 integers. No round-trip of value via integers.
    PickerHueBar: 1 << 25,  // ColorPicker: bar for Hue, rectangle for Sat/Value.
    PickerHueWheel: 1 << 26,  // ColorPicker: wheel for Hue, triangle for Sat/Value.
    InputRGB: 1 << 27,  // ColorEdit, ColorPicker: input and output data in RGB format.
    InputHSV: 1 << 28,  // ColorEdit, ColorPicker: input and output data in HSV format.
};

// Defaults Options. You can set application defaults using SetColorEditOptions(). The intent is that you probably don't want to
// override them in most of your calls. Let the user choose via the option menu and/or call SetColorEditOptions() once during startup.
ColorEditFlags.OptionsDefault = ColorEditFlags.Uint8 |
                    ColorEditFlags.DisplayRGB | ColorEditFlags.InputRGB |
                    ColorEditFlags.PickerHueBar;

// [Internal] Masks
ColorEditFlags.DisplayMask = ColorEditFlags.DisplayRGB |
                              ColorEditFlags.DisplayHSV |
                              ColorEditFlags.DisplayHex;
ColorEditFlags.DataTypeMask = ColorEditFlags.Uint8 | ColorEditFlags.Float;
ColorEditFlags.PickerMask = ColorEditFlags.PickerHueWheel | ColorEditFlags.PickerHueBar;
ColorEditFlags.InputMask = ColorEditFlags.InputRGB | ColorEditFlags.InputHSV;


export var NavDirSourceFlags =
{
    None: 0,
    Keyboard: 1 << 0,
    PadDPa: 1 << 1,
    PadLStic: 1 << 2
};

// In your function calls you may use ~0 (= all bits sets) instead of
// CornerFlags.All
export var CornerFlags =
{
    TopLeft: 1 << 0, // 0x1
    TopRight: 1 << 1, // 0x2
    BotLeft: 1 << 2, // 0x4
    BotRight: 1 << 3, // 0x8
};
f = CornerFlags;
f.Top = f.TopLeft | f.TopRight;   // 0x3
f.Bot = f.BotLeft | f.BotRight;   // 0xC
f.Left = f.TopLeft | f.BotLeft;    // 0x5
f.Right = f.TopRight |f.BotRight;  // 0xA
f.All = 0xF;

export var DrawListFlags =
{
    None: 0,
    AntiAliasedLines: 1 << 0,  // Lines are anti-aliased (*2 the number of triangles for 1.0f wide line, otherwise *3 the number of triangles)
    AntiAliasedFill: 1 << 1   // Filled shapes have anti-aliased edges (*2 the number of vertices)
};
