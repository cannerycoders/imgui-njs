/**
 * ImGuiIO
 * Communicate most settings and inputs/outputs to imgui using this structure.
**/
import {Vec2} from "./types.js";
import {BackendFlags, ConfigFlags} from "./flags.js";
import {MouseCursor, NavInput, Key} from "./enums.js";
import {FontAtlas} from "./font.js";
import {ArrayEx} from "./arrayex.js";

const DirtyCount = 5; // iterations to "draw down" to LazyMode
const MinimumFrameInterval = 1000; // minimum 1 fps

export class IO
{
    constructor(imgui, canvas, appname)
    {
        this.imgui = imgui;
        this.PrevTime = 0;
        this.PrevDirtyTime = 0;
        this.Dirty = 0;
        this.SynthesizePointerEvents = 
            navigator.userAgent.indexOf("iPhone") !== -1 ||
            navigator.userAgent.indexOf("iPad") !== -1;

        //------------------------------------------------------------------
        // Configuration (fill once)
        //------------------------------------------------------------------
        this.ConfigFlags = 0;
        if((typeof window.orientation !== "undefined") || 
           (navigator.userAgent.indexOf("IEMobile") !== -1))
        {
            this.ConfigFlags |= ConfigFlags.IsTouchScreen;
        }

        this.BackendFlags = 0;
        this.DisplayOffset = new Vec2(0, 0); // position of display relative to parent (usually 0)
        this.DisplaySize = new Vec2(0, 0); // Main display size, in pixels. (Vec2)
        this.DeltaTime = 1 /  60; // Time elapsed since last frame, in seconds.
        this.IniSavingRate = 5; // Minimum time between saving state, in seconds.
        // Path to .ini file. Set NULL to disable automatic .ini loading/saving,
        // if e.g. you want to manually load/save from memory.
        this.IniFilename = `/${appname}/presets.json`;
        // Path to .log file (default parameter to ImGui::LogToFile when no
        // file is specified).
        this.LogFilename = `${appname}/diagnostics.log`;

        this.LazyDraw = false; // experimental: app can set LazyDraw in "bgd"

        // Time for a double-click, in seconds.
        this.MouseDoubleClickTime = .3;
        // Distance threshold to stay in to validate a double-click, in pixels.
        this.MouseDoubleClickMaxDist = 6;
        // Distance threshold before considering we are dragging.
        this.MouseDragThreshold = 6.0;
        // Map of indices into the KeysDown[512] entries array which
        // represent your "native" keyboard state.
        this.KeyMap = new ArrayEx();
        // When holding a key/button, time before it starts repeating, in
        // seconds (for buttons in Repeat mode, etc.).
        this.KeyRepeatDelay = 0.25;
        // When holding a button, time before the click-release is
        // deemed acceptable.  See ButtonFlags.Long
        this.LongPressInterval = .75; // sec (apple defaults to .5s)
        // When holding a key/button, rate at which it repeats, in seconds.
        this.KeyRepeatRate = 0.050;
        // Store your own data for retrieval by callbacks.
        this.UserData = null;

        this.Fonts = new FontAtlas(imgui);
        // Global scale all fonts
        this.FontGlobalScale = 1;
        // Allow user scaling text of individual window with CTRL+Wheel.
        this.FontAllowScaling = false;

        // For retina display or other situations where window coordinates o
        // are different from framebuffer coordinates. This generally ends up
        // in ImDrawData::FramebufferScale.
        this.DisplayFramebufferScale = new Vec2(1, 1);

        // Miscellaneous options
        // Request ImGui to draw a mouse cursor for you (if you are on a
        // platform without a mouse cursor). Cannot be easily renamed to
        // 'io.ConfigXXX' because this is frequently used by back-end
        // implementations.
        this.MouseDrawCursor = false;
        // OS X style: Text editing cursor movement using Alt instead of Ctrl,
        // Shortcuts using Cmd/Super instead of Ctrl, Line/Text Start and End
        // using Cmd+Arrows instead of Home/End, Double click selects by word
        // instead of selecting whole text, Multi-selection in lists uses
        // Cmd/Super instead of Ctrl (was called io.OptMacOSXBehaviors prior
        // to 1.63)
        this.ConfigMacOSXBehaviors = false;          // = defined(APPLE)
        // Set to false to disable blinking cursor, for users who consider
        // it distracting. (was called: io.OptCursorBlink prior to 1.63)
        this.ConfigInputTextCursorBlink = true;
        // Enable resizing of windows from their edges and from the
        // lower-left corner. This requires
        // (io.BackendFlags & BackendFlagsHasMouseCursors) because it
        // needs mouse cursor feedback. (This used to be a per-window
        // ImGuiWindowFlagsResizeFromAnySide flag)
        this.ConfigWindowsResizeFromEdges = true;
        // [BETA] Set to true to only allow moving windows when clicked+dragged
        // from the title bar. Windows without a title bar are not affected.
        this.ConfigWindowsMoveFromTitleBarOnly = false;

        //------------------------------------------------------------------
        // Platform Functions
        // (the imguiimplxxxx back-end files are setting those up for you)
        //------------------------------------------------------------------

        // Optional: Platform/Renderer back-end name (informational only! will
        // be displayed in About Window) + User data for back-end/wrappers to
        // store their own stuff.
        this.BackendPlatformName = "html5/canvas";
        this.BackendRendererName = "canvas/2d";
        this.BackendPlatformUserData = null;
        this.BackendRendererUserData = null;
        this.BackendLanguageUserData = null;

        // Optional: Access OS clipboard
        // (default to use native Win32 clipboard on Windows, otherwise uses
        // a private clipboard. Override to access OS clipboard on other
        // architectures)
        this.ClipboardUserData = null;
        this.Clipboardtext = null;

        // Optional: Notify OS Input Method Editor of the screen position of
        // your cursor for text input position (e.g. when using Japanese/Chinese
        // IME on Windows) (default to use native imm32 api on Windows)
        this.ImeSetInputScreenPosFn = null; // accepts(int x, int y)
        this.ImeWindowHandle = null; // (Windows) Set this to your HWND to get
                                      // automatic IME cursor positioning.

        //------------------------------------------------------------------
        // Input - Fill before calling NewFrame()
        //------------------------------------------------------------------

        // Mouse position, in pixels. Set to ImVec2(-FLTMAX,-FLTMAX) if
        // mouse is unavailable (on another screen, etc.)
        this.MousePos = new Vec2(-Number.MAX_VALUE, -Number.MAX_VALUE);
        // Mouse buttons: 0=left, 1=right, 2=middle + extras. ImGui itself
        // mostly only uses left button (BeginPopupContext** are using right
        // button). Others buttons allows us to track if the mouse is being
        // used by your application + available to user as a convenience via
        // IsMouse** API.
        this.MouseDown = [0,0,0,0,0];
        // Mouse wheel Vertical: 1 unit scrolls about 5 lines text.
        this.MouseWheel = 0;
        // Mouse wheel Horizontal. Most users don't have a mouse with an
        // horizontal wheel, may not be filled by all back-ends.
        // MouseEvent.button
        this.MouseWheelH = 0;
        // A number representing a given button:
        // 0: Main button pressed, usually the left button or the un-initialized state
        // 1: Auxiliary button pressed, usually the wheel button or the middle button (if present)
        // 2: Secondary button pressed, usually the right button
        // 3: Fourth button, typically the Browser Back button
        // 4: Fifth button, typically the Browser Forward button
        this.MouseButtonMap = [ 0, 2, 1, 3, 4 ];
        // Keyboard modifier pressed: Control
        this.KeyCtrl = false;
        // Keyboard modifier pressed: Shift
        this.KeyShift = false;
        // Keyboard modifier pressed: Alt
        this.KeyAlt = false;
        // Keyboard modifier pressed: Cmd/Super/Windows
        this.KeySuper;
        // Keyboard keys that are pressed (ideally left in the "native" order
        // your engine has access to keyboard keys, so you can use your own
        // defines/enums for keys).
        this.KeysDown = new ArrayEx();
        this.KeysDown.length = 512;
        // Gamepad inputs. Cleared back to zero by EndFrame(). Keyboard keys
        // will be auto-mapped and be written here by NewFrame().
        this.NavInputs = new ArrayEx();
        this.NavInputs.length = NavInput.COUNT;
        this.NavInputs.fill(0);

        // https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
        this.Touches = []; // ongoing touches
        this.TouchActive = false;
        this.TouchDelta = {x: 0, y: 0};

        //------------------------------------------------------------------
        // Output - Retrieve after calling NewFrame()
        //------------------------------------------------------------------
        // When io.WantCaptureMouse is true, imgui will use the mouse inputs,
        // do not dispatch them to your main game/application (in both cases,
        // always pass on mouse inputs to imgui). (e.g. unclicked mouse is
        // hovering over an imgui window, widget is active, mouse was clicked
        // over an imgui window, etc.).
        this.WantCaptureMouse = false;
        // When io.WantCaptureKeyboard is true, imgui will use the keyboard
        // inputs, do not dispatch them to your main game/application (in
        // both cases, always pass keyboard inputs to imgui). (e.g. InputText
        // active, or an imgui window is focused and navigation is enabled, etc.).
        this.WantCaptureKeyboard = false;
        // Mobile/console: when io.WantTextInput is true, you may display an
        // on-screen keyboard. This is set by ImGui when it wants textual
        // keyboard input to happen (e.g. when a InputText widget is active).
        this.WantTextInput = false;
        // MousePos has been altered, back-end should reposition mouse on
        // next frame. Set only when ImGuiConfigFlagsNavEnableSetMousePos
        // flag is enabled.
        this.WantSetMousePos = false;
        // When manual .ini load/save is active (io.IniFilename == NULL),
        // this will be set to notify your application that you can call
        // SaveIniSettingsToMemory() and save yourself. IMPORTANT: You need
        // to clear io.WantSaveIniSettings yourself.
        this.WantSaveIniSettings = false;
        // Directional navigation is currently allowed (will handle
        // ImGuiKeyNavXXX events) = a window is focused and it doesn't use
        // the ImGuiWindowFlagsNoNavInputs flag.
        this.NavActive = false;
        // Directional navigation is visible and allowed (will handle
        // ImGuiKeyNavXXX events).
        this.NavVisible = false;
        // Application framerate estimation, in frame per second. Solely for
        // convenience. Rolling average estimation based on IO.DeltaTime over
        // 120 frames
        this.Framerate = 60;
        // Vertices output during last call to Render()
        this.MetricsRenderVertices = 0;
        // Indices output during last call to Render() = number of triangles * 3
        this.MetricsRenderIndices = 0;
        // Number of visible windows
        this.MetricsRenderWindows = 0;
        // Number of active windows
        this.MetricsActiveWindows = 0;
        // Number of active allocations, updated by MemAlloc/MemFree based
        // on current context. May be off if you have multiple imgui contexts.
        this.MetricsActiveAllocations;

        //------------------------------------------------------------------
        // [Internal] ImGui will maintain those fields. Forward compatibility not guaranteed!
        //------------------------------------------------------------------
        // Mouse delta. Note that this is zero if either current or previous
        // position are invalid (-FLTMAX,-FLTMAX), so a disappearing/reappearing
        // mouse won't have a huge delta.
        this.MouseDelta = new Vec2(0, 0);
        // Previous mouse position (note that MouseDelta is not necessary ==
        // MousePos-MousePosPrev, in case either position is invalid)
        this.MousePosPrev = new Vec2(0, 0);
        // Position at time of clicking
        this.MouseClickedPos = [null, null, null, null, null]; // of Vec2
        // Time of last click (used to figure out double-click)
        this.MouseClickedTime = new ArrayEx();
        // Mouse button went from !Down to Down
        this.MouseClicked = new ArrayEx();
        // Has mouse button been double-clicked?
        this.MouseDoubleClicked = new ArrayEx();
        // Mouse button went from Down to !Down
        this.MouseReleased = new ArrayEx();
        this.MouseDownOwned = new ArrayEx();
        // Track if button was clicked inside a window. We don't request
        // mouse capture from the application if click started outside ImGui bounds.
        this.MouseDownDuration = new ArrayEx();
        // Duration the mouse button has been down (0.0f == just clicked)
        this.MouseDownDurationPrev = new ArrayEx();
        // Previous time the mouse button has been down
        this.MouseDragMaxDistanceAbs = new ArrayEx();
        // Maximum distance, absolute, on each axis, of how much mouse has
        // traveled from the clicking point
        this.MouseDragMaxDistanceSqr = new ArrayEx();
        // Squared maximum distance of how much mouse has traveled from
        // the clicking point

        this.KeysDownDuration = new ArrayEx();
        // Duration the keyboard key has been down (0.0f == just pressed)
        this.KeysDownDurationPrev = new ArrayEx();
        // Previous duration the key has been down

        this.NavInputsDownDuration = new ArrayEx();
        this.NavInputsDownDuration.length = NavInput.COUNT;
        this.NavInputsDownDuration.fill(0);
        this.NavInputsDownDurationPrev = new ArrayEx();
        this.NavInputsDownDurationPrev.length = NavInput.COUNT;
        this.NavInputsDownDurationPrev.fill(0);

        // Queue of characters input (obtained by platform back-end).
        this.InputKeyEvents = new ArrayEx(); // evt

        this.initCanvas(canvas);
    }

    initCanvas(canvas)
    {
        this.canvas = canvas;
        if (typeof(window) !== "undefined")
        {
            // ImGui.LoadIniSettingsFromMemory(window.localStorage.getItem("imgui.ini") || "");
        }

        if (typeof(this.imgui.appServices) !== "undefined")
        {
            this.ConfigMacOSXBehaviors = this.imgui.appServices.platform.match(/Mac/) !== null;
        }

        if (typeof(document) !== "undefined")
        {
            document.body.addEventListener("copy", this.onCopy.bind(this));
            document.body.addEventListener("cut", this.onCut.bind(this));
            document.body.addEventListener("paste", this.onPaste.bind(this));
        }

        this.ClipboardUserData = null;

        if (typeof(window) !== "undefined")
        {
            window.addEventListener("resize",
                                    this.onWindowResize.bind(this));
            window.addEventListener("gamepadconnected",
                                    this.onGamepadConnected.bind(this));
            window.addEventListener("gamepaddisconnected",
                                    this.onGamepadDisconnected.bind(this));
            // prevent browser context menu
            window.oncontextmenu = function() { return false; };

        }

        if (canvas !== null)
        {
            this.onWindowResize();
            // Disable browser handling of all panning and zooming gestures.
            canvas.tabIndex = 1; // forces delivery of keyboard events
            canvas.style.touchAction = "none";
            canvas.addEventListener("blur", this.onBlur.bind(this));

            /*
             * The onkeypress event occurs when the user presses a key (on the keyboard).
             * The order of events related to the onkeypress event:
             *  1. onkeydown
             *  2. onkeypress
             *  3. onkeyup
             * Note: The onkeypress event is not fired for all keys
             *   (e.g. ALT, CTRL, SHIFT, ESC) in all browsers. To detect only
             *   whether the user has pressed a key, use the onkeydown event
             *   instead, because it works for all keys.
             */
            // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
            /* NB: only listen to canvas keyboard and mouse events to support
             *  mixed-mode DOM operation (as with AceEditor).
             */
            canvas.addEventListener("keydown", this.onKeyDown.bind(this));
            canvas.addEventListener("keyup", this.onKeyUp.bind(this));
            canvas.addEventListener("keypress", this.onKeyPress.bind(this));

            /* pointer events combine touch events with mouse events */
            canvas.addEventListener("pointermove", this.onPointerMove.bind(this));
            canvas.addEventListener("pointerdown", this.onPointerDown.bind(this));
            canvas.addEventListener("pointerup", this.onPointerUp.bind(this));

            canvas.addEventListener("wheel", this.onWheel.bind(this),
                    {passive: true}); // means no prevent-default
            
            // On a phone, touch can be tricky since browsers use touch
            // events to synthesize pointerclick and pointermove events.
            // No mouse, no wheel, etc. If we want a natural scrolling
            // behavior from touch events we would need to distinguish between 
            // mouse-like and mousewheel-like events. Currently this doesn't
            // seem possible.  Specifically: if a touchstart occurs over a
            // clickable (button, drag, etc) we can't infer whether the
            // user is scrolling or clicking.  In the case of buttons, we
            // could wait for a release event and check if there's little/no 
            // motion. This wouldn't work for draggables like sliders and
            // drags.  Currently we update this.Touch* and support 
            // mouse-wheel-like behavior in imgui.updateMouseWheel().
            canvas.addEventListener("touchstart", this.onTouchStart.bind(this),
                                    {passive: true});
            canvas.addEventListener("touchend", this.onTouchEnd.bind(this),
                                    {passive: true});
            canvas.addEventListener("touchcancel", this.onTouchCancel.bind(this),
                                    {passive: true});
            canvas.addEventListener("touchmove", this.onTouchMove.bind(this),
                                    {passive: true});
        }

        // Setup back-end capabilities flags
        // We can honor GetMouseCursor() values (optional)
        this.BackendFlags |= BackendFlags.HasMouseCursors;

        // Keyboard mapping used to peek into keysDown.
        this.NavKeys =
        {
            "ArrowLeft": 37,
            "ArrowUp": 38,
            "ArrowRight": 39,
            "ArrowDown": 40,
            "Escape": 27,
            "Tab": 9,
            "Delete": 46,
            "Backspace": 8,
            "PageUp": 33,
            "PageDown": 34,
            "Insert": 45,
            "Home": 36,
            "End": 35,
            "Space": 32,
            "Enter": 13,
        };

        this.MetaKeys =
        {
            "Control": 17,
            "Shift": 16,
            "Alt": 18,
            "Meta": 91, // Windows key
        };

        this.KeyMap[Key.Tab] = this.NavKeys.Tab;
        this.KeyMap[Key.LeftArrow] = this.NavKeys.ArrowLeft;
        this.KeyMap[Key.RightArrow] = this.NavKeys.ArrowRight;
        this.KeyMap[Key.UpArrow] = this.NavKeys.ArrowUp;
        this.KeyMap[Key.DownArrow] = this.NavKeys.ArrowDown;
        this.KeyMap[Key.PageUp] = this.NavKeys.PageUp;
        this.KeyMap[Key.PageDown] = this.NavKeys.PageDown;
        this.KeyMap[Key.Home] = this.NavKeys.Home;
        this.KeyMap[Key.End] = this.NavKeys.End;
        this.KeyMap[Key.Insert] = this.NavKeys.Insert;
        this.KeyMap[Key.Delete] = this.NavKeys.Delete;
        this.KeyMap[Key.Backspace] = this.NavKeys.Backspace;
        this.KeyMap[Key.Space] = this.NavKeys.Space;
        this.KeyMap[Key.Enter] = this.NavKeys.Enter;
        this.KeyMap[Key.Escape] = this.NavKeys.Escape;
        this.KeyMap[Key.A] = 65;
        this.KeyMap[Key.C] = 67;
        this.KeyMap[Key.V] = 86;
        this.KeyMap[Key.X] = 88;
        this.KeyMap[Key.Y] = 89;
        this.KeyMap[Key.Z] = 90;

        this.KeyCodeMap = {}; // inverse of KeyMap
        for(let key in this.NavKeys)
            this.KeyCodeMap[this.NavKeys[key]] = key;
        this.KeyCodeMap[65] = "A"; // select-all
        this.KeyCodeMap[67] = "C"; // copy
        this.KeyCodeMap[86] = "V"; // paste
        this.KeyCodeMap[88] = "X"; // cut
        this.KeyCodeMap[89] = "Y"; // redo
        this.KeyCodeMap[90] = "Z"; // undo
    }

    // called via guictx.NewFrame which is called by imgui.NewFrame
    // NB: this happens before imgui resets volatile state (like MouseCursor)
    //  so we react to the state at the end of last frame.
    NewFrame(time)
    {
        if(this.WantsSaveIniSettings)
        {
            this.WantsSaveIniSettings = false;
            // XXX: save settings to .prefs file/dir
            window.localStorage.setItem(this.IniFilename, this.imgui.SaveIniSettingsToMemory());
        }

        this.DisplaySize.x = this.canvas.scrollWidth;
        this.DisplaySize.y = this.canvas.scrollHeight;
        let cbound = this.canvas.getBoundingClientRect();
        if(cbound && cbound.x != undefined)
        {
            // preferred since it's viewport relative, but seems to
            // fail on older android browsers
            this.DisplayOffset.x = cbound.x;
            this.DisplayOffset.y = cbound.y;
        }
        else
        {
            if(this.DisplayOffset.y != this.canvas.offsetTop)
            {
                console.debug("bad bounding client rect " + JSON.stringify(cbound));
                this.DisplayOffset.x = this.canvas.offsetLeft;
                this.DisplayOffset.y = this.canvas.offsetTop;
            }
        }

        const dt = time - this.PrevTime;
        this.PrevTime = time;
        this.DeltaTime = dt / 1000;
        if(this.LazyDraw)
        {
            // this experiment currently fails due to the fact that
            // certain imgui behaviors occur over multiple frames.
            // Popups, textinput are among the biggest fails.
            const ddt = time - this.PrevDirtyTime;
            if(ddt > MinimumFrameInterval) 
            {
                this.PrevDirtyTime = time;
                this.Dirty++;
            }
        }
        else
            this.Dirty = true; // checked by app.OnLoop/imgui.NewFrame

        if (this.WantSetMousePos)
            console.log("TODO: MousePos", this.MousePos.x, this.MousePos.y);


        if(this.MouseDrawCursor)
            document.body.style.cursor = "none";
        else
        {
            let nc;
            switch(this.imgui.GetMouseCursor())
            {
            case MouseCursor.None:
                nc = "none";
                break;
            case MouseCursor.TextInput:
                nc = "text";
                break;
            case MouseCursor.ResizeAll:
                nc = "move";
                break;
            case MouseCursor.ResizeNS:
                nc = "ns-resize";
                break;
            case MouseCursor.ResizeEW:
                nc = "ew-resize";
                break;
            case MouseCursor.ResizeNESW:
                nc = "nesw-resize";
                break;
            case MouseCursor.ResizeNWSE:
                nc = "nwse-resize";
                break;
            case MouseCursor.Hand:
                nc = "move";
                break;
            case MouseCursor.Arrow:
            default:
                nc = "default";
                break;
            }
            if(document.body.style.cursor != nc)
            {
                // console.log("new cursor: " + nc);
                document.body.style.cursor = nc;
            }
        }

        this.updateMouseInputs();
    }

    EndFrame()
    {
        if(this.Dirty > 0)
            this.Dirty--;
    }

    Shutdown()
    {
        if (this.canvas)
        {
            let c = this.canvas;
            c.removeEventListener("blur", this.onBlur.bind(this));
            c.removeEventListener("keydown", this.onKeyDown.bind(this));
            c.removeEventListener("pointerup", this.onPointerUp.bind(this));
            c.removeEventListener("wheel", this.onWheel.bind(this));
            c.removeEventListener("keyup", this.onKeyUp.bind(this));
            c.removeEventListener("keypress", this.onKeyPress.bind(this));
            c.removeEventListener("pointermove", this.onPointerMove.bind(this));
            c.removeEventListener("pointerdown", this.onPointerDown.bind(this));
            c.removeEventListener("contextmenu", this.onContextMenu.bind(this));
            c.removeEventListener("touchstart", this.onTouchStart.bind(this));
            c.removeEventListener("touchend", this.onTouchEnd.bind(this));
            c.removeEventListener("touchcancel", this.onTouchCancel.bind(this));
            c.removeEventListener("touchmove", this.onTouchMove.bind(this));
        }

        if (typeof(window) !== "undefined")
        {
            window.removeEventListener("resize", this.onWindowResize.bind(this));
            window.removeEventListener("gamepadconnected", this.onGamepadConnected.bind(this));
            window.removeEventListener("gamepaddisconnected", this.onGamepadDisconnected.bind(this));
        }

        if (typeof(document) !== "undefined")
        {
            document.body.removeEventListener("cut", this.onCut.bind(this));
            document.body.removeEventListener("copy", this.onCopy.bind(this));
            document.body.removeEventListener("paste", this.onPaste.bind(this));
        }
    }

    // Clear the text input buffer manually
    ClearInputCharacters()
    {
        this.InputKeyEvents.resize(0);
    }

    GetKeyFromCode(code)
    {
        let ret = this.KeyCodeMap[code]; // dont want Tab to convert to "\t"
        if(ret == undefined)
            ret = String.fromCharCode(code);
        return ret;
    }

    onCopy(evt/*ClipboardEvent*/)
    {
        evt.clipboardData.setData("text/plain", this.clipboardtext);
        // console.log(`${event.type}: "${clipboardtext}"`);
        evt.preventDefault();
        this.Dirty = DirtyCount;
    }

    onCut(evt/*ClipboardEvent*/)
    {
        evt.clipboardData.setData("text/plain", this.clipboardtext);
        // console.log(`${event.type}: "${clipboardtext}"`);
        evt.preventDefault();
        this.Dirty = DirtyCount;
    }

    onPaste(evt)
    {
        this.Clipboardtext = evt.clipboardData.getData("text/plain");
        // console.log(`${evt.type}: "${clipboardtext}"`);
        evt.preventDefault();
        this.Dirty = DirtyCount;
    }

    onWindowResize()
    {
        if (this.canvas !== null)
        {
            const devicePixelRatio = window.devicePixelRatio || 1;
            this.canvas.width = this.canvas.scrollWidth * devicePixelRatio;
            this.canvas.height = this.canvas.scrollHeight * devicePixelRatio;
        }
        this.Dirty = DirtyCount;
    }

    onGamepadConnected(evt)
    {
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                    evt.gamepad.index, evt.gamepad.id,
                    evt.gamepad.buttons.length, evt.gamepad.axes.length);
    }

    onGamepadDisconnected(evt)
    {
        console.log("Gamepad disconnected at index %d: %s.",
                    evt.gamepad.index, evt.gamepad.id);
    }

    onBlur(evt/*FocusEvent*/)
    {
        this.KeyCtrl = false;
        this.KeyShift = false;
        this.KeyAlt = false;
        this.KeySuper = false;
        for (let i=0; i< this.KeysDown.length; ++i)
            this.KeysDown[i] = false;
        for (let i=0; i< this.MouseDown.length; ++i)
            this.MouseDown[i] = false;
        this.Dirty = DirtyCount;
    }

    // In a keypress event, the Unicode value of the key pressed is
    // stored in either the keyCode or charCode property, never both.
    // If the key pressed generates a character (e.g. 'a'), charCode
    // is set to the code of that character, respecting the letter case.
    // (i.e. charCode takes into account whether the shift key is held down).
    // Otherwise, the code of the pressed key is stored in keyCode.
    //
    // - Keyboard:
    // - Set io.ConfigFlags |= ConfigFlags.NavEnableKeyboard to enable.
    //   NewFrame() will automatically fill io.NavInputs[] based on your
    //   io.KeysDown[] + io.KeyMap[] arrays.
    // - When keyboard navigation is active (io.NavActive + ConfigFlags.NavEnableKeyboard),
    //   the io.WantCaptureKeyboard flag will be set. For more advanced uses,
    //   you may want to read from:
    //    - io.NavActive: true when a window is focused and it doesn't have
    //      the WindowFlagsNoNavInputs flag set.
    //    - io.NavVisible: true when the navigation cursor is visible (and
    //      usually goes false when mouse is used).
    //    - or query focus information with e.g.
    //       -- IsWindowFocused(FocusedFlags.AnyWindow)
    //       -- IsItemFocused() etc. functions.
    onKeyDown(evt/*KeyboardEvent*/)
    {
        this.KeyCtrl = evt.ctrlKey;
        this.KeyShift = evt.shiftKey;
        this.KeyAlt = evt.altKey;
        this.KeySuper = evt.metaKey;
        this.KeysDown[evt.keyCode] = true; // produce a sparse array
        // a Control + o shows up as two events:
        //  1. Control
        //  2. o (control-key still down)
        // if control/meta/alt isn't down, then keypress is invoked
        // console.info(`key down: ${evt.keyCode}, ${evt.key}, ${evt.timeStamp}`);
        if(this.MetaKeys[evt.key] == undefined)
        {
            // not a meta key
            this.InputKeyEvents.push(evt);
            // ClearInputCharacters called during imgui.EndFrame(0)

            // since we defer delivery of events, we can't leave it to
            // client to invoke evt.preventDefault.  See also 
            // . this.WantCaptureKeyboard above.
            if(!this.isSystemEvent(evt))
                evt.preventDefault();
        }
        this.Dirty = DirtyCount;
    }

    // this is a matter of policy, perhaps user-configuration required?
    isSystemEvent(evt)
    {
        let issystem = false;
        if(this.imgui.appServices.platform.indexOf("Mac") != -1)
        {
            // cmd-alt-j
            if(evt.shiftKey && evt.metaKey && event.code == "KeyI")
                issystem = true;
            else
            if(evt.shiftKey && evt.metaKey && event.code == "KeyC")
                issystem = true;
            else
            if(evt.metaKey && event.code == "KeyR")
                issystem = true;
        }
        else
        {
            // ctrl-shift-I is dev-inspector
            if(evt.shiftKey && evt.ctrlKey && evt.key.toUpperCase() == "I")
                issystem = true;
            if(evt.ctrlKey && evt.code == "KeyR") // Reload in electron
                issystem = true;
        }
        if(evt.code == "F11" || // F11 is fullscreen
           evt.code == "F12")  // F12 is inspector
            issystem = true;

        if(false)
        {
            // electron on mac doesn't react to certain system events
            //  cmd-R works, shift-cmd-I/C don't.
            console.log(event.code + 
                    `\nmeta: ${evt.metaKey} ` +
                    `\nalt: ${event.altKey} ` +
                    `\nshift: ${event.shiftKey}` +
                    `\nplatform: ${this.imgui.appServices.platform}`);
            if(issystem)
                console.log("is a system key combination!");
        }
        return issystem;
    }

    onKeyUp(evt/*KeyboardEvent*/)
    {
        // console.log(event.type, event.key, event.keyCode);
        this.KeyCtrl = evt.ctrlKey;
        this.KeyShift = evt.shiftKey;
        this.KeyAlt = evt.altKey;
        this.KeySuper = evt.metaKey;
        this.KeysDown[evt.keyCode] = false;
        this.Dirty = DirtyCount;
    }

    // no meta keys are delivered through this event, only "regular" keys.
    // there is some 'magic' associated with input methods for diverse
    // languages that we may lose by skipping these?
    onKeyPress(evt/*KeyboardEvent*/)
    {
        // console.debug(`keypress: ${evt.keyCode}, ${evt.key}`);
        this.Dirty = DirtyCount;
    }

    onPointerMove(evt/*PointerEvent*/)
    {
        this.MousePos.x = evt.offsetX;
        this.MousePos.y = evt.offsetY;
        if (this.WantCaptureMouse) 
        {
            evt.preventDefault();
        }
        // console.log(`${this.MousePos.x.toFixed(0)}, ${this.MousePos.y.toFixed(0)}`);
        this.Dirty = DirtyCount;
    }

    onPointerDown(evt/*pointerEvent*/)
    {
        this.canvas.focus();
        this.MousePos.x = evt.offsetX;
        this.MousePos.y = evt.offsetY;
        this.MouseDown[this.MouseButtonMap[evt.button]] = true;
        evt.preventDefault(); // https://bit.ly/2SfbQqG
        this.Dirty = DirtyCount;
    }

    onPointerUp(evt/*PointerEvent*/)
    {
        this.MouseDown[this.MouseButtonMap[evt.button]] = false;
        this.Dirty = DirtyCount;
    }

    onWheel(evt/*WheelEvent*/)
    {
        let scale = 1.0;
        switch (evt.deltaMode)
        {
        case 0: // pixels
            scale = 0.01;
            break;
        case 1: // lines
            scale = 0.2;
            break;
        case 2: // pages
            scale = 1.0;
            break;
        }
        this.MouseWheelH = evt.deltaX * scale;
        this.MouseWheel = -evt.deltaY * scale; // Mouse wheel: 1 unit scrolls about 5 lines text.
        this.Dirty = DirtyCount;
    }

    onTouchStart(evt)
    {
        var touches = evt.changedTouches;
        var offset = {x: 0, y: 0}; // getTouchPos(evt);  
        for (var i=0; i < touches.length; i++) 
        {
            if(this.validateTouch(touches[i], offset))
            {
                // evt.preventDefault();  (passive)
                // console.log("touchstart:" + i + " " + Math.round(touches[i].clientY));
                this.Touches.push(this.copyTouch(touches[i]));
                this.TouchActive++;

                this.TouchDelta.x = 0; // <-- cancel deceleration
                this.TouchDelta.y = 0;
                if(this.SynthesizePointerEvents)
                {
                    // https://github.com/Rich-Harris/Point
                    // pointerOver (we're not currently using this)
                    // pointerEnter, (we're not currently using this)
                    // pointerDown
                    this.fakePointerEvent(evt, touches[i]);
                    this.onPointerMove(evt);
                    this.onPointerDown(evt); // XXX: button mapping
                }
            }
        }
        this.Dirty = DirtyCount;
    }

    onTouchMove(evt)
    {
        let touches = evt.changedTouches;
        let offset = {x: 0, y: 0};
        let scale = .01; // <---- scaling constant determined experimentally
                         // see also misc.js for deceleration constant
        for (let i = 0; i < touches.length; i++) 
        {
            if(this.validateTouch(touches[i], offset))
            {
                // evt.preventDefault(); (passive)
                let j = this.getTouchIndex(touches[i]);
                if (j >= 0) 
                {
                    let deltaX = touches[i].clientX - this.Touches[j].x;
                    let deltaY = touches[i].clientY - this.Touches[j].y;
                    // console.log("move by: " + 
                    //              Math.round(deltaX) + ", " + 
                    //              Math.round(deltaY));
                    // swap in the new touch record
                    this.Touches.splice(j, 1, this.copyTouch(touches[i])); 
                    this.TouchDelta.x = deltaX * scale;
                    this.TouchDelta.y = deltaY * scale;
                }
                if(this.SynthesizePointerEvents)
                {
                    this.fakePointerEvent(evt, touches[i]);
                    this.onPointerMove(evt);
                }
            } 
            else 
            {
                console.error("can't figure out which touch to continue");
            }
        }
        this.Dirty = DirtyCount;
    }

    onTouchEnd(evt)
    {
        var touches = evt.changedTouches;
        var offset = {x: 0, y: 0};
        for (let i = 0; i < touches.length; i++) 
        {
            if(this.validateTouch(touches[i], offset))
            {
                // evt.preventDefault(); (passive)
                let j = this.getTouchIndex(touches[i]);
                if (j >= 0) 
                {
                    this.Touches.splice(j, 1); // remove it; we're done
                    this.TouchActive--;
                    // we could set TouchDelta to zero but to
                    // get deceleration, we let updateMouseWheel
                    // handle it.
                }
                else 
                {
                    // console.log("hm: " + touches[i].identifier);
                }
                if(this.SynthesizePointerEvents)
                {
                    this.fakePointerEvent(evt, touches[i]);
                    this.onPointerUp(evt);
                }
            }
            else
                console.error("invalid touch");
        }
        this.Dirty = DirtyCount;
    }

    onTouchCancel(evt)
    {
        // evt.preventDefault(); (passive)
        for(var i=0;i<evt.changedTouches.length;i++)
        {
            let j = this.getTouchIndex(evt.changedTouches[i]);
            if(j != -1)
            {
                this.TouchActive--;
                this.Touches.splice(j, 1);
            }
            if(this.SynthesizePointerEvents)
            {
                this.fakePointerEvent(evt, touches[i]);
                this.onPointerUp(evt);
            }
        }
        this.Dirty = DirtyCount;
    }

    fakePointerEvent(evt, touch)
    {
        // add fields to event that are needed by onPointer[Move,Down,Up]
        // touch.client{X,Y} is coordinate of touch poihnt relative to
        // the browser's viewport excluding scroll offset
        let r = evt.target.getBoundingClientRect();
        evt.button = 0;
        evt.offsetX = touch.clientX - r.left;
        evt.offsetY = touch.clientY - r.top;
        evt.preventDefault();
    }

    getTouchIndex(t)
    {
        for(let i=0;i<this.Touches.length;i++)
        {
            if(t.identifier == this.Touches[i].id)
                return i;
        }
        return -1;
    }

    copyTouch(t)
    {
        return {
            id: t.identifier,
            x: t.clientX,
            y: t.clientY
        };
    }

    validateTouch(t, offset)
    {
        return (t.clientX - offset.x > 0 && 
                t.clientX - offset.x < parseFloat(this.canvas.width) && 
                t.clientY - offset.y > 0 && 
                t.clientY - offset.y < parseFloat(this.canvas.height));
    }

    onContextMenu(evt/*Event*/) /* rightclick, (change background?) */
    {
        // no-op to prevent system menu
    }

    updateMouseInputs() // called by imgui on NewFrame
    {
        let imgui = this.imgui;
        let g = this.imgui.guictx;
        // Round mouse position to avoid spreading non-rounded position
        // (e.g. UpdateManualResize doesn't support them well)
        if (imgui.IsMousePosValid(this.MousePos))
        {
            this.MousePos = g.LastValidMousePos = Vec2.Floor(this.MousePos);
        }

        // If mouse just appeared or disappeared (usually denoted by
        // -FLT_MAX components) we cancel out movement in MouseDelta
        if (imgui.IsMousePosValid(this.MousePos) &&
            imgui.IsMousePosValid(this.MousePosPrev))
        {
            this.MouseDelta = Vec2.Subtract(this.MousePos, this.MousePosPrev);
            /* DEBUG
            if(this.MouseDown[0])
            {
                console.log(this.MouseDelta);
            }
            */
        }
        else
            this.MouseDelta = Vec2.Zero();
        if (this.MouseDelta.x != 0 || this.MouseDelta.y != 0)
            g.NavDisableMouseHover = false;

        this.MousePosPrev = this.MousePos.Clone();
        for (let i = 0; i < this.MouseDown.length; i++)
        {
            this.MouseClicked[i] = this.MouseDown[i] && this.MouseDownDuration[i] < 0.;
            this.MouseReleased[i] = !this.MouseDown[i] && this.MouseDownDuration[i] >= 0;
            this.MouseDownDurationPrev[i] = this.MouseDownDuration[i];
            this.MouseDownDuration[i] = this.MouseDown[i] ?
                            (this.MouseDownDuration[i] < 0 ? 0 :
                                this.MouseDownDuration[i] + this.DeltaTime) : -1;
            this.MouseDoubleClicked[i] = false;
            if (this.MouseClicked[i])
            {
                if ((g.Time - this.MouseClickedTime[i]) < this.MouseDoubleClickTime)
                {
                    let deltaClick = imgui.IsMousePosValid(this.MousePos) ?
                            Vec2.Subtract(this.MousePos, this.MouseClickedPos[i]) :
                            Vec2.Zero();
                    if (deltaClick.LengthSq() <
                        this.MouseDoubleClickMaxDist*this.MouseDoubleClickMaxDist)
                    {
                        this.MouseDoubleClicked[i] = true;
                    }
                    // so the third click isn't turned into a double-click
                    this.MouseClickedTime[i] = -Number.MAX_VALUE;
                }
                else
                {
                    this.MouseClickedTime[i] = g.Time;
                }
                this.MouseClickedPos[i] = this.MousePos.Clone();
                this.MouseDragMaxDistanceAbs[i] = new Vec2(0, 0);
                this.MouseDragMaxDistanceSqr[i] = 0.;
            }
            else
            if (this.MouseDown[i])
            {
                // Maintain the maximum distance we reaching from the initial click position, which is used with dragging threshold
                let deltaClick = imgui.IsMousePosValid(this.MousePos) ?
                                Vec2.Subtract(this.MousePos, this.MouseClickedPos[i]) :
                                Vec2.Zero();
                let len = deltaClick.LengthSq();
                this.MouseDragMaxDistanceSqr[i] = Math.max(this.MouseDragMaxDistanceSqr[i],len);
                this.MouseDragMaxDistanceAbs[i].x = Math.max(this.MouseDragMaxDistanceAbs[i].x,
                                                            Math.abs(deltaClick.x));
                this.MouseDragMaxDistanceAbs[i].y = Math.max(this.MouseDragMaxDistanceAbs[i].y,
                                                            Math.abs(deltaClick.y));
            }
            if (this.MouseClicked[i]) // Clicking any mouse button reactivate mouse hovering which may have been deactivated by gamepad/keyboard navigation
                g.NavDisableMouseHover = false;
        }
    }

    // see misc.js for updateMouseWheel

} // end of class IO

export default IO;
