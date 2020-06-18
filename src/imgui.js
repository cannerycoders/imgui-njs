import {GuiContext} from "./guictx.js";
import {CondFlags, HoveredFlags,
        ItemFlags, ConfigFlags, BackendFlags,
        ItemStatusFlags} from "./flags.js";
import {DragDropFlags} from "./dragdrop.js";
import {Key, MouseCursor} from "./enums.js";
import {ColorMod} from "./color.js";
import {Vec2, Rect} from "./types.js";
import {StyleMod} from "./style.js";
import {WindowFlags} from "./window.js";
import {ImguiMixins} from "./mixins.js";

/**
 * immediate-mode gui for html5 canvas interface follows
 * dear-imgui.
 */
export class Imgui extends ImguiMixins
{
    // we require a subset of 'navigator' interface: 
    //      platform, 
    //      clipboard.writeText, clipboard.readText
    constructor(canvas, appname="imgui-njs", appServices=navigator)
    {
        super();
        this.debug = true;
        if(!this.debug)
            console.assert = function() {};
        this.version = "0.1.0";
        this.version_imgui = "1.70 WIP";
        this.about = `imgui-njs: ${this.version}, dear-imgui: ${this.version_imgui}`;
        this.canvas = canvas;
        this.guictx = new GuiContext(this, canvas, appname);
        this.appServices = appServices; 
        this.Initialized = true;
    }

    // Main --------------
    /**
     * access the IO structure (mouse/keyboard/gamepad inputs, time, various configuration options/flags)
     */
    GetIO()
    {
        return this.guictx.IO;
    }

    /** access the Style structure (colors, sizes). Always use PushStyleCol(),
     * PushStyleVar() to modify style mid-frame.
     */
    GetStyle()
    {
        return this.guictx.Style;
    }

    GetStyleFont(nm)
    {
        return this.guictx.Style.GetFont(nm);
    }

    /** 
     * Start a new ImGui frame, you can submit any command from this point
     * until Render()/EndFrame().  Returns an experimental value that can
     * be used to bypass redraw. 
     */
    NewFrame(time)
    {
        let g = this.guictx;

        // g.NewFrame must happen before we reset volatile state
        //  (like MouseCursor)
        g.NewFrame(time); // aka g.IO.Newframe

        // Check user data
        // (We pass an error message in the assert expression to make it
        // visible to programmers who are not using a debugger, as most
        // assert handlers display their argument)
        if(this.debug)
        {
            console.assert(g.Initialized);
            console.assert(g.IO.DeltaTime > 0 || g.FrameCount == 0); // Need a positive DeltaTime!
            console.assert(g.FrameCount == 0 || g.FrameCountEnded == g.FrameCount);  // Forgot to call Render() or EndFrame() at the end of the previous frame?
            console.assert(g.IO.DisplaySize.x >= 0 && g.IO.DisplaySize.y >= 0);  // Invalid DisplaySize value!
            console.assert(g.IO.Fonts.Size() > 0); // Font Atlas not built.
            console.assert(g.Style.CurveTessellationTol > 0); // Invalid style setting!
            console.assert(g.Style.Alpha >= 0. && g.Style.Alpha <= 1);//  Invalid style setting. Alpha cannot be negative (allows us to avoid a few clamps in color computations)
            console.assert(g.Style.WindowMinSize.x >= 1. && g.Style.WindowMinSize.y >= 1.); // Invalid style setting.
            for (let n = 0; n < g.IO.KeyMap.length; n++)
                console.assert(g.IO.KeyMap[n] >= -1 && g.IO.KeyMap[n] < g.IO.KeysDown.length); // io.KeyMap[] contains an out of bound value (need to be 0..512, or -1 for unmapped key)

            // Perform simple check: required key mapping (we intentionally do NOT check all keys to not pressure user into setting up everything, but Space is required and was only recently added in 1.60 WIP)
            if (g.IO.ConfigFlags & ConfigFlags.NavEnableKeyboard)
                console.assert(g.IO.KeyMap[Key.Space]); // Key.Space is not mapped, required for keyboard navigation.
        }

        // Perform simple check: the beta io.ConfigWindowsResizeFromEdges option requires back-end to honor mouse cursor changes and set the ImGuiBackendFlags_HasMouseCursors flag accordingly.
        if (g.IO.ConfigWindowsResizeFromEdges && !(g.IO.BackendFlags & BackendFlags.HasMouseCursors))
            g.IO.ConfigWindowsResizeFromEdges = false;

        // Load settings on first frame (if not explicitly loaded manually before)
        if (!g.SettingsLoaded)
        {
            console.assert(g.SettingsWindows.length == 0);
            if (g.IO.IniFilename)
                this.LoadIniSettingsFromDisk(g.IO.IniFilename);
            g.SettingsLoaded = true;
        }

        // Save settings (with a delay after the last modification, so we don't
        // spam disk too much)
        if (g.SettingsDirtyTimer > 0.)
        {
            g.SettingsDirtyTimer -= g.IO.DeltaTime;
            if (g.SettingsDirtyTimer <= 0)
            {
                if (g.IO.IniFilename)
                    this.SaveIniSettingsToDisk(g.IO.IniFilename);
                else
                {
                    // Let user know they can call SaveIniSettingsToMemory().
                    // user will need to clear io.WantSaveIniSettings themselves.
                    g.IO.WantSaveIniSettings = true;
                }
                g.SettingsDirtyTimer = 0.;
            }
        }

        g.Time += g.IO.DeltaTime;
        g.FrameScopeActive = true;
        g.FrameCount += 1;
        g.TooltipOverrideCount = 0;
        g.WindowsActiveCount = 0;

        // Setup current font and draw list shared data
        g.IO.Fonts.Locked = true;
        this.SetFont(this.getDefaultFont());
        console.assert(g.Font.IsLoaded());

        // g.BackgroundDrawList.Clear();
        // g.BackgroundDrawList.PushTextureID(g.IO.Fonts.TexID);
        // g.BackgroundDrawList.PushClipRectFullScreen();
        // g.BackgroundDrawList.Flags = (g.Style.AntiAliasedLines ? ImDrawListFlags_AntiAliasedLines : 0) | (g.Style.AntiAliasedFill ? ImDrawListFlags_AntiAliasedFill : 0);

        // g.ForegroundDrawList.Clear();
        // g.ForegroundDrawList.PushTextureID(g.IO.Fonts.TexID);
        // g.ForegroundDrawList.PushClipRectFullScreen();
        // g.ForegroundDrawList.Flags = (g.Style.AntiAliasedLines ? ImDrawListFlags_AntiAliasedLines : 0) | (g.Style.AntiAliasedFill ? ImDrawListFlags_AntiAliasedFill : 0);

        // Drag and drop keep the source ID alive so even if the source disappear
        // our state is consistent
        if (g.DragDropActive && g.DragDropPayload.SourceId == g.ActiveId)
            this.keepAliveID(g.DragDropPayload.SourceId);

        // Clear reference to active widget if the widget isn't alive anymore
        if (!g.HoveredIdPreviousFrame)
            g.HoveredIdTimer = 0;
        if (!g.HoveredIdPreviousFrame || (g.HoveredId && g.ActiveId == g.HoveredId))
            g.HoveredIdNotActiveTimer = 0;
        if (g.HoveredId)
            g.HoveredIdTimer += g.IO.DeltaTime;
        if (g.HoveredId && g.ActiveId != g.HoveredId)
            g.HoveredIdNotActiveTimer += g.IO.DeltaTime;
        g.HoveredIdPreviousFrame = g.HoveredId;
        g.HoveredId = 0;
        g.HoveredIdAllowOverlap = false;
        if (g.ActiveIdIsAlive != g.ActiveId &&
            g.ActiveIdPreviousFrame == g.ActiveId && g.ActiveId != 0)
        {
            this.clearActiveID();
        }
        if (g.ActiveId)
            g.ActiveIdTimer += g.IO.DeltaTime;
        g.LastActiveIdTimer += g.IO.DeltaTime;
        g.ActiveIdPreviousFrame = g.ActiveId;
        g.ActiveIdPreviousFrameWindow = g.ActiveIdWindow;
        g.ActiveIdPreviousFrameHasBeenEdited = g.ActiveIdHasBeenEdited;
        g.ActiveIdIsAlive = 0;
        g.ActiveIdPreviousFrameIsAlive = false;
        g.ActiveIdIsJustActivated = false;
        if (g.ScalarAsInputTextId && g.ActiveId != g.ScalarAsInputTextId)
            g.ScalarAsInputTextId = 0;

        // Drag and drop
        g.DragDropAcceptIdPrev = g.DragDropAcceptIdCurr;
        g.DragDropAcceptIdCurr = 0;
        g.DragDropAcceptIdCurrRectSurface = Number.MAX_VALUE;
        g.DragDropWithinSourceOrTarget = false;

        // Update keyboard input state
        g.IO.KeysDownDurationPrev = g.IO.KeysDownDuration.slice(); // copy
        for (let i = 0; i < g.IO.KeysDown.length; i++)
        {
            g.IO.KeysDownDuration[i] = g.IO.KeysDown[i] ?
                (g.IO.KeysDownDuration[i] < 0 ? 0 :
                    g.IO.KeysDownDuration[i] + g.IO.DeltaTime)
                : -1;
        }

        // Update gamepad/keyboard directional navigation
        this.navUpdate();

        // Calculate frame-rate for the user, as a purely luxurious feature
        g.FramerateSecPerFrameAccum += g.IO.DeltaTime -
                        g.FramerateSecPerFrame[g.FramerateSecPerFrameIdx];
        g.FramerateSecPerFrame[g.FramerateSecPerFrameIdx] = g.IO.DeltaTime;
        g.FramerateSecPerFrameIdx = (g.FramerateSecPerFrameIdx + 1) % g.FramerateSecPerFrame.length;
        g.IO.Framerate = (g.FramerateSecPerFrameAccum > 0) ?
                (1 / (g.FramerateSecPerFrameAccum / g.FramerateSecPerFrame.length))
                : Number.MAX_VALUE;

        // Handle user moving window with mouse (at the beginning of the frame
        // to avoid input lag or sheering)
        this.updateMouseMovingWindowNewFrame();
        this.updateHoveredWindowAndCaptureFlags();

        // Background darkening/whitening
        if (this.getFrontMostPopupModal() ||
            (g.NavWindowingTarget && g.NavWindowingHighlightAlpha > 0))
        {
            g.DimBgRatio = Math.min(g.DimBgRatio + g.IO.DeltaTime * 6.0, 1.0);
        }
        else
            g.DimBgRatio = Math.max(g.DimBgRatio - g.IO.DeltaTime * 10, 0.);

        g.MouseCursor = MouseCursor.Arrow; // NewFrame
        g.WantCaptureMouseNextFrame = -1;
        g.WantCaptureKeyboardNextFrame = -1;
        g.WantTextInputNextFrame = -1;
        // OS Input Method Editor showing on top-left of our window by default
        g.PlatformImePos = new Vec2(1.0, 1.);

        // Mouse wheel scrolling, scale
        this.updateMouseWheel();

        // Pressing TAB activate widget focus
        g.FocusTabPressed = (g.NavWindow && g.NavWindow.Active &&
                !(g.NavWindow.Flags & WindowFlags.NoNavInputs) &&
                !g.IO.KeyCtrl && this.isKeyPressedMap(Key.Tab));
        if (g.ActiveId == 0 && g.FocusTabPressed)
        {
            // Note that SetKeyboardFocusHere() sets the Next fields mid-frame.
            // To be consistent we also  manipulate the Next fields even, even
            // though they will be turned into Curr fields by the code below.
            g.FocusRequestNextWindow = g.NavWindow;
            g.FocusRequestNextCounterAll = Number.MAX_SAFE_INTEGER;
            if (g.NavId != 0 && g.NavIdTabCounter != Number.MAX_SAFE_INTEGER)
                g.FocusRequestNextCounterTab = g.NavIdTabCounter + 1 + (g.IO.KeyShift ? -1 : 1);
            else
                g.FocusRequestNextCounterTab = g.IO.KeyShift ? -1 : 0;
        }

        // Turn queued focus request into current one
        g.FocusRequestCurrWindow = null;
        g.FocusRequestCurrCounterAll = Number.MAX_SAFE_INTEGER;
        g.FocusRequestCurrCounterTab = Number.MAX_SAFE_INTEGER;
        if (g.FocusRequestNextWindow != null)
        {
            let win = g.FocusRequestNextWindow;
            g.FocusRequestCurrWindow = win;
            if (g.FocusRequestNextCounterAll != Number.MAX_SAFE_INTEGER &&
                win.DC.FocusCounterAll != -1)
            {
                g.FocusRequestCurrCounterAll = this.modPositive(g.FocusRequestNextCounterAll,
                                                    win.DC.FocusCounterAll+1);
            }
            if (g.FocusRequestNextCounterTab != Number.MAX_SAFE_INTEGER &&
                win.DC.FocusCounterTab != -1)
            {
                g.FocusRequestCurrCounterTab = this.modPositive(g.FocusRequestNextCounterTab,
                                                    win.DC.FocusCounterTab+1);
            }
            g.FocusRequestNextWindow = null;
            g.FocusRequestNextCounterAll = Number.MAX_SAFE_INTEGER;
            g.FocusRequestNextCounterTab = Number.MAX_SAFE_INTEGER;
        }

        g.NavIdTabCounter = Number.MAX_SAFE_INTEGER;

        // Mark all windows as not visible
        console.assert(g.WindowsFocusOrder.Size == g.Windows.Size);
        for (let i=0; i < g.Windows.length; i++)
        {
            let win = g.Windows[i];
            win.WasActive = win.Active;
            win.BeginCount = 0;
            win.Active = false;
            win.WriteAccessed = false;
        }

        // Closing the focused window restore focus to the first active root window in descending z-order
        if (g.NavWindow && !g.NavWindow.WasActive)
            this.focusPreviousWindowIgnoringOne(null);

        // No window should be open at the beginning of the frame.
        // But in order to allow the user to call NewFrame() multiple
        // times without calling Render(), we are doing an explicit clear.
        g.CurrentWindowStack.resize(0);
        g.BeginPopupStack.resize(0);
        this.closePopupsOverWindow(g.NavWindow);

        // Create implicit/fallback window - which we will only render it if
        // the user has added something to it.
        // We don't use "Debug" to avoid colliding with user trying to create
        // a "Debug" window with custom flags. This fallback is particularly
        // important as it avoid ImGui:: calls from crashing.
        this.SetNextWindowSize(new Vec2(400,400), CondFlags.FirstUseEver);
        this.Begin("Debug##Default", null, WindowFlags.NoSavedSettings);
        g.FrameScopePushedImplicitWindow = true;


        return this.GetIO().Dirty;
    }

    /** end the ImGui frame. automatically called by Render(), you likely
     * don't need to call that yourself directly. If you don't need to render
     * data (skipping rendering) you may call EndFrame() but you'll have wasted
     * CPU already! If you don't need to render, better to not create any imgui
     * windows and not call NewFrame() at all!
     */
    EndFrame()
    {
        let g = this.guictx;
        console.assert(g.Initialized);
        if (g.FrameCountEnded == g.FrameCount)          // Don't process EndFrame() multiple times.
            return;
        console.assert(g.FrameScopeActive);  // Forgot to call ImGui::NewFrame()?

        // Notify OS when our Input Method Editor cursor has moved (e.g. CJK
        // inputs using Microsoft IME)
        if (g.IO.ImeSetInputScreenPosFn && (g.PlatformImeLastPos.x == Number.MAX_VALUE ||
            Vec2.Subtract(g.PlatformImeLastPos, g.PlatformImePos).LengthSq() > 0.0001))
        {
            g.IO.ImeSetInputScreenPosFn(Math.floor(g.PlatformImePos.x),
                                        Math.floor(g.PlatformImePos.y));
            g.PlatformImeLastPos = g.PlatformImePos;
        }

        // Report when there is a mismatch of Begin/BeginChild vs End/EndChild calls.
        // Important: Remember that the Begin/BeginChild API requires you
        // to always call End/EndChild even if Begin/BeginChild returns false!
        // (this is unfortunately inconsistent with most other Begin* API).
        if (g.CurrentWindowStack.length != 1)
        {
            if (g.CurrentWindowStack.length > 1)
            {
                console.assert(g.CurrentWindowStack.length == 1,
                    "Mismatched Begin/BeginChild vs End/EndChild calls: did you forget to call End/EndChild?");
                while (g.CurrentWindowStack.length > 1) // FIXME-ERRORHANDLING
                    this.End();
            }
            else
            {
                console.assert(g.CurrentWindowStack.length == 1,
                    "Mismatched Begin/BeginChild vs End/EndChild calls: did you overcall End/EndChild?");
            }
        }

        // Hide implicit/fallback "Debug" window if it hasn't been used
        g.FrameScopePushedImplicitWindow = false;
        if (g.CurrentWindow && !g.CurrentWindow.WriteAccessed)
            g.CurrentWindow.Active = false;
        this.End();

        // Show CTRL+TAB list window
        if (g.NavWindowingTarget)
            this.NavUpdateWindowingList();

        // Drag and Drop: Elapse payload (if delivered, or if source stops
        // being submitted)
        if (g.DragDropActive)
        {
            let is_delivered = g.DragDropPayload.Delivery;
            let is_elapsed = (g.DragDropPayload.DataFrameCount + 1 < g.FrameCount) &&
                        ((g.DragDropSourceFlags & DragDropFlags.SourceAutoExpirePayload) ||
                          !this.IsMouseDown(g.DragDropMouseButton));
            if (is_delivered || is_elapsed)
                this.ClearDragDrop();
        }

        // Drag and Drop: Fallback for source tooltip. This is not ideal but
        // better than nothing.
        if (g.DragDropActive && g.DragDropSourceFrameCount < g.FrameCount)
        {
            g.DragDropWithinSourceOrTarget = true;
            this.SetTooltip("...");
            g.DragDropWithinSourceOrTarget = false;
        }

        // End frame
        g.FrameScopeActive = false;
        g.FrameCountEnded = g.FrameCount;

        // Initiate moving window + handle left-click and right-click focus
        this.updateMouseMovingWindowEndFrame();

        // zsort non-child windows, higher numbers are more in front
        this.zsortWindows();

        // Sort the window list so that all child windows are after their parent
        // We cannot do that on FocusWindow() because children may not exist yet

        g.WindowsSortBuffer.resize(0);
        for (let i = 0; i != g.Windows.length; i++)
        {
            let win = g.Windows[i];
            // if a child is active its parent will add it
            if (win.Active && (win.Flags & WindowFlags.ChildWindow))
                continue;
            this.addWindowToSortBuffer(g.WindowsSortBuffer, win);
        }

        // This usually assert if there is a mismatch between the
        // WindowFlags.ChildWindow / ParentWindow values and DC.ChildWindows[]
        // in parents, aka we've done something wrong.
        console.assert(g.Windows.length == g.WindowsSortBuffer.length);
        let tmp = g.Windows;
        g.Windows = g.WindowsSortBuffer;
        g.WindowsSortBuffer = tmp;
        g.IO.MetricsActiveWindows = g.WindowsActiveCount;

        // Unlock font atlas
        g.IO.Fonts.Locked = false;

        // Clear Input data for next frame
        g.IO.MouseWheel = g.IO.MouseWheelH = 0.;
        g.IO.ClearInputCharacters();
        g.IO.NavInputs.fill(0);
        this.guictx.EndFrame();
    }

    Render()
    {
        let g = this.guictx;
        console.assert(g.Initialized);
        if (g.FrameCountEnded != g.FrameCount)
            this.EndFrame();

        g.FrameCountRendered = g.FrameCount;

        g.IO.MetricsRenderWindows = 0;

        var w = g.canvas.getAttribute("width");
        var h = g.canvas.getAttribute("height");
        let ctx = g.canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h); // clear is clear

        ctx.save();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // XXX: render app background drawlist
        let frontWins = [null, null];
        if(g.NavWindowingTarget &&
            !(g.NavWindowingTarget.Flags & WindowFlags.NoBringToFrontOnFocus))
        {
            frontWins[0] = g.NavWindowingTarget.RootWindow;
        }
        if(g.NavWindowingTarget)
            frontWins[1] = g.NavWindowingList;

        for(let l=0;l<2;l++)
        {
            for (let n=0; n<g.Windows.length; n++)
            {
                let win = g.Windows[n];
                if (win.IsActiveAndVisible() &&
                   // (win.Flags & WindowFlags.ChildWindow) == 0 &&
                   // we don't combine display lists, so we draw child windows
                    win != frontWins[0] && win != frontWins[1])
                {
                    g.IO.MetricsRenderWindows++;
                    win.Render(l);
                }
                else
                {
                    // if(win.Active) console.log("hidden:" + win.Name);
                }
            }
        }

        // XXX: multi layers here too?
        for (let n = 0; n < frontWins.length; n++)
        {
            if (frontWins[n] && frontWins[n].IsWindowActiveAndVisible())
            {
                // NavWindowingTarget is always temporarily displayed as the
                // front-most window
                g.IO.MetricsRenderWindows++;
                frontWins[n].Render();
            }
        }

        // XXX: render app background drawlist

        // Draw software mouse cursor if requested

        ctx.restore();

    }

    // DemoWindow is separate object
    // AboutWindow is separate object
    // MetricsWindow is separate object
    // StyleEditor is separate object
    // StyleSelector is separate object
    // FontSelector is separate object
    // UserGuide is separate object

    GetVersion(variant="about")
    {
        switch(variant)
        {
        case "imgui-njs":
            return this.version;
        case "imgui":
            return this.version_imgui;
        case "about":
        default:
            return this.about;
        }
    }

    // Styles
    // new, recommended style (default)
    StyleColorsDark()
    {
        this.guictx.Style.SetColorScheme("DarkColors");
    }

    // classic imgui style
    StyleColorsClassic()
    {
        this.guictx.Style.SetColorScheme("ClassColors");
    }

    // best used with borders and a custom, thicker font
    StyleColorsLight()
    {
        this.guictx.Style.SetColorScheme("LightColors");
    }

    PushStyleColor(stylid, col) // stylid is a string like "WindowBg"
    {
        let g = this.guictx;
        let backup = new ColorMod(stylid, g.Style.Colors[stylid]);
        g.ColorModifiers.push(backup);
        g.Style.Colors[stylid] = col;
    }

    PopStyleColor(count=1)
    {
        let g = this.guictx;
        while (count > 0)
        {
            let backup = g.ColorModifiers.pop();
            g.Style.Colors[backup.Field] = backup.BackupValue;
            count--;
        }
    }

    GetStyleColor(stylid, alphaMult=1)
    {
        let g = this.guictx;
        let c = g.Style.Colors[stylid];
        console.assert(c, stylid);
        return c.AsRGB(alphaMult);
    }

    PushStyleVar(field, val)
    {
        let g = this.guictx;
        let backup = new StyleMod(field, g.Style[field]);
        g.StyleModifiers.push(backup);
        g.Style[field] = val;
    }

    PopStyleVar(count=1)
    {
        let g = this.guictx;
        while(count > 0)
        {
            let backup = g.StyleModifiers.pop();
            g.Style[backup.Field] = backup.Value;
            count--;
        }
    }

    // no args: get current font
    // no name: get a scaled/styled version of the current font
    // name and scale/style: get a styled variant of the named font
    GetFont(name=null, scale=1, weight=null, style=null)
    {
        if(name == null && scale == 1)
            return this.guictx.Font;
        else
        {
            if(name == null)
                name = this.guictx.Font.Family;
            let size = this.guictx.FontSize * scale;
            return this.guictx.IO.Fonts.GetFont(name, size, weight, style);
        }
    }

    SetFont(font) // generally prefer Push/PopFont
    {
        let g = this.guictx;
        g.Font = font;
        g.FontSize = font.Size;
        g.FontMidline = font.Baseline / 2;
        g.FontLineHeight = font.Size * this.GetLineHeightPct();
    }

    GetFontSize() // useful for computing horizontal positioning (aka 'em')
    {
        let g = this.guictx;
        return g.FontSize;
    }

    GetFontMidline()
    {
        let g = this.guictx;
        return g.FontMidline;
    }

    GetLineHeight() // useful for computing vertical spacing
    {
        let g = this.guictx;
        return g.FontLineHeight;
    }

    GetLineHeightPct()
    {
        let g = this.guictx;
        return g.Style.TextLineHeightPct; // usually in the range (.75-1.5)
    }

    PushFont(font)
    {
        if(typeof(font) == "string")
            font = this.guictx.Style.GetFont(font);

        if(!font)
            font = this.getDefaultFont();

        this.guictx.FontStack.push(font);
        this.SetFont(font);
        return font;
    }

    PopFont()
    {
        this.guictx.FontStack.pop();
        let font = this.guictx.FontStack[this.guictx.FontStack.length-1];
        if(!font)
            font = this.getDefaultFont();
        this.SetFont(font);
        return font;
    }

    getDefaultFont()
    {
        let g = this.guictx;
        return g.Style.GetFont("Default");
    }

    setCurrentFontName(fontnm)
    {
        let g = this.guictx;
        this.SetFont(this.GetFont(name));
    }

    // GetFontTexUVWhitePixel() { console.assert(0, "unimplemented"); }
    // GetColorU32() { console.assert(0, "unimplemented"); }

    SetNextItemWidth(item_width)
    {
        this.getCurrentWindow().DC.NextItemWidth = item_width;
    }

    GetLastItemWidth()
    {
        let w = this.getCurrentWindow();
        return w.DC.LastItemRect.Max.x - w.DC.LastItemRect.Min.x;
    }

    // Parameters stacks (current window)
    // width of items for the common item+label case, pixels. 0.0f = default
    // to ~2/3 of windows width, >0.0f: width in pixels, <0.0f align xx pixels
    // to the right of window (so -1.0f always align width to the right side)
    PushItemWidth(item_width)
    {
        let win = this.getCurrentWindow();
        win.DC.ItemWidth = (item_width == 0. ? win.ItemWidthDefault : item_width);
        win.DC.ItemWidthStack.push(win.DC.ItemWidth);
    }

    PushMultiItemsWidths(ncomp, w_full)
    {
        let win = this.getCurrentWindow();
        const style = this.guictx.Style;
        const w_item_one  = Math.max(1,
            Math.floor((w_full - (style.ItemInnerSpacing.x)*(ncomp-1))/ncomp));
        const w_item_last = Math.max(1,
            Math.floor(w_full - (w_item_one + style.ItemInnerSpacing.x) * (ncomp-1)));
        win.DC.ItemWidthStack.push_back(w_item_last);
        for (let i = 0; i < ncomp-1; i++)
            win.DC.ItemWidthStack.push_back(w_item_one);
        win.DC.ItemWidth = win.DC.ItemWidthStack.back();
    }

    PopItemWidth()
    {
        let win = this.getCurrentWindow();
        win.DC.ItemWidthStack.pop();
        win.DC.ItemWidth = win.DC.ItemWidthStack.empty() ?
                                    win.ItemWidthDefault :
                                    win.DC.ItemWidthStack.back();
    }

    // Calculate default item width given value passed to PushItemWidth()
    // or SetNextItemWidth(),
    getNextItemWidth()
    {
        let win = this.guictx.CurrentWindow;
        let w;
        if (win.DC.NextItemWidth != Number.MAX_VALUE)
        {
            w = win.DC.NextItemWidth;
            win.DC.NextItemWidth = Number.MAX_VALUE;
        }
        else
        {
            w = win.DC.ItemWidth;
        }
        if (w < 0)
        {
            let region_max_x = this.getContentRegionMaxScreen().x;
            w = Math.max(1, region_max_x - win.DC.CursorPos.x + w);
        }
        w = Math.floor(w);
        return w;
    }

    // Calculate item width *without* popping/consuming NextItemWidth if it was
    // set. (rarely used, which is why we avoid calling this from
    //  GetNextItemWidth() and instead do a backup/restore here
    CalcItemWidth()
    {
        let win = this.guictx.CurrentWindow;
        let backup_next_item_width = win.DC.NextItemWidth;
        let w = this.getNextItemWidth();
        win.DC.NextItemWidth = backup_next_item_width;
        return w;
    }

    // Calculate full item size given user provided 'size' parameter and
    // default width/height. Default width is often == getNextItemWidth().
    // Those two functions CalcItemWidth vs calcItemSize are awkwardly named
    // because they are not fully symmetrical. Note that only CalcItemWidth()
    // is publicly exposed. The 4.0f here may be changed to match
    // getNextItemWidth() and/or BeginChild() (right now we have a mismatch
    // which is harmless but undesirable)
    calcItemSize(size, default_w, default_h)
    {
        let win = this.guictx.CurrentWindow;
        let region_max;
        if (size.x < 0 || size.y < 0)
            region_max = this.getContentRegionMaxScreen();

        if (size.x == 0)
            size.x = default_w;
        else
        if (size.x < 0)
            size.x = Math.max(4, region_max.x - win.DC.CursorPos.x + size.x);

        if (size.y == 0)
            size.y = default_h;
        else
        if (size.y < 0)
            size.y = Math.max(4, region_max.y - win.DC.CursorPos.y + size.y);
        return size;
    }

    calcWrapWidthForPos(pos, wrap_pos_x)
    {
        if (wrap_pos_x < 0)
            return 0;
        let win = this.guictx.CurrentWindow;
        if (wrap_pos_x == 0)
            wrap_pos_x = this.GetContentRegionMax().x + win.Pos.x;
        else
        if (wrap_pos_x > 0)
        {
            wrap_pos_x += win.Pos.x-win.Scroll.x;
            // wrap_pos_x is provided is window local space
        }
        return Math.max(wrap_pos_x - pos.x, 1);
    }

    pushMultiItemsWidths(components, w_full=0)
    {
        let win = this.getCurrentWindow();
        let style = this.guictx.Style;
        if (w_full <= 0)
            w_full = this.CalcItemWidth();
        let w = (w_full-style.ItemInnerSpacing.x*(components-1))/components;
        let w_item_one  = Math.max(1, Math.floor(w));
        let wl = w_full - (w_item_one + style.ItemInnerSpacing.x) * (components-1);
        const w_item_last = Math.max(1, Math.floor(wl));
        win.DC.ItemWidthStack.push(w_item_last);
        for (let i = 0; i < components-1; i++)
            win.DC.ItemWidthStack.push(w_item_one);
        win.DC.ItemWidth = win.DC.ItemWidthStack[win.DC.ItemWidthStack.length-1];
    }

    PushItemFlag(flag, val)
    {
        let win = this.guictx.CurrentWindow;
        if (val)
            win.DC.ItemFlags |= flag;
        else
            win.DC.ItemFlags &= ~flag;
        win.DC.ItemFlagsStack.push(win.DC.ItemFlags);
    }

    PopItemFlag()
    {
        let win = this.guictx.CurrentWindow;
        let stack = win.DC.ItemFlagsStack;
        stack.pop();
        win.DC.ItemFlags = stack[stack.length-1]; // may be undefined
        if(win.DC.ItemFlags == undefined)
            win.DC.ItemFlags = ItemFlags.Default;
    }

    isWindowContentHoverable(win, flags)
    {
        // An active popup disable hovering on other windows (apart from its
        // own children FIXME-OPT: This could be cached/stored within the window.
        let g = this.guictx;
        if (g.NavWindow)
        {
            let froot = g.NavWindow.RootWindow;
            if (froot)
            {
                if (froot.WasActive && froot != win.RootWindow)
                {
                    // For the purpose of those flags we differentiate
                    // "standard popup" from "modal popup"
                    // NB: The order of those two tests is important because
                    // Modal windows are also Popups.
                    if (froot.Flags & WindowFlags.Modal)
                        return false;
                    if ((froot.Flags & WindowFlags.Popup) &&
                        !(flags & HoveredFlags.AllowWhenBlockedByPopup))
                        return false;
                }
            }
        }
        return true;
    }

    // word-wrapping for Text*() commands. < 0.0f: no wrapping; 0.0f: wrap
    // to end of window (or column); > 0.0f: wrap at 'wrap_pos_x' position
    // in window local space
    PushTextWrapPos(wrap_pos_x=0)
    {
        let win = this.guictx.CurrentWindow;
        win.DC.TextWrapPos = wrap_pos_x;
        win.DC.TextWrapPosStack.push(wrap_pos_x);
    }

    PopTextWrapPos()
    {
        let win = this.guictx.CurrentWindow;
        let stack = win.DC.TextWrapPosStack;
        stack.pop();
        win.DC.TextWrapPos = stack[stack.length-1]; // may be undefined
        if(win.DC.TextWrapPos == undefined)
            win.DC.TextWrapPos = -1.;
    }

    // allow focusing using TAB/Shift-TAB, enabled by default but you can
    // disable it for certain widgets
    PushAllowKeyboardFocus(allow_keyboard_focus)
    {
        this.PushItemFlag(ItemFlags.NoTabStop, !allow_keyboard_focus);
    }

    PopAllowKeyboardFocus()
    {
        this.PopItemFlag();
    }

    // in 'repeat' mode, Button*() functions return repeated true in a
    // typematic manner (using io.KeyRepeatDelay/io.KeyRepeatRate setting).
    // Note that you can call IsItemActive() after any Button() to tell if
    // the button is held in the current frame.
    PushButtonRepeat(repeat)
    {
        this.PushItemFlag(ItemFlags.ButtonRepeat, repeat);
    }

    PopButtonRepeat()
    {
        this.PopItemFlag();
    }

    // Cursor / Layout - implemented in LayoutMixin
    // - By "cursor" we mean the current output position.
    // - The typical widget behavior is to output themselves at the current
    //   cursor position, then move the cursor one line down.

    GetFrameHeight()
    {
        let g = this.guictx;
        // frames are generally built around single lines of text
        // so FontLineHeight isn't wise here. Extra space is/should-be
        // governed by a variant of margin or padding.
        return g.FontSize + 2 * g.Style.FramePadding.y;
    }

    // (distance in pixels between 2 consecutive lines of framed widgets)
    GetFrameHeightWithSpacing()
    {
        let g = this.guictx;
        return this.GetFrameHeight() + g.Style.ItemSpacing.y;
    }

    // ID stack/scopes
    // - Read the FAQ for more details about how ID are handled in dear imgui.
    //   If you are creating widgets in a loop you most likely want to push a
    //   unique identifier (e.g. object pointer, loop index) to uniquely
    //   differentiate them.
    // - The resulting ID are hashes of the entire stack.
    // - You can also use the "Label##foobar" syntax within widget label to
    //   distinguish them from each others.
    // - In this header file we use the "label"/"name" terminology to denote
    //   a string that will be displayed and used as an ID, whereas "str_id"
    //   denote a string that is only used as an ID and not normally displayed.
    // push string into the ID stack (will hash string).
    PushID(str_id)
    {
        this.guictx.CurrentWindow.PushID(str_id);
    }

    // pop from the ID stack.
    PopID()
    {
        this.guictx.CurrentWindow.PopID();
    }

    // calculate unique ID (hash of whole ID stack + given parameter). e.g.
    // if you want to query into ImGuiStorage yourself
    GetID(str_id)
    {
        return this.guictx.CurrentWindow.GetID(str_id);
    }

    // Widgets implemented via mixins
    //  Text : see widgets/text.js
    //  Selectable: see widgets/misc.js
    //  Buttons: see widgets/button.js
    //  Drags (see widgets/drag.js)
    //  Slider (see widgets/slider.js)
    //  Input with Keyboard (see widgets/input.js)
    //  Color Editor/Picker (see widgets/coloredit.js)
    //  Trees (see widgets/tree.js)
    //  List Boxes (see widgets/listbox.js)
    //  Data Plotting (see widgets/plot.js)
    //  Menus,Popups (see widgets/menu.js, imguiPopup.js)

    // Value helpers
    Value(prefix, val)
    {
        console.assert(0, "unimplemented");
    }

    // Logging/Capture ------------------------------------------
    // see logging.js

    // Settings (persistence)
    // set settings.js

    // Drag and Drop ------------------------------------------
    // see dragdrop.js

    // Clipping -------------------------------------------------
    PushClipRect(clip_rect_min, clip_rect_max, intersect_with_current_clip_rect)
    {
        let win = this.getCurrentWindow();
        win.DrawList.PushClipRect(clip_rect_min, clip_rect_max,
                                    intersect_with_current_clip_rect);
        win.ClipRect = win.DrawList.GetClipRect();
    }

    PopClipRect()
    {
        let win = this.getCurrentWindow();
        win.DrawList.PopClipRect();
        win.ClipRect = win.DrawList.GetClipRect();
    }

    // Focus, Activation -------------------------------------------------
    // - Prefer using "SetItemDefaultFocus()" over
    //  "if (IsWindowAppearing()) SetScrollHereY()" when applicable
    //  to signify "this is the default item"

    // make last item the default focused item of a win.
    SetItemDefaultFocus()
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (win.Appearing) return;
        if (g.NavWindow == win.RootWindowForNav &&
            (g.NavInitRequest || g.NavInitResultId != 0) &&
            g.NavLayer == g.NavWindow.DC.NavLayerCurrent)
        {
            g.NavInitRequest = false;
            g.NavInitResultId = g.NavWindow.DC.LastItemId;
            g.NavInitResultRectRel = new Rect(
                Vec2.Subtract(g.NavWindow.DC.LastItemRect.Min, g.NavWindow.Pos),
                Vec2.Subtract(g.NavWindow.DC.LastItemRect.Max, g.NavWindow.Pos));
            this.navUpdateAnyRequestFlag();
            if (!this.IsItemVisible())
               this.SetScrollHereY();
        }

    }

    // focus keyboard on the next widget. Use positive 'offset' to access
    // sub components of a multicomponent widget. Use -1 to access previous widget.
    SetKeyboardFocusHere(offset=0)
    {
        console.assert(offset >= -1);    // -1 is allowed but not below
        let g = this.guictx;
        let win = g.CurrentWindow;
        g.FocusRequestNextWindow = win;
        g.FocusRequestNextCounterAll = win.DC.FocusCounterAll + 1 + offset;
        g.FocusRequestNextCounterTab = Number.MAX_SAFE_INTEGER;
    }

    // Item/Widgets Utilities -------------------------------------------------
    // - Most of the functions are referring to the last/previous item we submitted.
    // - See Demo Window under "Widgets->Querying Status" for an interactive
    //   visualization of most of those functions.

    // is the last item hovered? (and usable, aka not blocked by a popup, etc.).
    // See ImGuiHoveredFlags for more options.
    IsItemHovered(flags=0, delay=0)
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (g.NavDisableMouseHover && !g.NavDisableHighlight)
            return this.IsItemFocused();

        // Test for bounding box overlap, as updated as ItemAdd()
        if (!(win.DC.LastItemStatusFlags & ItemStatusFlags.HoveredRect))
            return false;
        // Flags not supported by
        console.assert((flags & (HoveredFlags.RootWindow|HoveredFlags.ChildWindows))==0);

        // Test if we are hovering the right window (our window could be behind another window)
        // [2017/10/16] Reverted commit 344d48be3 and testing RootWindow instead. I believe it is correct to NOT test for Root
        // Until a solution is found I believe reverting to the test from 2017/09/27 is safe since this was the test that has
        //if (g.HoveredWindow != window)
        //    return false;
        if (g.HoveredRootWindow != win.RootWindow &&
            !(flags & HoveredFlags.AllowWhenOverlapped))
        {
            return false;
        }

        // Test if another item is active (e.g. being dragged)
        if (!(flags & HoveredFlags.AllowWhenBlockedByActiveItem))
        {
            if (g.ActiveId != 0 && g.ActiveId != win.DC.LastItemId &&
                !g.ActiveIdAllowOverlap && g.ActiveId != win.MoveId)
            {
                return false;
            }
        }

        // Test if interactions on this window are blocked by an active popup or modal
        if (!this.isWindowContentHoverable(win, flags))
            return false;

        // Test if the item is disabled
        if ((win.DC.ItemFlags & ItemFlags.Disabled) &&
           !(flags & HoveredFlags.AllowWhenDisabled))
        {
            return false;
        }

        // Special handling for the dummy item after Begin() which represent
        // the title bar or tab. When the window is collapsed (SkipItems==true)
        // that last item will never be overwritten so we need to detect the ca
        if (win.DC.LastItemId == win.MoveId && win.WriteAccessed)
            return false;
        else
        if(delay != 0 && g.HoveredIdTimer < delay)
            return false;
        else
            return true;
    }

    // is the last item active? (e.g. button being held, text field being edited.
    // This will continuously return true while holding mouse button on an item.
    // Items that don't interact will always return false)
    IsItemActive()
    {
        let g = this.guictx;
        if (g.ActiveId)
        {
            let win = g.CurrentWindow;
            return g.ActiveId == win.DC.LastItemId;
        }
        return false;
    }

    // is the last item focused for keyboard/gamepad navigation?
    IsItemFocused()
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        if (g.NavId == 0 || g.NavDisableHighlight ||
            g.NavId != win.DC.LastItemId)
        {
            return false;
        }
        else
            return true;
    }

    // is the last item clicked? (e.g. button/node just clicked on)
    //  == IsMouseClicked(mouse_button) && IsItemHovered()
    IsItemClicked(mouse_button=0)
    {
        return this.IsMouseClicked(mouse_button) &&
                this.IsItemHovered(HoveredFlags.None);
    }

    // is the last item visible? (items may be out of sight because of
    //  clipping/scrolling)
    IsItemVisible()
    {
        let win = this.getCurrentWindowRead();
        return win.ClipRect.Overlaps(win.DC.LastItemRect);
    }

    // did the last item modify its underlying value this frame? or was
    // pressed? This is generally the same as the "bool" return value of many
    // widgets.
    IsItemEdited()
    {
        let win = this.getCurrentWindowRead();
        return (win.DC.LastItemStatusFlags & ItemStatusFlags.Edited) != 0;
    }

    // was the last item just made active (item was previously inactive).
    IsItemActivated()
    {
        let g = this.guictx;
        if (g.ActiveId)
        {
            let win = g.CurrentWindow;
            if (g.ActiveId == win.DC.LastItemId &&
                g.ActiveIdPreviousFrame != win.DC.LastItemId)
            {
                return true;
            }
        }
        return false;
    }

    // was the last item just made inactive (item was previously active).
    // Useful for Undo/Redo patterns with widgets that requires continuous editing.
    IsItemDeactivated()
    {
        let g = this.guictx;
        let win = g.CurrentWindow;
        return (g.ActiveIdPreviousFrame == win.DC.LastItemId &&
                g.ActiveIdPreviousFrame != 0 && g.ActiveId != win.DC.LastItemId);
    }

    // was the last item just made inactive and made a value change when it was
    // active? (e.g. Slider/Drag moved). Useful for Undo/Redo patterns with
    // widgets that requires continuous editing. Note that you may get false
    // positives (some widgets such as Combo()/ListBox()/Selectable() will
    // return true even when clicking an already selected item).
    IsItemDeactivatedAfterEdit()
    {
        let g = this.guictx;
        return this.IsItemDeactivated() &&
            (g.ActiveIdPreviousFrameHasBeenEdited ||
                (g.ActiveId == 0 && g.ActiveIdHasBeenEdited));
    }

    // is any item hovered?
    IsAnyItemHovered()
    {
        let g = this.guictx;
        return g.HoveredId != 0 || g.HoveredIdPreviousFrame != 0;
    }

    // is any item active?
    IsAnyItemActive()
    {
        let g = this.guictx;
        return g.ActiveId != 0;
    }

    // is any item focused?
    IsAnyItemFocused()
    {
        let g = this.guictx;
        return g.NavId != 0 && !g.NavDisableHighlight;
    }

    // get upper-left bounding rectangle of the last item (screen space)
    GetItemRectMin()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.LastItemRect.Min;
    }

    // get lower-right bounding rectangle of the last item (screen space)
    GetItemRectMax()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.LastItemRect.Max;
    }

    // get size of last item
    GetItemRectSize()
    {
        let win = this.getCurrentWindowRead();
        return win.DC.LastItemRect.GetSize();
    }

    // allow last item to be overlapped by a subsequent item. sometimes useful
    // with invisible buttons, selectables, etc. to catch unused area.
    SetItemAllowOverlap()
    {
        let g = this.guictx;
        if (g.HoveredId == g.CurrentWindow.DC.LastItemId)
            g.HoveredIdAllowOverlap = true;
        if (g.ActiveId == g.CurrentWindow.DC.LastItemId)
            g.ActiveIdAllowOverlap = true;
    }

    // Miscellaneous Utilitiesss ----------------------------------

    IsRectVisible(a, b)
    {
        let win = this.guictx.CurrentWindow;
        if(b == undefined)
        {
            // a is assumed to be size
            // test if rectangle (of given size, starting from cursor position)
            // is visible / not clipped.
            return win.ClipRect.Overlaps(
                new Rect(win.DC.CursorPos,
                    Vec2.Add(win.DC.CursorPos, a)));
        }
        else
        {
            // a and b are min/max points
            // test if rectangle (in screen space) is visible / not clipped.
            // To perform coarse clipping on user's side.
            return win.ClipRect.Overlaps(new Rect(a, b));
        }
    }

    GetTime()
    {
        return this.guictx.Time;
    }

    // get global imgui frame count. incremented by 1 every frame.
    GetFrameCount()
    {
        return this.guictx.FrameCount;
    }

    // this draw list will be the first rendering one. Useful to quickly
    // draw shapes/text behind dear imgui contents.
    GetBackgroundDrawList()
    { return null; }

    // this draw list will be the last rendered one. Useful to quickly
    // draw shapes/text over dear imgui contents.
    GetForegroundDrawList()
    { return null; }

    GetDrawListSharedData()
    { return null; }

    // get a string corresponding to the enum value (for display, saving, etc.).
    GetStyleColorName(idx)
    {
        return idx; // here the idx is the name
    }

    // replace current window storage with our own (if you want to manipulate
    // it yourself, typically clear subsection of it)
    SetStateStorage(storage)
    {}

    GetStateStorage()
    { return null; }

    // Calculate text size. Text can be multi-line. Optionally ignore text
    // after a ## marker. CalcTextSize("") should return Vec2(0.0f, FontSize)
    CalcTextSize(text, hide_text_after_double_hash=false, wrap_width=-1)
    {
        let g = this.guictx;
        if (hide_text_after_double_hash)
            text = text.split("##")[0];
        let font = g.Font;
        if (text.length == 0)
            return new Vec2(0., g.FontLineHeight);

        let text_size = font.CalcTextSizeA(Number.MAX_VALUE, wrap_width, text,
                                            g.FontLineHeight);
        // "Round"
        text_size.x = Math.floor(text_size.x + 0.95);
        return text_size;
    }

     // Color Utilities -----------------------------------------
        // built into color object

    // Inputs Utilities -----------------------------------------

    // map Key.* values into user's key index. == io.KeyMap[key]
    GetKeyIndex(guikey)
    {
        console.assert(guikey >= 0 && guikey < Key.COUNT);
        return this.guictx.IO.KeyMap[guikey];
    }

    // is key being held. == io.KeysDown[user_key_index]. note that imgui
    // doesn't know the semantic of each entry of io.KeysDown[]. Use your
    // own indices/enums according to how your backend/engine stored them
    // into io.KeysDown[]!
    IsKeyDown(user_key_index)
    {
        if (user_key_index < 0) return false;
        console.assert(user_key_index >= 0 &&
                    user_key_index < this.guictx.IO.KeysDown.length);
        return this.guictx.IO.KeysDown[user_key_index];
    }

    // was key pressed (went from !Down to Down). if repeat=true, uses
    // io.KeyRepeatDelay / KeyRepeatRate
    IsKeyPressed(user_key_index, repeat=true)
    {
        if (user_key_index < 0)
            return false;
        let g = this.guictx;
        console.assert(user_key_index >= 0 && user_key_index < g.IO.KeysDown.length);
        const t = g.IO.KeysDownDuration[user_key_index];
        if (t == 0)
            return true;
        else
        if (repeat && t > g.IO.KeyRepeatDelay)
            return this.GetKeyPressedAmount(user_key_index, g.IO.KeyRepeatDelay,
                                            g.IO.KeyRepeatRate) > 0;
        else
            return false;
    }

    isKeyPressedMap(key, repeat=true)
    {
        const key_index = this.guictx.IO.KeyMap[key];
        return (key_index >= 0) ? this.IsKeyPressed(key_index, repeat) : false;
    }

    // was key released (went from Down to !Down)..
    IsKeyReleased(user_key_index)
    {
        if (user_key_index < 0) return false;
        let g = this.guictx;
        console.assert(user_key_index >= 0 &&
                        user_key_index < g.IO.KeysDown.length);
        return g.IO.KeysDownDurationPrev[user_key_index] >= 0 &&
              !g.IO.KeysDown[user_key_index];
    }

    // uses provided repeat rate/delay. return a count, most often 0 or 1
    // but might be >1 if RepeatRate is small enough that DeltaTime > RepeatRate
    GetKeyPressedAmount(key_index, repeat_delay, repeat_rate)
    {
        if (key_index < 0)
            return 0;
        let g = this.guictx;
        console.assert(key_index >= 0 && key_index < g.IO.KeysDown.length);
        const t = g.IO.KeysDownDuration[key_index];
        return this.calcTypematicPressedRepeatAmount(t, t - g.IO.DeltaTime,
                    repeat_delay, repeat_rate);

    }

    IsTouchScreen()
    {
        return this.guictx.IO.ConfigFlags & ConfigFlags.IsTouchScreen;
    }

    // is mouse button held (0=left, 1=right, 2=middle)
    IsMouseDown(button)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        return g.IO.MouseDown[button];
    }

    // is any mouse button held
    IsAnyMouseDown()
    {
        let g = this.guictx;
        for (let n=0; n < g.IO.MouseDown.length; n++)
        {
            if (g.IO.MouseDown[n])
                return true;
        }
        return false;
    }

    // did mouse button clicked (went from !Down to Down)
    //  (0=left, 1=right, 2=middle)
    IsMouseClicked(button, repeat=false)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        const t = g.IO.MouseDownDuration[button];
        if (t == 0) return true;
        if (repeat && t > g.IO.KeyRepeatDelay)
        {
            let delay = g.IO.KeyRepeatDelay;
            let rate = g.IO.KeyRepeatRate;
            if((((t - delay)%rate) > rate*0.5) !=
               (((t - delay - g.IO.DeltaTime)%rate) > rate*0.5))
                return true;
        }
        return false;
    }

    // did mouse button double-clicked. a double-click returns false in
    // IsMouseClicked(). uses io.MouseDoubleClickTime.
    IsMouseDoubleClicked(button)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        return g.IO.MouseDoubleClicked[button];
    }

    // did mouse button released (went from Down to !Down)
    IsMouseReleased(button)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        return g.IO.MouseReleased[button];
    }

    // is mouse dragging. if lock_threshold < -1.0f uses io.MouseDraggingThreshold
    IsMouseDragging(button = 0, lock_threshold=-1)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        if (!g.IO.MouseDown[button])
            return false;
        if (lock_threshold < 0)
            lock_threshold = g.IO.MouseDragThreshold;
        return g.IO.MouseDragMaxDistanceSqr[button] >= lock_threshold * lock_threshold;
    }

    // is mouse hovering given bounding rect (in screen space).
    // clipped by current clipping settings, but disregarding of other
    // consideration of focus/window ordering/popup-block.
    IsMouseHoveringRect(r_min, r_max, clip=true)
    {
        let g = this.guictx;
        // Clip
        let rect_clipped = new Rect(r_min, r_max);
        if (clip)
            rect_clipped.ClipWith(g.CurrentWindow.ClipRect);

        // Expand for touch input
        const rect_for_touch = new Rect(Vec2.Subtract(rect_clipped.Min,
                                                      g.Style.TouchExtraPadding),
                                        Vec2.Add(rect_clipped.Max,
                                                 g.Style.TouchExtraPadding));
        if (!rect_for_touch.Contains(g.IO.MousePos))
            return false;
        else
            return true;
    }

    IsMouseHoveringAnyWindow()
    {
        return this.IsWindowHovered(HoveredFlags.AnyWindow);
    }

    IsMouseHoveringWindow()
    {
        return this.IsWindowHovered(HoveredFlags.AllowWhenBlockedByPopup |
                                 HoveredFlags.AllowWhenBlockedByActiveItem);
    }

    // We typically use Vec2(-FLT_MAX,-FLT_MAX) to denote an invalid mouse
    // position.
    IsMousePosValid(pos=null)
    {
        const MOUSE_INVALID = -256000;
        let p = pos ? pos : this.guictx.IO.MousePos;
        return p.x >= MOUSE_INVALID && p.y >= MOUSE_INVALID;
    }

    // shortcut to ImGui::GetIO().MousePos provided by user, to be
    // consistent with other calls
    GetMousePos()
    {
        return this.guictx.IO.MousePos;
    }

    // retrieve backup of mouse position at the time of opening popup we have
    // BeginPopup() into
    GetMousePosOnOpeningCurrentPopup()
    {
        let g = this.guictx;
        if (g.BeginPopupStack.length > 0)
            return g.OpenPopupStack[g.BeginPopupStack.length-1].OpenMousePos;
        return g.IO.MousePos;
    }

    // return the delta from the initial clicking position while the mouse
    // button is pressed or was just released. This is locked and return 0.0f
    // until the mouse moves past a distance threshold at least once. If
    // lock_threshold < -1.0f uses io.MouseDraggingThreshold.
    GetMouseDragDelta(button=0, lock_threshold=-1.)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        if (lock_threshold < 0)
            lock_threshold = g.IO.MouseDragThreshold;
        if (g.IO.MouseDown[button] || g.IO.MouseReleased[button])
        {
            if (g.IO.MouseDragMaxDistanceSqr[button] >= lock_threshold * lock_threshold)
            {
                if (this.IsMousePosValid(g.IO.MousePos) &&
                    this.IsMousePosValid(g.IO.MouseClickedPos[button]))
                {
                    return g.IO.MousePos - g.IO.MouseClickedPos[button];
                }
            }
        }
        return Vec2.Zero();
    }

    ResetMouseDragDelta(button=0)
    {
        let g = this.guictx;
        console.assert(button >= 0 && button < g.IO.MouseDown.length);
        // NB: We don't need to reset g.IO.MouseDragMaxDistanceSqr
        g.IO.MouseClickedPos[button] = g.IO.MousePos;
    }

    // get desired cursor type, reset in ImGui::NewFrame(), this is updated
    // during the frame. valid before Render(). If you use software rendering
    // by setting io.MouseDrawCursor ImGui will render those for you
    GetMouseCursor()
    {
        return this.guictx.MouseCursor;
    }

    // set desired cursor type
    SetMouseCursor(cursor_type)
    {
        this.guictx.MouseCursor = cursor_type;
    }

    // attention: misleading name! manually override io.WantCaptureKeyboard
    // flag next frame (said flag is entirely left for your application to
    // handle). e.g. force capture keyboard when your widget is being hovered.
    // This is equivalent to setting
    //  "io.WantCaptureKeyboard = want_capture_keyboard_value";
    // after the next NewFrame() call.
    CaptureKeyboardFromApp(capture=true)
    {
        this.guictx.WantCaptureKeyboardNextFrame = capture ? 1 : 0;
    }

    // attention: misleading name! manually override io.WantCaptureMouse
    // flag next frame (said flag is entirely left for your application to
    // handle). This is equivalent to setting
    //  "io.WantCaptureMouse = want_capture_mouse_value;" after the next
    // NewFrame() call.
    CaptureMouseFromApp(capture=true)
    {
        this.guictx.WantCaptureMouseNextFrame = capture ? 1 : 0;
    }

    // Clipboard Utilities -------------------------------------
    // Clipboard is async and subject to "PermissionsAPI"
    async GetClipboardText(cb)
    {
        this.appServices.clipboard.readText().then((txt) => 
        {
            if(cb)
                cb(txt);
            return txt;
        }).catch((err) => 
        {
            if(cb)
                cb(null);
            console.error("failed to read from clipboard: " + err);
            return null;
        });
    }

    SetClipboardText(tx)
    {
        this.appServices.clipboard.writeText(tx).then(
           ()=>{},
           ()=>console.warn("clipboard write error"));
    }

    // Settings/.Ini Utilities --------------------
    // see settings.js
    // Memory Allocators - (unsupported)
}

export default Imgui;