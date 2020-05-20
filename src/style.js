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
        // NB: all member variables that don't begin with _ are part
        //  of the serialization.
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
        this.LabelWidth = "MMMMMM"; // aka 6em
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
            "Med": ["Exo", "Med", "normal"],
            "Std": ["Exo", "Std", "normal"],
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
            AccountBalance: String.fromCharCode(0x0e84f),
            AddLocation: String.fromCharCode(0x0e567),
            BorderColor: String.fromCharCode(0x0e22b), // edit-like
            Build: String.fromCharCode(0x0e869),
            Camera: String.fromCharCode(0x0ea3f), // shutter
            ChevronLeft: String.fromCharCode(0x0e5cb), 
            ChevronRight: String.fromCharCode(0x0e5cc),
            Close: String.fromCharCode(0x0e5cd),
            CloudDownload: String.fromCharCode(0x0e2c0),
            CloudUpload: String.fromCharCode(0x0e2c3),
            CreateNewFolder: String.fromCharCode(0x0e2cc),
            DateRange: String.fromCharCode(0x0e916),
            Delete: String.fromCharCode(0x0e872), // trash
            DeleteSweep: String.fromCharCode(0x0e16c),
            Edit: String.fromCharCode(0x0e3c9),
            Error: String.fromCharCode(0x0e000),
            ErrorOutline: String.fromCharCode(0x0e001),
            Eye: String.fromCharCode(0x0e8f4),
            Folder: String.fromCharCode(0x0e2c7),
            FolderOpen: String.fromCharCode(0x0e2c8),
            Help: String.fromCharCode(0x0e887),
            HelpOutline: String.fromCharCode(0x0e8fd),
            Info: String.fromCharCode(0x0e88e),
            InfoOutline: String.fromCharCode(0x0e88f),
            ImportExport: String.fromCharCode(0x0e0c3),
            LibraryBooks: String.fromCharCode(0x0e02f),
            NavFwd: String.fromCharCode(0x0e315), // keyboard_arrow_right
            NavRev: String.fromCharCode(0x0e314), // keyboard_arrow_left
            Menu: String.fromCharCode(0x0e5d2), // ie hamburger
            MenuOpen: String.fromCharCode(0x0e9bd),
            Mute: String.fromCharCode(0x0e04f),
            Monitization: String.fromCharCode(0x0e263), // $ dollar
            MyLocation: String.fromCharCode(0x0e050),
            NoMute: String.fromCharCode(0x0e050),
            Note: String.fromCharCode(0x0e3a1), // audiotrack, musical_note
            Notes: String.fromCharCode(0x0e26c), // subject
            OpenInBrowser: String.fromCharCode(0x0e89d),
            People: String.fromCharCode(0x0ea21), // people-alt
            Pause: String.fromCharCode(0x0e034),
            PickFile: String.fromCharCode(0x0e2c8),
            PickImage: String.fromCharCode(0x0e43e), // add_photograph_alt
            Play: String.fromCharCode(0x0e037),
            Refresh: String.fromCharCode(0x0e5d5),
            Settings: String.fromCharCode(0x0e8b8),
            StarFilled: String.fromCharCode(0x0e838),
            StarOutline: String.fromCharCode(0x0e83a),
            Stop: String.fromCharCode(0x0e047),
            Sync: String.fromCharCode(0x0e627),
            Trash: String.fromCharCode(0x0e872), // delete
            UnfoldLess: String.fromCharCode(0x0e5d6), // unfold_less
            UnfoldMore: String.fromCharCode(0x0e5d7), // unfold_more
            ViewComfy: String.fromCharCode(0x0e42a), // tighter grid
            ViewGrid: String.fromCharCode(0x0e8f0), // aka Module
            ViewHeadline: String.fromCharCode(0x0e872),
            ViewList: String.fromCharCode(0x0e872),
            ViewModule: String.fromCharCode(0x0e8f0), // aka Grid
            Warning: String.fromCharCode(0x0e002),
        };
        initMaterialIcons(this._MIcons);

        // unicode character codes (font-independent-ish)
        // https://graphemica.com/
        this._UIcons =
        {
            NavIcon: String.fromCodePoint(0x2630), //  hamburger
            InfoIcon: String.fromCodePoint(0x2139), // 0x1f6c8 circled information source
            GearIcon: String.fromCodePoint(0x2699),
            RightArrow: String.fromCodePoint(0x25B6),
            SmallRightArrow: String.fromCodePoint(0x25B8),
            RightArrow2: String.fromCodePoint(0x25BA),
            DownArrow: String.fromCodePoint(0x25BC),
            SmallDownArrow: String.fromCodePoint(0x25BE),
            Tricolon: String.fromCodePoint(0x205D), // 3 vertical dots (menu)
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

function initMaterialIcons(iconTable)
{
    //  from:
    // https://github.com/google/material-design-icons/blob/master/iconfont/codepoints
    const iconDump = `
3d_rotation e84d
ac_unit eb3b
access_alarm e190
access_alarms e191
access_time e192
accessibility e84e
accessible e914
account_balance e84f
account_balance_wallet e850
account_box e851
account_circle e853
adb e60e
add e145
add_a_photo e439
add_alarm e193
add_alert e003
add_box e146
add_circle e147
add_circle_outline e148
add_location e567
add_shopping_cart e854
add_to_photos e39d
add_to_queue e05c
adjust e39e
airline_seat_flat e630
airline_seat_flat_angled e631
airline_seat_individual_suite e632
airline_seat_legroom_extra e633
airline_seat_legroom_normal e634
airline_seat_legroom_reduced e635
airline_seat_recline_extra e636
airline_seat_recline_normal e637
airplanemode_active e195
airplanemode_inactive e194
airplay e055
airport_shuttle eb3c
alarm e855
alarm_add e856
alarm_off e857
alarm_on e858
album e019
all_inclusive eb3d
all_out e90b
android e859
announcement e85a
apps e5c3
archive e149
arrow_back e5c4
arrow_downward e5db
arrow_drop_down e5c5
arrow_drop_down_circle e5c6
arrow_drop_up e5c7
arrow_forward e5c8
arrow_upward e5d8
art_track e060
aspect_ratio e85b
assessment e85c
assignment e85d
assignment_ind e85e
assignment_late e85f
assignment_return e860
assignment_returned e861
assignment_turned_in e862
assistant e39f
assistant_photo e3a0
attach_file e226
attach_money e227
attachment e2bc
audiotrack e3a1
autorenew e863
av_timer e01b
backspace e14a
backup e864
battery_alert e19c
battery_charging_full e1a3
battery_full e1a4
battery_std e1a5
battery_unknown e1a6
beach_access eb3e
beenhere e52d
block e14b
bluetooth e1a7
bluetooth_audio e60f
bluetooth_connected e1a8
bluetooth_disabled e1a9
bluetooth_searching e1aa
blur_circular e3a2
blur_linear e3a3
blur_off e3a4
blur_on e3a5
book e865
bookmark e866
bookmark_border e867
border_all e228
border_bottom e229
border_clear e22a
border_color e22b
border_horizontal e22c
border_inner e22d
border_left e22e
border_outer e22f
border_right e230
border_style e231
border_top e232
border_vertical e233
branding_watermark e06b
brightness_1 e3a6
brightness_2 e3a7
brightness_3 e3a8
brightness_4 e3a9
brightness_5 e3aa
brightness_6 e3ab
brightness_7 e3ac
brightness_auto e1ab
brightness_high e1ac
brightness_low e1ad
brightness_medium e1ae
broken_image e3ad
brush e3ae
bubble_chart e6dd
bug_report e868
build e869
burst_mode e43c
business e0af
business_center eb3f
cached e86a
cake e7e9
call e0b0
call_end e0b1
call_made e0b2
call_merge e0b3
call_missed e0b4
call_missed_outgoing e0e4
call_received e0b5
call_split e0b6
call_to_action e06c
camera e3af
camera_alt e3b0
camera_enhance e8fc
camera_front e3b1
camera_rear e3b2
camera_roll e3b3
cancel e5c9
card_giftcard e8f6
card_membership e8f7
card_travel e8f8
casino eb40
cast e307
cast_connected e308
center_focus_strong e3b4
center_focus_weak e3b5
change_history e86b
chat e0b7
chat_bubble e0ca
chat_bubble_outline e0cb
check e5ca
check_box e834
check_box_outline_blank e835
check_circle e86c
chevron_left e5cb
chevron_right e5cc
child_care eb41
child_friendly eb42
chrome_reader_mode e86d
class e86e
clear e14c
clear_all e0b8
close e5cd
closed_caption e01c
cloud e2bd
cloud_circle e2be
cloud_done e2bf
cloud_download e2c0
cloud_off e2c1
cloud_queue e2c2
cloud_upload e2c3
code e86f
collections e3b6
collections_bookmark e431
color_lens e3b7
colorize e3b8
comment e0b9
compare e3b9
compare_arrows e915
computer e30a
confirmation_number e638
contact_mail e0d0
contact_phone e0cf
contacts e0ba
content_copy e14d
content_cut e14e
content_paste e14f
control_point e3ba
control_point_duplicate e3bb
copyright e90c
create e150
create_new_folder e2cc
credit_card e870
crop e3be
crop_16_9 e3bc
crop_3_2 e3bd
crop_5_4 e3bf
crop_7_5 e3c0
crop_din e3c1
crop_free e3c2
crop_landscape e3c3
crop_original e3c4
crop_portrait e3c5
crop_rotate e437
crop_square e3c6
dashboard e871
data_usage e1af
date_range e916
dehaze e3c7
delete e872
delete_forever e92b
delete_sweep e16c
description e873
desktop_mac e30b
desktop_windows e30c
details e3c8
developer_board e30d
developer_mode e1b0
device_hub e335
devices e1b1
devices_other e337
dialer_sip e0bb
dialpad e0bc
directions e52e
directions_bike e52f
directions_boat e532
directions_bus e530
directions_car e531
directions_railway e534
directions_run e566
directions_subway e533
directions_transit e535
directions_walk e536
disc_full e610
dns e875
do_not_disturb e612
do_not_disturb_alt e611
do_not_disturb_off e643
do_not_disturb_on e644
dock e30e
domain e7ee
done e876
done_all e877
donut_large e917
donut_small e918
drafts e151
drag_handle e25d
drive_eta e613
dvr e1b2
edit e3c9
edit_location e568
eject e8fb
email e0be
enhanced_encryption e63f
equalizer e01d
error e000
error_outline e001
euro_symbol e926
ev_station e56d
event e878
event_available e614
event_busy e615
event_note e616
event_seat e903
exit_to_app e879
expand_less e5ce
expand_more e5cf
explicit e01e
explore e87a
exposure e3ca
exposure_neg_1 e3cb
exposure_neg_2 e3cc
exposure_plus_1 e3cd
exposure_plus_2 e3ce
exposure_zero e3cf
extension e87b
face e87c
fast_forward e01f
fast_rewind e020
favorite e87d
favorite_border e87e
featured_play_list e06d
featured_video e06e
feedback e87f
fiber_dvr e05d
fiber_manual_record e061
fiber_new e05e
fiber_pin e06a
fiber_smart_record e062
file_download e2c4
file_upload e2c6
filter e3d3
filter_1 e3d0
filter_2 e3d1
filter_3 e3d2
filter_4 e3d4
filter_5 e3d5
filter_6 e3d6
filter_7 e3d7
filter_8 e3d8
filter_9 e3d9
filter_9_plus e3da
filter_b_and_w e3db
filter_center_focus e3dc
filter_drama e3dd
filter_frames e3de
filter_hdr e3df
filter_list e152
filter_none e3e0
filter_tilt_shift e3e2
filter_vintage e3e3
find_in_page e880
find_replace e881
fingerprint e90d
first_page e5dc
fitness_center eb43
flag e153
flare e3e4
flash_auto e3e5
flash_off e3e6
flash_on e3e7
flight e539
flight_land e904
flight_takeoff e905
flip e3e8
flip_to_back e882
flip_to_front e883
folder e2c7
folder_open e2c8
folder_shared e2c9
folder_special e617
font_download e167
format_align_center e234
format_align_justify e235
format_align_left e236
format_align_right e237
format_bold e238
format_clear e239
format_color_fill e23a
format_color_reset e23b
format_color_text e23c
format_indent_decrease e23d
format_indent_increase e23e
format_italic e23f
format_line_spacing e240
format_list_bulleted e241
format_list_numbered e242
format_paint e243
format_quote e244
format_shapes e25e
format_size e245
format_strikethrough e246
format_textdirection_l_to_r e247
format_textdirection_r_to_l e248
format_underlined e249
forum e0bf
forward e154
forward_10 e056
forward_30 e057
forward_5 e058
free_breakfast eb44
fullscreen e5d0
fullscreen_exit e5d1
functions e24a
g_translate e927
gamepad e30f
games e021
gavel e90e
gesture e155
get_app e884
gif e908
golf_course eb45
gps_fixed e1b3
gps_not_fixed e1b4
gps_off e1b5
grade e885
gradient e3e9
grain e3ea
graphic_eq e1b8
grid_off e3eb
grid_on e3ec
group e7ef
group_add e7f0
group_work e886
hd e052
hdr_off e3ed
hdr_on e3ee
hdr_strong e3f1
hdr_weak e3f2
headset e310
headset_mic e311
healing e3f3
hearing e023
help e887
help_outline e8fd
high_quality e024
highlight e25f
highlight_off e888
history e889
home e88a
hot_tub eb46
hotel e53a
hourglass_empty e88b
hourglass_full e88c
http e902
https e88d
image e3f4
image_aspect_ratio e3f5
import_contacts e0e0
import_export e0c3
important_devices e912
inbox e156
indeterminate_check_box e909
info e88e
info_outline e88f
input e890
insert_chart e24b
insert_comment e24c
insert_drive_file e24d
insert_emoticon e24e
insert_invitation e24f
insert_link e250
insert_photo e251
invert_colors e891
invert_colors_off e0c4
iso e3f6
keyboard e312
keyboard_arrow_down e313
keyboard_arrow_left e314
keyboard_arrow_right e315
keyboard_arrow_up e316
keyboard_backspace e317
keyboard_capslock e318
keyboard_hide e31a
keyboard_return e31b
keyboard_tab e31c
keyboard_voice e31d
kitchen eb47
label e892
label_outline e893
landscape e3f7
language e894
laptop e31e
laptop_chromebook e31f
laptop_mac e320
laptop_windows e321
last_page e5dd
launch e895
layers e53b
layers_clear e53c
leak_add e3f8
leak_remove e3f9
lens e3fa
library_add e02e
library_books e02f
library_music e030
lightbulb_outline e90f
line_style e919
line_weight e91a
linear_scale e260
link e157
linked_camera e438
list e896
live_help e0c6
live_tv e639
local_activity e53f
local_airport e53d
local_atm e53e
local_bar e540
local_cafe e541
local_car_wash e542
local_convenience_store e543
local_dining e556
local_drink e544
local_florist e545
local_gas_station e546
local_grocery_store e547
local_hospital e548
local_hotel e549
local_laundry_service e54a
local_library e54b
local_mall e54c
local_movies e54d
local_offer e54e
local_parking e54f
local_pharmacy e550
local_phone e551
local_pizza e552
local_play e553
local_post_office e554
local_printshop e555
local_see e557
local_shipping e558
local_taxi e559
location_city e7f1
location_disabled e1b6
location_off e0c7
location_on e0c8
location_searching e1b7
lock e897
lock_open e898
lock_outline e899
looks e3fc
looks_3 e3fb
looks_4 e3fd
looks_5 e3fe
looks_6 e3ff
looks_one e400
looks_two e401
loop e028
loupe e402
low_priority e16d
loyalty e89a
mail e158
mail_outline e0e1
map e55b
markunread e159
markunread_mailbox e89b
memory e322
menu e5d2
merge_type e252
message e0c9
mic e029
mic_none e02a
mic_off e02b
mms e618
mode_comment e253
mode_edit e254
monetization_on e263
money_off e25c
monochrome_photos e403
mood e7f2
mood_bad e7f3
more e619
more_horiz e5d3
more_vert e5d4
motorcycle e91b
mouse e323
move_to_inbox e168
movie e02c
movie_creation e404
movie_filter e43a
multiline_chart e6df
music_note e405
music_video e063
my_location e55c
nature e406
nature_people e407
navigate_before e408
navigate_next e409
navigation e55d
near_me e569
network_cell e1b9
network_check e640
network_locked e61a
network_wifi e1ba
new_releases e031
next_week e16a
nfc e1bb
no_encryption e641
no_sim e0cc
not_interested e033
note e06f
note_add e89c
notifications e7f4
notifications_active e7f7
notifications_none e7f5
notifications_off e7f6
notifications_paused e7f8
offline_pin e90a
ondemand_video e63a
opacity e91c
open_in_browser e89d
open_in_new e89e
open_with e89f
pages e7f9
pageview e8a0
palette e40a
pan_tool e925
panorama e40b
panorama_fish_eye e40c
panorama_horizontal e40d
panorama_vertical e40e
panorama_wide_angle e40f
party_mode e7fa
pause e034
pause_circle_filled e035
pause_circle_outline e036
payment e8a1
people e7fb
people_outline e7fc
perm_camera_mic e8a2
perm_contact_calendar e8a3
perm_data_setting e8a4
perm_device_information e8a5
perm_identity e8a6
perm_media e8a7
perm_phone_msg e8a8
perm_scan_wifi e8a9
person e7fd
person_add e7fe
person_outline e7ff
person_pin e55a
person_pin_circle e56a
personal_video e63b
pets e91d
phone e0cd
phone_android e324
phone_bluetooth_speaker e61b
phone_forwarded e61c
phone_in_talk e61d
phone_iphone e325
phone_locked e61e
phone_missed e61f
phone_paused e620
phonelink e326
phonelink_erase e0db
phonelink_lock e0dc
phonelink_off e327
phonelink_ring e0dd
phonelink_setup e0de
photo e410
photo_album e411
photo_camera e412
photo_filter e43b
photo_library e413
photo_size_select_actual e432
photo_size_select_large e433
photo_size_select_small e434
picture_as_pdf e415
picture_in_picture e8aa
picture_in_picture_alt e911
pie_chart e6c4
pie_chart_outlined e6c5
pin_drop e55e
place e55f
play_arrow e037
play_circle_filled e038
play_circle_outline e039
play_for_work e906
playlist_add e03b
playlist_add_check e065
playlist_play e05f
plus_one e800
poll e801
polymer e8ab
pool eb48
portable_wifi_off e0ce
portrait e416
power e63c
power_input e336
power_settings_new e8ac
pregnant_woman e91e
present_to_all e0df
print e8ad
priority_high e645
public e80b
publish e255
query_builder e8ae
question_answer e8af
queue e03c
queue_music e03d
queue_play_next e066
radio e03e
radio_button_checked e837
radio_button_unchecked e836
rate_review e560
receipt e8b0
recent_actors e03f
record_voice_over e91f
redeem e8b1
redo e15a
refresh e5d5
remove e15b
remove_circle e15c
remove_circle_outline e15d
remove_from_queue e067
remove_red_eye e417
remove_shopping_cart e928
reorder e8fe
repeat e040
repeat_one e041
replay e042
replay_10 e059
replay_30 e05a
replay_5 e05b
reply e15e
reply_all e15f
report e160
report_problem e8b2
restaurant e56c
restaurant_menu e561
restore e8b3
restore_page e929
ring_volume e0d1
room e8b4
room_service eb49
rotate_90_degrees_ccw e418
rotate_left e419
rotate_right e41a
rounded_corner e920
router e328
rowing e921
rss_feed e0e5
rv_hookup e642
satellite e562
save e161
scanner e329
schedule e8b5
school e80c
screen_lock_landscape e1be
screen_lock_portrait e1bf
screen_lock_rotation e1c0
screen_rotation e1c1
screen_share e0e2
sd_card e623
sd_storage e1c2
search e8b6
security e32a
select_all e162
send e163
sentiment_dissatisfied e811
sentiment_neutral e812
sentiment_satisfied e813
sentiment_very_dissatisfied e814
sentiment_very_satisfied e815
settings e8b8
settings_applications e8b9
settings_backup_restore e8ba
settings_bluetooth e8bb
settings_brightness e8bd
settings_cell e8bc
settings_ethernet e8be
settings_input_antenna e8bf
settings_input_component e8c0
settings_input_composite e8c1
settings_input_hdmi e8c2
settings_input_svideo e8c3
settings_overscan e8c4
settings_phone e8c5
settings_power e8c6
settings_remote e8c7
settings_system_daydream e1c3
settings_voice e8c8
share e80d
shop e8c9
shop_two e8ca
shopping_basket e8cb
shopping_cart e8cc
short_text e261
show_chart e6e1
shuffle e043
signal_cellular_4_bar e1c8
signal_cellular_connected_no_internet_4_bar e1cd
signal_cellular_no_sim e1ce
signal_cellular_null e1cf
signal_cellular_off e1d0
signal_wifi_4_bar e1d8
signal_wifi_4_bar_lock e1d9
signal_wifi_off e1da
sim_card e32b
sim_card_alert e624
skip_next e044
skip_previous e045
slideshow e41b
slow_motion_video e068
smartphone e32c
smoke_free eb4a
smoking_rooms eb4b
sms e625
sms_failed e626
snooze e046
sort e164
sort_by_alpha e053
spa eb4c
space_bar e256
speaker e32d
speaker_group e32e
speaker_notes e8cd
speaker_notes_off e92a
speaker_phone e0d2
spellcheck e8ce
star e838
star_border e83a
star_half e839
stars e8d0
stay_current_landscape e0d3
stay_current_portrait e0d4
stay_primary_landscape e0d5
stay_primary_portrait e0d6
stop e047
stop_screen_share e0e3
storage e1db
store e8d1
store_mall_directory e563
straighten e41c
streetview e56e
strikethrough_s e257
style e41d
subdirectory_arrow_left e5d9
subdirectory_arrow_right e5da
subject e8d2
subscriptions e064
subtitles e048
subway e56f
supervisor_account e8d3
surround_sound e049
swap_calls e0d7
swap_horiz e8d4
swap_vert e8d5
swap_vertical_circle e8d6
switch_camera e41e
switch_video e41f
sync e627
sync_disabled e628
sync_problem e629
system_update e62a
system_update_alt e8d7
tab e8d8
tab_unselected e8d9
tablet e32f
tablet_android e330
tablet_mac e331
tag_faces e420
tap_and_play e62b
terrain e564
text_fields e262
text_format e165
textsms e0d8
texture e421
theaters e8da
thumb_down e8db
thumb_up e8dc
thumbs_up_down e8dd
time_to_leave e62c
timelapse e422
timeline e922
timer e425
timer_10 e423
timer_3 e424
timer_off e426
title e264
toc e8de
today e8df
toll e8e0
tonality e427
touch_app e913
toys e332
track_changes e8e1
traffic e565
train e570
tram e571
transfer_within_a_station e572
transform e428
translate e8e2
trending_down e8e3
trending_flat e8e4
trending_up e8e5
tune e429
turned_in e8e6
turned_in_not e8e7
tv e333
unarchive e169
undo e166
unfold_less e5d6
unfold_more e5d7
update e923
usb e1e0
verified_user e8e8
vertical_align_bottom e258
vertical_align_center e259
vertical_align_top e25a
vibration e62d
video_call e070
video_label e071
video_library e04a
videocam e04b
videocam_off e04c
videogame_asset e338
view_agenda e8e9
view_array e8ea
view_carousel e8eb
view_column e8ec
view_comfy e42a
view_compact e42b
view_day e8ed
view_headline e8ee
view_list e8ef
view_module e8f0
view_quilt e8f1
view_stream e8f2
view_week e8f3
vignette e435
visibility e8f4
visibility_off e8f5
voice_chat e62e
voicemail e0d9
volume_down e04d
volume_mute e04e
volume_off e04f
volume_up e050
vpn_key e0da
vpn_lock e62f
wallpaper e1bc
warning e002
watch e334
watch_later e924
wb_auto e42c
wb_cloudy e42d
wb_incandescent e42e
wb_iridescent e436
wb_sunny e430
wc e63d
web e051
web_asset e069
weekend e16b
whatshot e80e
widgets e1bd
wifi e63e
wifi_lock e1e1
wifi_tethering e1e2
work e8f9
wrap_text e25b
youtube_searched_for e8fa
zoom_in e8ff
zoom_out e900
zoom_out_map e56b
        `.split("\n").forEach( (v) =>
    {
        if(v != "")
        {
            let fields = v.split(" ");
            if(fields.length == 2)
            {
                let num = Number("0x" + fields[1]);
                iconTable[fields[0]] = String.fromCharCode(num);
            }
        }
    });
}

export default Style;
