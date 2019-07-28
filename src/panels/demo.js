/* global App */
import {WindowFlags} from "../window.js";
import {BackendFlags, CondFlags, ConfigFlags} from "../flags.js";
import {Key} from "../enums.js";
import {Vec2, ValRef} from "../types.js";
import {StyleEditor} from "./styleeditor.js";
import {ExampleFileMenu} from "./demoMenus.js";
import {DemoWidgets} from "./demoWidgets.js";
import {DemoLayout} from "./demoLayout.js";
import {DemoPopups} from "./demoPopups.js";
import {DemoColumns} from "./demoColumns.js";
import {DemoCustomRendering} from "./demoCustomRendering.js";
import {DemoPropertyEditor} from "./demoPropertyEditor.js";
import {DemoSimpleLayout} from "./demoSimpleLayout.js";

import {GetLog} from "./log.js";

export class DemoWindow
{
    constructor()
    {
        // Examples App
        this.showAppDocuments = new ValRef(false);
        this.showAppMainMenuBar = new ValRef(false);
        this.showAppConsole = new ValRef(false);
        this.showAppLayout = new ValRef(false);
        this.showAppPropertyEditor = new ValRef(false);
        this.showAppLongText = new ValRef(false);
        this.showAppAutoResize = new ValRef(false);
        this.showAppConstrainedResize = new ValRef(false);
        this.showAppSimpleOverlay = new ValRef(false);
        this.showAppWindowTitles = new ValRef(false);
        this.showAppCustomRendering = new ValRef(false);
        this.showAppStyleEditor = new ValRef(false);
        this.showAppMetrics = new ValRef(false);
        this.showAppAbout = new ValRef(false);

        // Window Options
        this.noTitleBar = new ValRef(false);
        this.noScrollBar = new ValRef(false);
        this.noMenu = new ValRef(false);
        this.noMove = new ValRef(false);
        this.noResize = new ValRef(false);
        this.noCollapse = new ValRef(false);
        this.noNav = new ValRef(false);
        this.noBgd = new ValRef(false);
        this.noBringToFront = new ValRef(false);
        this.noClose = new ValRef(false);

        // misc
        this.counter = 0;

        // console.debug("imgui demo loaded");
    }

    Show(imgui, winname="imgui demo", isOpen=null)
    {
        if(isOpen != null && !isOpen.get()) return;
        let done = false;
        let winflags = this.getWinFlags();

        this.imgui = imgui;
        this.log = GetLog(imgui);
        if(!this.styleEditor)
        {
            this.styleEditor = new StyleEditor(imgui);
            this.demoWidgets = new DemoWidgets(imgui);
            this.demoLayout = new DemoLayout(imgui);
            this.demoPopups = new DemoPopups(imgui);
            this.demoColumns = new DemoColumns(imgui);
            this.customRendering = new DemoCustomRendering(imgui);
        }

        if(this.noClose.get())
            isOpen = null;

        this.showAppWindows(imgui);

        imgui.SetNextWindowPos(new Vec2(40, 40), CondFlags.FirstUseEver);
        imgui.SetNextWindowSize(new Vec2(500, 700), CondFlags.FirstUseEver);

        if(!imgui.Begin(winname, isOpen, winflags))
        {
            imgui.End();
            return done;
        }

        // Use fixed width for labels (by passing a negative value),
        // the rest goes to widgets. We choose a width proportional
        // to our font size.
        imgui.PushItemWidth(imgui.GetFontSize() * -12);
        if (imgui.Button("Button")) // Buttons return true when clicked
            this.counter++;
        imgui.SameLine();
        imgui.PushFont("monospace");
        imgui.Text(`counter=${this.counter}`);
        imgui.SameLine();
        let fps = imgui.GetIO().Framerate;
        let ms = (1000.0 / fps).toFixed(1);
        imgui.Text(`${fps.toFixed(0)} fps, ${ms} mspf`);
        let mouse = imgui.GetIO().MousePos;
        if(mouse.x != -Number.MAX_VALUE)
        {
            imgui.SameLine();
            imgui.Text(`mouse: ${mouse.x}, ${mouse.y}`);
        }
        imgui.PopFont();

        if(imgui.BeginMenuBar())
        {
            if(imgui.BeginMenu("File"))
            {
                done = ExampleFileMenu(imgui); // only done if quit
                imgui.EndMenu();
            }
            if (imgui.BeginMenu("Examples"))
            {
                imgui.MenuItem("Main menu bar", null, this.showAppMainMenuBar);
                imgui.MenuItem("Console", null, this.showAppConsole);
                imgui.MenuItem("Simple layout", null, this.showAppLayout);
                imgui.MenuItem("Property editor", null, this.showAppPropertyEditor);
                imgui.MenuItem("Long text display", null, this.showAppLongText);
                imgui.MenuItem("Auto-resizing window", null, this.showAppAutoResize);
                imgui.MenuItem("Constrained-resizing window", null, this.showAppConstrainedResize);
                imgui.MenuItem("Simple overlay", null, this.showAppSimpleOverlay);
                imgui.MenuItem("Manipulating window titles", null, this.showAppWindowTitles);
                imgui.MenuItem("Custom rendering", null, this.showAppCustomRendering);
                imgui.MenuItem("Documents", null, this.showAppDocuments);
                imgui.EndMenu();
            }
            if (imgui.BeginMenu("Help"))
            {
                imgui.MenuItem("Metrics", null, this.showAppMetrics);
                imgui.MenuItem("Style Editor", null, this.showAppStyleEditor);
                imgui.MenuItem("About imgui-njs", null, this.showAppAbout);
                imgui.EndMenu();
            }
            imgui.EndMenuBar();
        }
        imgui.Spacing();
        if(imgui.CollapsingHeader("Help"))
        {
            imgui.Indent();
            imgui.Text("PROGRAMMER GUIDE:");
            imgui.BulletText("make sure this is the right approach for you");
            imgui.BulletText("make sure it scales well enough");
            imgui.Unindent();
        }
        if (imgui.CollapsingHeader("Configuration"))
        {
            const io = imgui.GetIO();
            if (imgui.TreeNode("Configuration##2"))
            {
                let setConfigFlags = function(flags) { io.ConfigFlags = flags; };
                imgui.CheckboxFlags("io.ConfigFlags: NavEnableKeyboard",
                            io.ConfigFlags, ConfigFlags.NavEnableKeyboard,
                            setConfigFlags);
                imgui.CheckboxFlags("io.ConfigFlags: NavEnableGamepad",
                            io.ConfigFlags, ConfigFlags.NavEnableGamepad,
                            setConfigFlags);
                imgui.Tooltip("Required back-end to feed in gamepad inputs in "+
                            "io.NavInputs[] and set io.BackendFlags |= BackendFlags.HasGamepad.\n\n"+
                            "Read instructions in imgui.cpp for details.");
                imgui.CheckboxFlags("io.ConfigFlags: NavEnableSetMousePos",
                            io.ConfigFlags,  ConfigFlags.NavEnableSetMousePos,
                            setConfigFlags);
                imgui.Tooltip("Instruct navigation to move the mouse cursor. "+
                            "See comment for ImGuiConfigFlags_NavEnableSetMousePos.");
                imgui.CheckboxFlags("io.ConfigFlags: NoMouse",
                            io.ConfigFlags, ConfigFlags.NoMouse,
                            setConfigFlags);
                if (io.ConfigFlags & ConfigFlags.NoMouse)
                {
                    // Create a way to restore this flag otherwise we could be
                    // stuck completely!
                    if ((imgui.GetTime() % 0.40) < 0.20)
                    {
                        imgui.SameLine();
                        imgui.Text("<<PRESS SPACE TO DISABLE>>");
                    }
                    if (imgui.IsKeyPressed(imgui.GetKeyIndex(Key.Space)))
                        io.ConfigFlags &= ~ConfigFlags.NoMouse;
                }
                imgui.CheckboxFlags("io.ConfigFlags: NoMouseCursorChange",
                        io.ConfigFlags, ConfigFlags.NoMouseCursorChange,
                        setConfigFlags);
                imgui.Tooltip("Instruct back-end to not alter mouse cursor shape and visibility.");
                imgui.Checkbox("io.ConfigInputTextCursorBlink",
                        io.ConfigInputTextCursorBlink,
                        (v) => io.ConfigInputTextCursorBlink = v);
                imgui.Tooltip("Set to false to disable blinking cursor, for users who consider it distracting");
                imgui.Checkbox("io.ConfigWindowsResizeFromEdges [beta]",
                        io.ConfigWindowsResizeFromEdges,
                        (v) => io.ConfigWindowsResizeFromEdges = v);
                imgui.Tooltip("Enable resizing of windows from their edges and from the lower-left corner.\nThis requires (io.BackendFlags & ImGuiBackendFlags_HasMouseCursors) because it needs mouse cursor feedback.");
                imgui.Checkbox("io.ConfigWindowsMoveFromTitleBarOnly",
                        io.ConfigWindowsMoveFromTitleBarOnly,
                        (v) => io.ConfigWindowsMoveFromTitleBarOnly = v);
                imgui.Checkbox("io.MouseDrawCursor",
                        io.MouseDrawCursor,
                        (v) => io.MouseDrawCursor = v);
                imgui.Tooltip("Instruct Dear ImGui to render a mouse cursor for you. Note that a mouse cursor rendered via your application GPU rendering path will feel more laggy than hardware cursor, but will be more in sync with your other visuals.\n\nSome desktop applications may use both kinds of cursors (e.g. enable software cursor only when resizing/dragging something).");
                imgui.TreePop();
                imgui.Separator();
            }
            if (imgui.TreeNode("Backend Flags"))
            {
                let backend_flags = io.BackendFlags; // Make a local copy to avoid modifying the back-end flags.
                imgui.CheckboxFlags("io.BackendFlags: HasGamepad",
                                    backend_flags, BackendFlags.HasGamepad,
                                    (v) => io.BackendFlags = v);
                imgui.CheckboxFlags("io.BackendFlags: HasMouseCursors",
                                    backend_flags, BackendFlags.HasMouseCursors,
                                    (v) => io.BackendFlags = v);
                imgui.CheckboxFlags("io.BackendFlags: HasSetMousePos",
                                    backend_flags, BackendFlags.HasSetMousePos,
                                    (v) => io.BackendFlags = v);
                imgui.TreePop();
                imgui.Separator();
            }
            if (imgui.TreeNode("Style"))
            {
                this.styleEditor.Show();
                imgui.TreePop();
                imgui.Separator();
            }
            if (imgui.TreeNode("Capture/Logging"))
            {
                imgui.TextWrapped("The logging API redirects all text output so you can easily "+
                    "capture the content of a window or a block. Tree nodes can be automatically expanded.");
                imgui.Tooltip("Try opening any of the contents below in this window and then click one of the \"Log To\" button.");
                imgui.LogButtons();
                imgui.TextWrapped("You can also call ImGui.LogText() to output directly to the log without a visual output.");
                if (imgui.Button("Copy \"Hello, world!\" to clipboard")) {
                    imgui.LogToClipboard();
                    imgui.LogText("Hello, world!");
                    imgui.LogFinish();
                }
                imgui.TreePop();
            }
        }
        if(imgui.CollapsingHeader("Window options"))
        {
            imgui.Checkbox("No titlebar", this.noTitleBar);
            imgui.SameLine(150);
            imgui.Checkbox("No scrollbar", this.noScrollBar);
            imgui.SameLine(300);
            imgui.Checkbox("No menu", this.noMenu);
            imgui.Checkbox("No move", this.noMove);
            imgui.SameLine(150);
            imgui.Checkbox("No resize", this.noResize);
            imgui.SameLine(300);
            imgui.Checkbox("No collapse", this.noCollapse);
            imgui.Checkbox("No close", this.noClose);
            imgui.SameLine(150);
            imgui.Checkbox("No nav", this.noNav);
            imgui.SameLine(300);
            imgui.Checkbox("No background", this.noBgd);
            imgui.Checkbox("No bring to front", this.noBringToFront);
        }

        this.demoWidgets.Show();
        this.demoLayout.Show();
        this.demoPopups.Show();
        this.demoColumns.Show();

        imgui.End();
        return done;
    }

    showAppWindows(imgui)
    {
        if(this.showAppDocuments.get())
            ;
        if(this.showAppMainMenuBar.get())
            ;
        if(this.showAppConsole.get())
            ;

        // not our job to show the log, just toggle it

        if(this.showAppLayout.get())
            DemoSimpleLayout(imgui, this.showAppLayout);
        if(this.showAppPropertyEditor.get())
            DemoPropertyEditor(imgui, this.showAppPropertyEditor);
        if(this.showAppLongText.get())
            ;
        if(this.showAppAutoResize.get())
            ;
        if(this.showAppConstrainedResize.get())
            ;
        if(this.showAppSimpleOverlay.get())
            this.showSimpleOverlay(this.showAppSimpleOverlay);

        if(this.showAppWindowTitles.get())
            ;
        if(this.showAppCustomRendering.get())
        {
            this.customRendering.Show(this.showAppCustomRendering);
        }
        if(this.showAppStyleEditor.get())
            ;
        if(this.showAppMetrics.get())
            ;
        if(this.showAppAbout.get())
           this.showAboutWindow();
    }

    getWinFlags()
    {
        let winflags = 0;
        if(this.noTitleBar.get())
            winflags |= WindowFlags.NoTitleBar;
        if(this.noScrollBar.get())
            winflags |= WindowFlags.NoScrollbar;
        if(!this.noMenu.get())
            winflags |= WindowFlags.MenuBar;
        if(this.noResize.get())
            winflags |= WindowFlags.NoResize;
        if(this.noCollapse.get())
            winflags |= WindowFlags.NoCollapse;
        if(this.noNav.get())
            winflags |= WindowFlags.NoNav;
        if(this.noBgd.get())
            winflags |= WindowFlags.NoBackground;
        if(this.noBringToFront.get())
            winflags |= WindowFlags.NoBringToFrontOnFocus;
        return winflags;
    }

    showAboutWindow()
    {
        let imgui = this.imgui;
        if (!imgui.Begin("About imgui-njs", this.showAppAbout,
                WindowFlags.AlwaysAutoResize |
                WindowFlags.NoCollapse))
        {
            imgui.End();
            return;
        }
        imgui.Text(imgui.GetVersion());
        imgui.Separator();
        imgui.Text("imgui-njs by Dana Batali, built atop:");
        imgui.Text("dear-imgui by Omar Cornut and all dear imgui contributors.");
        imgui.Text("Both are licensed under the MIT License.");
        imgui.End();
    }

    showSimpleOverlay(p_open)
    {
        const DISTANCE = 10;
        if(!this._corner)
            this._corner = 0;
        const imgui = this.imgui;
        const io = imgui.GetIO();
        if (this._corner != -1)
        {
            let window_pos = new Vec2(
                    (this._corner & 1) ? io.DisplaySize.x - DISTANCE : DISTANCE,
                    (this._corner & 2) ? io.DisplaySize.y - DISTANCE : DISTANCE);
            let window_pos_pivot = new Vec2(
                    (this._corner & 1) ? 1 : 0,
                    (this._corner & 2) ? 1 : 0);
            imgui.SetNextWindowPos(window_pos, CondFlags.Always, window_pos_pivot);
        }
        imgui.SetNextWindowBgAlpha(0.35);
        if (imgui.Begin("Example: Simple overlay", p_open,
            (this._corner != -1 ? WindowFlags.NoMove : 0) |
                WindowFlags.NoDecoration |
                WindowFlags.AlwaysAutoResize |
                WindowFlags.NoSavedSettings |
                WindowFlags.NoFocusOnAppearing |
                WindowFlags.NoNav))
        {
            imgui.Text("Simple overlay\n" +
                    "in the corner of the screen.\n" +
                    "(right-click to change position)");
            imgui.Separator();
            if (imgui.IsMousePosValid())
                imgui.Text("Mouse Position: (%.1f,%.1f)", io.MousePos.x, io.MousePos.y);
            else
                imgui.Text("Mouse Position: <invalid>");
            if (imgui.BeginPopupContextWindow())
            {
                if (imgui.MenuItem("Custom", null, this._corner == -1))
                    this._corner = -1;
                if (imgui.MenuItem("Top-left", null, this._corner == 0))
                    this._corner = 0;
                if (imgui.MenuItem("Top-right", null, this._corner == 1))
                    this._corner = 1;
                if (imgui.MenuItem("Bottom-left",  null, this._corner == 2))
                    this._corner = 2;
                if (imgui.MenuItem("Bottom-right", null, this._corner == 3))
                    this._corner = 3;
                if (p_open.get() && imgui.MenuItem("Close"))
                    p_open.set(false);
                imgui.EndPopup();
            }
        }
        imgui.End();
    }
}

export default DemoWindow;
