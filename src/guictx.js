import {Vec2, Rect} from "./types.js";
import { ColorEditFlags, CondFlags } from "./flags.js";
import { InputSource, NavLayer, NavForward, Dir,
        MouseCursor, LogType,
} from "./enums.js";
import {IO} from "./io.js";
import {Style} from "./style.js";
import {NextWindowData} from "./window.js";
import {Color} from "./color.js";
import {Payload} from "./dragdrop.js";
import {DrawList} from "./drawlist.js";
import {NavMoveResult} from "./nav.js";
import {InputTextState} from "./widgets/inputtext.js";
import {WindowsSettingsHandler} from "./settings.js";
import {ArrayEx} from "./arrayex.js";

export class GuiContext
{
    constructor(imgui, canvas, appname="imgui-njs")
    {
        this.canvas = canvas;
        this.AppName = appname;
        this.Initialized = true;
        this.FrameScopeActive = false; // Set by NewFrame(), cleared by EndFrame()
        this.FrameScopePushedImplicitWindow = false;
        this.IO = new IO(imgui, canvas, appname);
        this.Style = new Style(this.IO.Fonts, imgui);
        this.Font = null;
        this.FontSize = 0;
        this.FontLineHeight = 0; // Just Size*Pct
        this.Time = 0.;
        this.FrameCount = 0;
        this.FrameCountEnded = -1;
        this.FrameCountRendered = -1;
        this.Windows = new ArrayEx();
        this.WindowsFocusOrder = new ArrayEx();
        this.WindowsSortBuffer = new ArrayEx();
        this.CurrentWindowStack = new ArrayEx();
        this.WindowsByName = {};
        this.WindowsActiveCount = 0;
        this.CurrentWindow = null; // Begin drawin into
        this.HoveredWindow = null; // Will catch mouse inputs
        this.HoveredRootWindow = null; // Will catch mouse inputs (for focus/move)
        this.HoveredId = 0; // Hovered Widget
        this.HoveredIdAllowOverlap = false;
        this.HoveredIdPreviousFrame = 0;
        this.HoveredIdTimer = 0; // contiguous hovering time
        this.HoveredIdNotActiveTimer = 0.;
        this.ActiveId = 0;
        this.ActiveIdPreviousFrame = 0;
        this.ActiveIdIsAlive = 0;
        this.ActiveIdTimer = 0.;
        this.ActiveIdIsJustActivated = false;
        this.ActiveIdAllowOverlap = false;
        this.ActiveIdHasBeenPressed = false;
        this.ActiveIdHasBeenEdited = false;
        this.ActiveIdPreviousFrameIsAlive = false;
        this.ActiveIdPreviousFrameHasBeenEdited = false;
        this.ActiveIdAllowNavDirFlags = 0;
        this.ActiveIdBlockNavInputFlags = 0;
        this.ActiveIdClickOffset = new Vec2(-1,-1);
        this.ActiveIdWindow = null;
        this.ActiveIdPreviousFrameWindow = null;
        this.ActiveIdSource = InputSource.None;
        this.LastActiveId = 0;
        this.LastActiveIdTimer = 0.;
        this.LastValidMousePos = new Vec2(0., 0.);
        this.MovingWindow = null;
        this.ColorModifiers = new ArrayEx();
        this.StyleModifiers = new ArrayEx();
        this.FontStack = new ArrayEx();
        this.OpenPopupStack = new ArrayEx();
        this.BeginPopupStack = new ArrayEx();
        this.NextWindowData = new NextWindowData();
        this.NextTreeNodeOpenVal = false;
        this.NextTreeNodeOpenCond = CondFlags.None;

        // Navigation data (from gamepad/keyboard)
        this.NavWindow = null; // focused window
        this.NavId = 0;  // GuiID
        this.NavActivateId = 0;
        this.NavActivateDownId = 0;
        this.NavActivatePressedId = 0;
        this.NavInputId = 0;
        this.NavJustTabbedId = 0;
        this.NavJustMovedToId = 0;
        this.NavJustMovedToSelectScopeId = 0;
        this.NavNextActivateId = 0;
        this.NavInputSource = InputSource.None;
        this.NavScoringRectScreen = new Rect();
        this.NavScoringCount = 0;
        this.NavWindowingTarget = null; // window
        this.NavWindowingTargetAnim = null; // window
        this.NavWindowingList = null; // window
        this.NavWindowingTimer = 0.;
        this.NavWindowingHighlightAlpha = 0.;
        this.NavWindowingToggleLayer = false;
        this.NavLayer = NavLayer.Main;
            // Layer we are navigating on. For now the system is hard-coded for
            // 0=main contents and 1=menu/title bar, may expose layers later.
        this.NavIdTabCounter = Number.MAX_SAFE_INTEGER;
            // == NavWindow->DC.FocusIdxTabCounter at time of NavId processing
        this.NavIdIsAlive = false;
        this.NavMousePosDirty = false;
        this.NavDisableHighlight = true;
        this.NavDisableMouseHover = false;
        this.NavAnyRequest = false;
        this.NavInitRequest = false;
        this.NavInitRequestFromMove = false;
        this.NavInitResultId = 0;
        this.NavMoveFromClampedRefRect = false;
        this.NavMoveRequest = false;
        this.NavMoveRequestFlags = 0;
        this.NavMoveRequestForward = NavForward.None;
        this.NavMoveDir = Dir.None;
        this.NavMoveDirLast = Dir.None;
        this.NavMoveClipDir = Dir.None;
        this.NavMoveResultLocal = new NavMoveResult();
            // Best move request candidate within NavWindow
        this.NavMoveResultLocalVisibleSet = new NavMoveResult();
            // Best move request candidate within NavWindow that are mostly
            // visible (when using ImGuiNavMoveFlags_AlsoScoreVisibleSet flag)
        this.NavMoveResultOther = new NavMoveResult();
            // Best move request candidate within NavWindow's flattened hierarchy
            // (when using WindowFlags.NavFlattened flag)

        // tabbing system (older than nav, ...)
        this.FocusRequestCurrWindow = null;
        this.FocusRequestNextWindow = null;
        this.FocusRequestCurrCounterAll = Number.MAX_SAFE_INTEGER;
        this.FocusRequestCurrCounterTab = Number.MAX_SAFE_INTEGER;
        this.FocusRequestNextCounterAll = Number.MAX_SAFE_INTEGER;
        this.FocusRequestNextCounterTab = Number.MAX_SAFE_INTEGER;
        this.FocusTabPressed = false;

        this.DimBgRatio = 0.; // [0,1] for anim fades
        this.DrawList = new DrawList(imgui, "guictx");

        // BackgroundDrawList
        // ForegroundDrawList
        this.MouseCursor = MouseCursor.Arrow;

        // Drag and Drop
        this.DragDropActive = false;
        this.DragDropWithinSourceOrTarget = false;
        this.DragDropSourceFlags = 0;
        this.DragDropSourceFrameCount = -1;
        this.DragDropMouseButton = -1;
        this.DragDropPayload = new Payload();
        this.DragDropTargetRect = new Rect();
        this.DragDropTargetId = 0;
        this.DragDropAcceptFlags = 0;
        this.DragDropAcceptIdCurrRectSurface = 0.;
        this.ActiveIdDragDropAcceptIdCurr = 0;
        this.DragDropAcceptIdPrev = 0;
        this.DragDropAcceptFrameCount = -1;

        // Tab bars
        this.TabBars = {}; // pool of TabBar
        this.CurrentTabBar = null;
        this.CurrentTabBarStack = new ArrayEx(); // of TabBarRef
        this.TabSortByWidthBuffer = new ArrayEx(); // of TabBarSortItem

        // Widget state
        this.InputTextState = new InputTextState(this); // of InputTextState
        this.InputTextPasswordFont = null;
        this.ScalarAsInputTextId = 0; // id of temporary text input when ctrl+clicking
        this.ColorEditOptions = ColorEditFlags.OptionsDefault;
        this.ColorPickerRef = Color.rgba();
        this.DragCurrentAccumDirty = false;
        this.DragCurrentAccum = 0.;
        this.DragSpeedDefaultRatio = 1. / 100.;
        this.ScrollbarClickDeltaToGrabCenter = new Vec2(0., 0.);
        this.TooltipOverrideCount = 0;
        this.PrivateClipboard = null; // char array

        // Range-select/multie-select (unused?)
        this.MultiSelectScopeId = 0;

        // Platform input method support
        this.PlatformImePos = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
        this.PlatformImeLastPos = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);

        // Settings
        this.SettingsLoaded = false;
        this.SettingsDirtyTimer = 0.;
        this.SettingsHandlers = new ArrayEx(); // list of SettingsHandler
        this.SettingsHandlers.push(new WindowsSettingsHandler());
        this.SettingsHandlers.push(this.Style);
        this.SettingsWindows = new ArrayEx();// list of WindowSettings
        this.SettingsIniData = ""; // json-string of all settings

        // Logging
        this.LogEnabled = false;
        this.LogType = LogType.None;
        this.LogFile = null;
        this.LogLinePosY = Number.MAX_VALUE;
        this.LogLineFirstItem = false;
        this.LogDepthRef = 0;
        this.LogDepthToExpand = this.LogDepthToExpandDefault = 2;

        // Misc
        this.FramerateSecPerFrame = new ArrayEx(); // keep two seconds of framerates for avg
        this.FramerateSecPerFrame.length = 120;
        this.FramerateSecPerFrame.fill(0);
        this.FramerateSecPerFrameIdx = 0;
        this.FramerateSecPerFrameAccum = 0.;
        this.WantCaptureMouseNextFrame = -1;
        this.WantCaptureKeyboardNextFrame = -1;
        this.WantTextInputNextFrame = -1;

        this.TempBuffer = new ArrayEx();
    }

    NewFrame(time)
    {
        this.IO.NewFrame(time);
    }

    EndFrame()
    {
        this.IO.EndFrame();
    }
}
export default GuiContext;