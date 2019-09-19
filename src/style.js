import {Color, CSSColors} from "./color.js";
import {Vec2} from  "./types.js";
import {SettingsHandler} from "./settings.js";

let rgba = Color.rgba;
let rgb = Color.rgb;
let rgbi = Color.rgbi;

// DarkColors is the Primary Style object... If you feel lazy
// just be sure to populate new entries there.  Those values
// will be automatically propagated to other canned styles.
// Clearly they may not be good choices, but at least the styles
// will all have the same keys.
export var DarkColors = {};
let c = DarkColors;
let bgActive = rgb(0.16, 0.29, 0.48);
let bg = rgb(0.04, 0.04, 0.04);
DarkColors.Border = rgba(0.43, 0.43, 0.50, 0.50);
DarkColors.BorderShadow = rgba(0.0, 0.0, 0.0, 0.0);
DarkColors.Button = rgba(0.26, 0.59, 0.98, 0.40);
DarkColors.ButtonActive = rgba(0.06, 0.53, 0.98, 1.00);
DarkColors.ButtonHovered = rgba(0.26, 0.59, 0.98, 1.00);
DarkColors.CheckMark = rgba(0.26, 0.59, 0.98, 1.0);
DarkColors.CheckerOff = rgbi(64,64,64);
DarkColors.CheckerOn =  rgbi(204,204,204);
DarkColors.ChildBg = rgba(0.0, 0.0, 0.0, 0.0);
DarkColors.DragDropTarget = rgba(1.00, 1.00, 0.00, 0.90);
DarkColors.FBDir = rgb(.2, .9, .2);
DarkColors.FBFile = rgb(.8, .8, .8);
DarkColors.FBMkDir = rgb(.3, .6, 1);
DarkColors.FrameBg = rgba(0.16, 0.29, 0.48, 0.54);
DarkColors.FrameBgActive = rgba(0.26, 0.59, 0.98, 0.67);
DarkColors.FrameBgHovered = rgba(0.26, 0.59, 0.98, 0.40);
DarkColors.Header = rgba(0.26, 0.59, 0.98, 0.31);
DarkColors.HeaderActive = rgba(0.26, 0.59, 0.98, 1.00);
DarkColors.HeaderHovered = rgba(0.26, 0.59, 0.98, 0.80);
DarkColors.Link = rgb(.3, .6, .9);
DarkColors.LinkActive = rgb(.2, .9, .7);
DarkColors.LinkHovered = rgb(.4, .6, 1);
DarkColors.MenuBarBg = rgba(0.14, 0.14, 0.14, 1.);
DarkColors.ModalWindowDimBg = rgba(0.80, 0.80, 0.80, 0.35);
DarkColors.NavHighlight = rgba(0.26, 0.59, 0.98, 1.00);
DarkColors.NavWindowingDimBg = rgba(0.80, 0.80, 0.80, 0.20);
DarkColors.NavWindowingHighlight = rgba(1.00, 1.00, 1.00, 0.70);
DarkColors.PlotBg = rgb(.1, .1, .1);
DarkColors.PlotHistogram = rgba(0.90, 0.70, 0.00, 1.00);
DarkColors.PlotHistogramDimmed = rgba(0.45, 0.35, 0.00, 1.00);
DarkColors.PlotHistogramHovered = rgba(1.00, 0.60, 0.00, 1.00);
DarkColors.PlotLines = rgba(0.61, 0.61, 0.61, 1.0);
DarkColors.PlotLinesDimmed = rgba(0.3, 0.3, 0.3, 1.0);
DarkColors.PlotLinesHovered = rgba(1.00, 0.43, 0.35, 1.00);
DarkColors.PlotSignal = rgba(0.90, 0.70, 0.00, 1.00);
DarkColors.PlotSignalDimmed = rgba(0.45, 0.35, 0.0, 1.0);
DarkColors.PlotSignalHovered = rgba(1.00, 0.43, 0.35, 1.00);
DarkColors.PopupBg = rgba(0.08, 0.08, 0.08, 0.94);
DarkColors.ResizeGrip = rgba(0.26, 0.59, 0.98, 0.25);
DarkColors.ResizeGripActive = rgba(0.26, 0.59, 0.98, 0.95);
DarkColors.ResizeGripHovered = rgba(0.26, 0.59, 0.98, 0.67);
DarkColors.ScrollbarBg = rgba(0.02, 0.02, 0.02, 0.53);
DarkColors.ScrollbarGrab = rgba(0.31, 0.31, 0.31, 1.);
DarkColors.ScrollbarGrabActive = rgba(0.51, 0.51, 0.51, 1.);
DarkColors.ScrollbarGrabHovered = rgba(0.41, 0.41, 0.41, 1.);
DarkColors.Separator = c.Border;
DarkColors.SeparatorActive = rgba(0.10, 0.40, 0.75, 1.00);
DarkColors.SeparatorHovered = rgba(0.10, 0.40, 0.75, 0.78);
DarkColors.SliderGrab = rgba(0.24, 0.52, 0.88, 1.0);
DarkColors.SliderGrabActive = rgba(0.26, 0.59, 0.98, 1.0);
DarkColors.Tab = Color.Lerp(c.Header, bgActive, 0.80);
DarkColors.TabActive = Color.Lerp(c.HeaderActive, bgActive, 0.6);
DarkColors.TabHovered = c.HeaderHovered;
DarkColors.TabUnfocused = Color.Lerp(c.Tab, bg, 0.8);
DarkColors.TabUnfocusedActive = Color.Lerp(c.TabActive, bg, 0.4);
DarkColors.Text = rgb(.9, .9, .9);
DarkColors.TextDisabled = rgb(0.5, 0.5, 0.5);
DarkColors.TextEmphasized = rgb(0.8, 1, 0.8);
DarkColors.TextHighlighted = rgbi(25, 211, 97);
DarkColors.TextError = CSSColors.darkorange;
DarkColors.TextSelectedBg = rgba(0.26, 0.59, 0.98, 0.35);
DarkColors.TitleBg = bg;
DarkColors.TitleBgActive = bgActive;
DarkColors.TitleBgCollapsed = rgba(0.0, 0.0, 0.0, 0.51);
DarkColors.WindowBg = rgba(0.06, 0.06, 0.06, 0.94);

DarkColors.DEBUG = rgb(.2, .4, .9);
DarkColors.INFO = rgb(.3, .8, .9);
DarkColors.NOTICE = rgb(.4, .9, .4);
DarkColors.WARNING = CSSColors.darkorange;
DarkColors.ALERT = CSSColors.darkorange;
DarkColors.ERROR = rgb(1, 0, 0);
DarkColors._DEBUG0 = rgba(1, 0, 0, .5);
DarkColors._DEBUG1 = rgba(0, 1, 0, .5);
DarkColors._DEBUG2 = rgba(0, 0, 1, .5);
DarkColors._DEBUG3 = rgba(1, 1, 0, .5);

export var ClassicColors = Object.assign({}, DarkColors); // inherit from Dark
c = ClassicColors;
ClassicColors.Border = rgba(0.50, 0.50, 0.50, 0.50);
ClassicColors.BorderShadow = rgba(0.00, 0.00, 0.00, 0.00);
ClassicColors.Button = rgba(0.35, 0.40, 0.61, 0.62);
ClassicColors.ButtonActive = rgba(0.46, 0.54, 0.80, 1.00);
ClassicColors.ButtonHovered = rgba(0.40, 0.48, 0.71, 0.79);
ClassicColors.CheckMark = rgba(0.90, 0.90, 0.90, 0.50);
ClassicColors.CheckerOff = rgbi(64,64,64);
ClassicColors.CheckerOn =  rgbi(204,204,204);
ClassicColors.ChildBg = rgba(0.00, 0.00, 0.00, 0.00);
ClassicColors.DragDropTarget = rgba(1.00, 1.00, 0.00, 0.90);
ClassicColors.FBDir = rgb(.2, .9, .2);
ClassicColors.FBFile = rgb(.8, .8, .8);
ClassicColors.FBMkDir = rgb(.2, .4, .9);
ClassicColors.FrameBg = rgba(0.43, 0.43, 0.43, 0.39);
ClassicColors.FrameBgActive = rgba(0.42, 0.41, 0.64, 0.69);
ClassicColors.FrameBgHovered = rgba(0.47, 0.47, 0.69, 0.40);
ClassicColors.Header = rgba(0.40, 0.40, 0.90, 0.45);
ClassicColors.HeaderActive = rgba(0.53, 0.53, 0.87, 0.80);
ClassicColors.HeaderHovered = rgba(0.45, 0.45, 0.90, 0.80);
ClassicColors.MenuBarBg = rgba(0.40, 0.40, 0.55, 0.80);
ClassicColors.ModalWindowDimBg = rgba(0.20, 0.20, 0.20, 0.35);
ClassicColors.NavHighlight = c.HeaderHovered;
ClassicColors.NavWindowingDimBg = rgba(0.80, 0.80, 0.80, 0.20);
ClassicColors.NavWindowingHighlight = rgba(1.00, 1.00, 1.00, 0.70);
ClassicColors.PlotBg = rgb(.1, .1, .1);
ClassicColors.PlotHistogram = rgba(0.90, 0.70, 0.00, 1.00);
ClassicColors.PlotHistogramDimmed = rgba(1.00, 0.60, 0.00, 1.00);
ClassicColors.PlotHistogramHovered = rgba(1.00, 0.60, 0.00, 1.00);
ClassicColors.PlotLines = rgba(1.00, 1.00, 1.00, 1.00);
ClassicColors.PlotLinesDimmed = rgba(0.90, 0.70, 0.00, 1.00);
ClassicColors.PlotLinesHovered = rgba(0.90, 0.70, 0.00, 1.00);
ClassicColors.PlotSignal = rgba(1.00, 1.00, 1.00, 1.00);
ClassicColors.PlotSignalDimmed = rgba(0.90, 0.70, 0.00, 1.00);
ClassicColors.PlotSignalHovered = rgba(0.90, 0.70, 0.00, 1.00);
ClassicColors.PopupBg = rgba(0.11, 0.11, 0.14, 0.92);
ClassicColors.ResizeGrip = rgba(1.00, 1.00, 1.00, 0.16);
ClassicColors.ResizeGripActive = rgba(0.78, 0.82, 1.00, 0.90);
ClassicColors.ResizeGripHovered = rgba(0.78, 0.82, 1.00, 0.60);
ClassicColors.ScrollbarBg = rgba(0.20, 0.25, 0.30, 0.60);
ClassicColors.ScrollbarGrab = rgba(0.40, 0.40, 0.80, 0.30);
ClassicColors.ScrollbarGrabActive = rgba(0.41, 0.39, 0.80, 0.60);
ClassicColors.ScrollbarGrabHovered = rgba(0.40, 0.40, 0.80, 0.40);
ClassicColors.Separator = rgba(0.50, 0.50, 0.50, 1.00);
ClassicColors.SeparatorActive = rgba(0.70, 0.70, 0.90, 1.00);
ClassicColors.SeparatorHovered = rgba(0.60, 0.60, 0.70, 1.00);
ClassicColors.SliderGrab = rgba(1.00, 1.00, 1.00, 0.30);
ClassicColors.SliderGrabActive = rgba(0.41, 0.39, 0.80, 0.60);
ClassicColors.Tab = Color.Lerp(c.Header, c.TitleBgActive, 0.80);
ClassicColors.TabActive = Color.Lerp(c.HeaderActive, c.TitleBgActive, 0.60);
ClassicColors.TabHovered = c.HeaderHovered;
ClassicColors.TabUnfocused = Color.Lerp(c.Tab, c.TitleBg, 0.80);
ClassicColors.TabUnfocusedActive = Color.Lerp(c.TabActive, c.TitleBg, 0.40);
ClassicColors.Text = rgba(0.90, 0.90, 0.90, 1.00);
ClassicColors.TextDisabled = rgba(0.60, 0.60, 0.60, 1.00);
ClassicColors.TextEmphasized = rgba(0.60, 0.80, 0.60, 1.00);
ClassicColors.TextError = CSSColors.darkorange;
ClassicColors.TextSelectedBg = rgba(0.00, 0.00, 1.00, 0.35);
ClassicColors.TitleBg = rgba(0.27, 0.27, 0.54, 0.83);
ClassicColors.TitleBgActive = rgba(0.32, 0.32, 0.63, 0.87);
ClassicColors.TitleBgCollapsed = rgba(0.40, 0.40, 0.80, 0.20);
ClassicColors.WindowBg = rgba(0.00, 0.00, 0.00, 0.70);

export var LightColors = Object.assign({}, DarkColors); // inherit
c = LightColors;
LightColors.Border = rgba(0.00, 0.00, 0.00, 0.30);
LightColors.BorderShadow = rgba(0.00, 0.00, 0.00, 0.00);
LightColors.Button = rgba(0.26, 0.59, 0.98, 0.40);
LightColors.ButtonActive = rgba(0.06, 0.53, 0.98, 1.00);
LightColors.ButtonHovered = rgba(0.26, 0.59, 0.98, 1.00);
LightColors.CheckMark = rgba(0.26, 0.59, 0.98, 1.00);
LightColors.CheckerOff = rgbi(64,64,64);
LightColors.CheckerOn =  rgbi(204,204,204);
LightColors.ChildBg = rgba(0.00, 0.00, 0.00, 0.00);
LightColors.DragDropTarget = rgba(0.26, 0.59, 0.98, 0.95);
LightColors.FBDir = rgb(.2, .9, .2);
LightColors.FBFile = rgb(.8, .8, .8);
LightColors.FBMkDir = rgb(.2, .4, .9);
LightColors.FrameBg = rgba(1.00, 1.00, 1.00, 1.00);
LightColors.FrameBgActive = rgba(0.26, 0.59, 0.98, 0.67);
LightColors.FrameBgHovered = rgba(0.26, 0.59, 0.98, 0.40);
LightColors.Header = rgba(0.26, 0.59, 0.98, 0.31);
LightColors.HeaderActive = rgba(0.26, 0.59, 0.98, 1.00);
LightColors.HeaderHovered = rgba(0.26, 0.59, 0.98, 0.80);
LightColors.MenuBarBg = rgba(0.86, 0.86, 0.86, 1.00);
LightColors.ModalWindowDimBg = rgba(0.20, 0.20, 0.20, 0.35);
LightColors.NavHighlight = c.HeaderHovered;
LightColors.NavWindowingDimBg = rgba(0.20, 0.20, 0.20, 0.20);
LightColors.NavWindowingHighlight = rgba(0.70, 0.70, 0.70, 0.70);
LightColors.PlotBg = rgb(.1, .1, .1);
LightColors.PlotHistogram = rgba(0.90, 0.70, 0.00, 1.00);
LightColors.PlotHistogramDimmed = rgba(0.90, 0.70, 0.00, 1.00);
LightColors.PlotHistogramHovered = rgba(1.00, 0.45, 0.00, 1.00);
LightColors.PlotLines = rgba(0.39, 0.39, 0.39, 1.00);
LightColors.PlotLinesDimmed = rgba(0.39, 0.39, 0.39, 1.00);
LightColors.PlotLinesHovered = rgba(1.00, 0.43, 0.35, 1.00);
LightColors.PlotSignal = rgba(0.90, 0.70, 0.00, 1.00);
LightColors.PlotSignalDimmed = rgba(0.90, 0.70, 0.00, 1.00);
LightColors.PlotSignalHovered = rgba(1.00, 0.45, 0.00, 1.00);
LightColors.PopupBg = rgba(1.00, 1.00, 1.00, 0.98);
LightColors.ResizeGrip = rgba(0.80, 0.80, 0.80, 0.56);
LightColors.ResizeGripActive = rgba(0.26, 0.59, 0.98, 0.95);
LightColors.ResizeGripHovered = rgba(0.26, 0.59, 0.98, 0.67);
LightColors.ScrollbarBg = rgba(0.98, 0.98, 0.98, 0.53);
LightColors.ScrollbarGrab = rgba(0.69, 0.69, 0.69, 0.80);
LightColors.ScrollbarGrabActive = rgba(0.49, 0.49, 0.49, 1.00);
LightColors.ScrollbarGrabHovered = rgba(0.49, 0.49, 0.49, 0.80);
LightColors.Separator = rgba(0.39, 0.39, 0.39, 1.00);
LightColors.SeparatorActive = rgba(0.14, 0.44, 0.80, 1.00);
LightColors.SeparatorHovered = rgba(0.14, 0.44, 0.80, 0.78);
LightColors.SliderGrab = rgba(0.26, 0.59, 0.98, 0.78);
LightColors.SliderGrabActive = rgba(0.46, 0.54, 0.80, 0.60);
LightColors.Tab = Color.Lerp(c.Header, c.TitleBgActive, 0.90);
LightColors.TabActive = Color.Lerp(c.HeaderActive, c.TitleBgActive, 0.60);
LightColors.TabHovered = c.HeaderHovered;
LightColors.TabUnfocused = Color.Lerp(c.Tab, c.TitleBg, 0.80);
LightColors.TabUnfocusedActive = Color.Lerp(c.TabActive, c.TitleBg, 0.40);
LightColors.Text = rgba(0.00, 0.00, 0.00, 1.00);
LightColors.TextDisabled = rgba(0.60, 0.60, 0.60, 1.00);
LightColors.TextEmphasized = rgba(0.0, 0.20, 0.00, 1.00);
LightColors.TextError = CSSColors.darkorange;
LightColors.TextSelectedBg = rgba(0.26, 0.59, 0.98, 0.35);
LightColors.TitleBg = rgba(0.96, 0.96, 0.96, 1.00);
LightColors.TitleBgActive = rgba(0.82, 0.82, 0.82, 1.00);
LightColors.TitleBgCollapsed = rgba(1.00, 1.00, 1.00, 0.51);
LightColors.WindowBg = rgba(0.94, 0.94, 0.94, 1.00);

export var DebugColors = Object.assign({}, DarkColors);
for(let k in DebugColors)
{
    DebugColors[k] = Color.RandomCss();
}

export var ColorSchemes =
{
    "ClassicColors": ClassicColors,
    "DarkColors": DarkColors,
    "LightColors": LightColors,
    "DebugColors": DebugColors,
};

export class StyleMod
{
    constructor(field, val)
    {
        this.Field = field;
        this.Value = val;
    }
}

export class Style extends SettingsHandler
{
    constructor(fontAtlas, imgui)
    {
        super();
        this._imgui = imgui;
        this.Alpha = 1.0;
            // Global alpha applies to everything in ImGui
        this.WindowPadding = new Vec2(8,8);
            // Padding within a window
        this.WindowRounding = 7.0;
            // Radius of window corners rounding. Set to 0.0f to have
            // rectangular windows
        this.WindowBorderSize = 1.0;
            // Thickness of border around windows. Generally set to 0.0f or 1.0f.
            // Other values not well tested.
        this.WindowMinSize = new Vec2(32,32);
            // Minimum window size
        this.WindowTitleAlign = new Vec2(0.,0.5);
            // Alignment for title bar text
        this.ChildRounding = 0.0;
            // Radius of child window corners rounding. Set to 0.0f to have
            // rectangular child windows
        this.ChildBorderSize = 1;
            // Thickness of border around child windows. Generally set to 0.0f
            // or 1.0f. Other values not well tested.
        this.PopupRounding = 0.0;
            // Radius of popup window corners rounding. Set to 0.0f to have
            // rectangular child windows
        this.PopupBorderSize = 1.;
            // Thickness of border around popup or tooltip windows. Generally
            // set to 0.0f or 1.0f. Other values not well tested.
        this.FramePadding = new Vec2(4,3);
            // Padding within a framed rectangle (used by most widgets)
        this.FrameRounding = 3.;
            // Radius of frame corners rounding. Set to 0.0f to have rectangular
            // frames (used by most widgets).
        this.FrameBorderSize = 0.;
            // Thickness of border around frames. Generally set to 0.0f or
            // 1.0f. Other values not well tested.
        this.ItemSpacing = new Vec2(8,4);
            // Horizontal and vertical spacing between widgets/lines
        this.ItemInnerSpacing = new Vec2(4,4);
            // Horizontal and vertical spacing between within elements of
            // a composed widget (e.g. a slider and its label)
        this.TextLineHeightPct = 1.25;
            // lineheight for text (usually >= 1)
        this.TouchExtraPadding = new Vec2(0,0);
            // Expand reactive bounding box for touch-based system where
            // touch position is not accurate enough. Unfortunately we don't
            // sort widgets so priority on overlap will always be given to
            // the first widget. So don't grow this too much!
        this.IndentSpacing = 21;
            // Horizontal spacing when e.g. entering a tree node.
            // Generally == (FontSize + FramePadding.x*2).
        this.ColumnsMinSpacing = 6.;
            // Minimum horizontal spacing between two columns
        this.ScrollbarSize = 16.;
            // Width of the vertical scrollbar, Height of the horizontal scrollbar
        this.ScrollbarRounding = 3.;
            // Radius of grab corners rounding for scrollbar
        this.GrabMinSize = 10.;
            // Minimum width/height of a grab box for slider/scrollbar
        this.GrabRounding = 0.;
            // Radius of grabs corners rounding. Set to 0.0f to have
            // rectangular slider grabs.
        this.TabRounding = 4.;
            // Radius of upper corners of a tab. Set to 0.0f to have
            // rectangular tabs.
        this.TabBorderSize = 0.;
            // Thickness of border around tabs.
        this.ButtonTextAlign = new Vec2(0.5,0.5);
            // Alignment of button text when button is larger than text.
        this.SelectableTextAlign = new Vec2(0.,0.);
            // Alignment of selectable text when button is larger than text.
        this.DisplayWindowPadding = new Vec2(19,19);
            // Window position are clamped to be visible within the display
            // area by at least this amount. Only applies to regular windows.
        this.DisplaySafeAreaPadding = new Vec2(3,3);
            // If you cannot see the edge of your screen (e.g. on a TV)
            // increase the safe area padding. Covers popups/tooltips as well
            // regular windows.
        this.MouseCursorScale = 1.;
            // Scale software rendered mouse cursor (when io.MouseDrawCursor
            // is enabled). May be removed later.
        this.AntiAliasedLines = true;
            // Enable anti-aliasing on lines/borders. Disable if you are really
            // short on CPU/GPU.
        this.AntiAliasedFill = true;
            // Enable anti-aliasing on filled shapes (rounded rectangles,
            // circles, etc.)
        this.CurveTessellationTol = 1.25;
            // Tessellation tolerance when using PathBezierCurveTo() without a
            // specific number of segments. Decrease for highly tessellated
            // curves (higher quality, more polygons), increase to reduce quality.

        this.SetColorScheme("DarkColors");

        // Font abstractions
        /* _DefaultFontSizes and _DefaultFonts are combined with
         * the users' saved values to allow for addition of
         * new ids 'after the fact'.
         */
        this._DefaultFontSizes =
        {
            "Small": 9,
            "Std": 10,
            "Med": 15,
            "Big": 20,
            "Huge": 32,
        };

        this._DefaultFonts = 
        {
            "Default": ["Exo", "Std", "normal"],
            "Label": ["Exo", "Std", "bold"],
            "Small": ["Exo", "Small", "normal"],
            "Big": ["Exo", "Big", "normal"],
            "serif": ["Georgia", "Std", "normal"],
            "sans-serif": ["Exo", "Std", "normal"],
            "monospace": ["SourceCodePro", "Std", "normal"],
            "Fixed": ["SourceCodePro", "Std", "normal"],
            "MedFixed": ["SourceCodePro", "Med", "normal"],
            "BigFixed": ["SourceCodePro", "Big", "normal"],
            "Icons": ["Material Icons", "Std", "normal"],
            "BigIcons": ["Material Icons", "Big", "normal"],
            "HugeIcons": ["Material Icons", "Huge", "normal"],
        };

        this.FontSizes = Object.assign({}, this._DefaultFontSizes);
        this.Fonts = Object.assign({}, this._DefaultFonts);


        // currently tied to MaterialIcons
        //  https://material.io/resources/icons/?style=baseline
        //  https://github.com/google/material-design-icons/blob/master/iconfont/codepoints
        //  same but more up to date:
        //  https://github.com/jossef/material-design-icons-iconfont/tree/master/dist/fonts
        //  https://github.com/jossef/material-design-icons-iconfont/blob/master/dist/fonts/MaterialIcons-Regular.json
        this._MIcons =
        {
            Info: String.fromCharCode(0x0e88e),
            InfoOutline: String.fromCharCode(0x0e88f),
            NoMute: String.fromCharCode(0x0e050),
            Note: String.fromCharCode(0x0e3a1), // audiotrack
            Menu: String.fromCharCode(0x0e5d2), // ie hamburger
            MenuOpen: String.fromCharCode(0x0e9bd),
            Mute: String.fromCharCode(0x0e04f),
            Pause: String.fromCharCode(0x0e034),
            PickFile: String.fromCharCode(0x0e2c8),
            Play: String.fromCharCode(0x0e037),
            Stop: String.fromCharCode(0x0e047),
            Trash: String.fromCharCode(0x0e872),
            Warning: String.fromCharCode(0x0e002),
        };

        // unicode character codes (font-independent-ish)
        // https://graphemica.com/
        this._UIcons =
        {
            NavIcon: String.fromCodePoint(0x2630), //  hamburger
            InfoIcon: String.fromCodePoint(0x2139), // 0x1f6c8 circled information source
        };

        // stuff not subject to encapsulation should start with _
        this._fontAtlas = fontAtlas;
        this.GetFont("Default"); // to populate the cache
    }

    GetTypeName() { return "Style"; }

    Encapsulate(imgui)
    {
        let o = {};
        for(let k of Object.getOwnPropertyNames(this))
        {
            if(k[0] == "_") continue; // font atlas, icons, _defaults
            if(k == "Colors")
            {
                o.Colors = {};
                for(let cnm in this.Colors)
                    o.Colors[cnm] = this.Colors[cnm].Encapsulate();
            }
            else
                o[k] = this[k]; // ok for Vec2, see Instantiate
        }
        o.ColorScheme = "custom";
        return o;
    }

    Instantiate(imgui, o)
    {
        let deprecatedProps = ["MIcons", "UIcons"];
        let knownProps = Object.getOwnPropertyNames(this); // a list
        for(let k in o)
        {
            if(deprecatedProps.indexOf(k) != -1)
                continue;
            if(knownProps.indexOf(k) == -1)
                console.debug("Style unknown field: " + k);
            else
            if(k == "Colors")
            {
                let colors = o[k];
                for(let cnm in colors)
                    this.Colors[cnm] = Color.Instantiate(colors[cnm]);
            }
            else
            if(k == "Fonts")
            {
                this.Fonts = Object.assign(this._DefaultFonts, o[k]);
            }
            else
            if(k == "FontSizes")
            {
                this.FontSizes = Object.assign(this._DefaultFontSizes, o[k]);
            }
            else
            if(typeof(o[k]) == "object" && this[k])
            {
                if(this[k].Copy)
                    this[k].Copy(o[k]); // copy Vec2, otherwise no prototype
                else
                    this[k] = o[k]; // Fonts, FontSizes should be okay here
            }
            else
                this[k] = o[k];
        }
    }

    GetSchemeColorNames()
    {
        return Object.keys(this.Colors).sort();
    }

    SetColorScheme(name)
    {
        // name = "DebugColors";
        this.ColorScheme = name;
        this.Colors = ColorSchemes[name];
    }

    Clone()
    {
        let s = Object.assign({}, this);
        s.Fonts = Object.assign({}, this.Fonts);
        s.Colors = {};
        for(let cnm in this.Colors)
            s.Colors[cnm] = this.Colors[cnm].Clone();
        return s;
    }

    GetFont(field)
    {
        let fdesc = this.Fonts[field];
        let nm = fdesc[0];
        let sz = fdesc[1];
        let weight = fdesc[2];
        if(typeof(sz) == "string")
            sz = this.FontSizes[sz];
        return this._fontAtlas.GetFont(nm, sz, weight); // also accepts style
    }

    SetFont(field, font)
    {
        this.Fonts[field] = [font.Family, font.Size, font.Weight];
        this._imgui.MarkIniSettingsDirty();
    }

    GetFontSize(nm) // GetFontSize("Default")
    {
        return this.FontSizes[nm];
    }

    SetFontSize(nm, sz) // SetFontSize("Default", 12)
    {
        this.FontSizes[nm] = sz;
        this._imgui.MarkIniSettingsDirty();
    }

    GetColor(field)
    {
        let c = this.Colors[field];
        if(c == undefined)
        {
            console.warn("unknown style color " + field);
            c = this.Colors._DEBUG0;
        }
        if(this.Alpha == 1)
            return c;
        else
        {
            c = c.Clone();
            c.a = this.Alpha;
            return c;
        }
    }

    MarkDirty()
    {
        this._imgui.MarkIniSettingsDirty();
    }

    ScaleAllSizes(factor)
    {
        this.WindowPadding.Mult(factor).Floor();
        this.WindowRounding = Math.floor(this.WindowRounding * factor);
        this.WindowMinSize.Mult(factor).Floor();
        this.ChildRounding = Math.floor(this.ChildRounding * factor);
        this.PopupRounding = Math.floor(this.PopupRounding * factor);
        this.FramePadding.Mult(factor).Floor();
        this.FrameRounding = Math.floor(this.FrameRounding * factor);
        this.ItemSpacing.Mult(factor).Floor();
        this.ItemInnerSpacing.Mult(factor).Floor();
        this.TouchExtraPadding.Mult(factor).Floor();
        this.IndentSpacing = Math.floor(this.IndentSpacing * factor);
        this.ColumnsMinSpacing = Math.floor(this.ColumnsMinSpacing * factor);
        this.ScrollbarSize = Math.floor(this.ScrollbarSize * factor);
        this.ScrollbarRounding = Math.floor(this.ScrollbarRounding * factor);
        this.GrabMinSize = Math.floor(this.GrabMinSize * factor);
        this.GrabRounding = Math.floor(this.GrabRounding * factor);
        this.TabRounding = Math.floor(this.TabRounding * factor);
        this.DisplayWindowPadding.Mult(factor).Floor();
        this.DisplaySafeAreaPadding.Mult(factor).Floor();
        this.MouseCursorScale = Math.floor(this.MouseCursorScale * factor);
    }
}

export default Style;
