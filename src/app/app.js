import {ValRef, Vec2, MutableString} from "../types.js";
import {ConfigFlags} from "../flags.js";
import FileBrowser from "../panels/filebrowser.js";
import Log from "../panels/log.js";
import {Imgui} from "../imgui.js";
import {WindowFlags} from "../window.js";
import {Colors} from "../color.js";

import {Prefs} from "./prefs.js";
import {FileSystem} from "./filesystem.js";

// A base Application for generic imgui applications.  Clients
// can extend this class or roll their own.

export default class ImguiApp
{
    constructor(appname="UntitledImguiApp", version="1.0.0", initLog=true)
    {
        console.debug("App Init " + new Date().toLocaleString());
        this.appname = appname;
        this.version = version;
        this.prefs = new Prefs(this.appname);
        this.running = true;
        this.runtime = (window.process && window.process.type) ? "electron" 
                        : (window.cordova) ? "cordova" : "browser";
        this.filesystem = new FileSystem(this.runtime);
        this.canvas = document.getElementById("AppCanvas");
        if(!this.canvas)
        {
            alert("Can't find canvas element named AppCanvas");
            return;
        }
        this.imgui = null;
        this.FileBrowser = null;
        this.Log = null;

        // appServices protocol used by imgui, navigator.clipboard doesn't
        // work in the electron environment.
        this.platform = navigator.platform;
        this.clipboard = navigator.clipboard;

        window.App = this;
    }

    IsTouchScreen()
    {
        if(this.imgui)
            return this.imgui.guictx.IO.ConfigFlags & ConfigFlags.IsTouchScreen;
        else
            return this.IsMobileDevice();
    }

    OnLogActivity(msg, level)
    {
        // overridable
    }

    IsMobileDevice()
    {
        if((typeof window.orientation !== "undefined") || 
           (navigator.userAgent.indexOf("IEMobile") !== -1))
        {
            return true;
        }
        else
            return false;
        /*
        let a = window.navigator.userAgent.toLowerCase();
        return a.indexOf("android") != -1 ||
               a.indexOf("iphone") != -1 ||
               a.indexOf("ipad") != -1;
        */
    }    

    GetRuntime() // electron, cordova, browser
    {
        return this.runtime;
    }

    GetName()
    {
        return this.appname;
    }

    OpenFile(filename, options, cb)
    {
        // options can be either string or object
        //  { encoding: "utf8", etc }
        this.filesystem.readFile(filename, options, cb); // async
    }

    SaveFile(filename, data, options, cb)
    {
        this.filesystem.writeFile(filename, data, options, cb); // async
    }

    SetPref(name, value)
    {
        this.prefs.SetValue(name, value); // calls imgui.MarkIniSettingsDirty
    }

    GetPref(name, dflt)
    {
        return this.prefs.GetValue(name, dflt);
    }

    Begin(onReady) // onReady: cuz begin takes triggers async loading
    {
        if(!this.canvas) return;
        this.imgui = new Imgui(this.canvas, this.appname, this);
        this.prefs.Begin(this.imgui);
        this.imgui.guictx.SettingsHandlers.push(this.prefs);
        this.imgui.LoadIniSettingsFromDisk();
        this.Log = new Log(this);
        this.Log.Begin(this.imgui);
        this.FileBrowser = new FileBrowser(this.filesystem, this.prefs); // Begin below
        this.FileBrowser.Begin(this.imgui);

        console.debug(`${this.appname} Begin ${new Date().toLocaleString()}`);
        console.debug(`  version: ${this.version}`);
        console.debug(`  ${this.imgui.GetVersion()}`);
        onReady(0);
    }

    End() // done
    {
        this.imgui.EndFrame();
        if(this.runtime == "electron")
        {
            // used window.require to trick webpack
            const remote = window.require("electron").remote;
            remote.getCurrentWindow().close();
        }
    }

    OnLoop(time) // called e.g. 60 fps, subclass may override
    {
        if(!this.canvas) return;
        if(this.imgui.NewFrame(time))
        {
            this.ShowContextMenu(this.imgui);
            if(this.FileBrowser)
                this.FileBrowser.Show(this.imgui); // manages its own IsOpen state
            if(this.Log)
                this.Log.Show(this.imgui, "Log");
            this.OnFrame(this.imgui); // subclass hooks in here
            this.imgui.Render(); // calls EndFrame
        }
        else
            this.imgui.EndFrame();
        return this.running;
    }

    OnFrame(imgui)
    {
        // overridable method
    }

    OnLogActivity(lastMsg, lastLevel)
    {
        // overridable method
    }

    ShowContextMenu(imgui)
    {
        if(imgui.BeginPopupContextVoid("ContextMenu", 1))
        {
            if(this.Log)
            {
                if(imgui.MenuItem("Log", null, this.Log.IsShowing.get()))
                {
                    this.Log.IsShowing.toggle();
                }
            }

            this.AppendContextMenu(imgui);

            if(this.runtime === "electron")
            {
                if(imgui.MenuItem("Quit"))
                {
                    // before closing, need to check dirty state
                    this.running = false;
                }
            }
            imgui.EndPopup();
        }
    }

    AppendContextMenu(imgui)
    {
        // no-op, child-class can override
    }

    ShowModalDialog(cfg, cb)
    {
        // config.type: question, entry
        // config.buttons ["one", "two", "three"]
        // config.title
        // message: "txt"
        // icon: url
        // iconSize: Vec2
        let id = cfg.id ? cfg.id : "Modal?";
        if(this.imgui.BeginPopupModal(id, null, WindowFlags.AlwaysAutoResize))
        {
            if(cfg.icon)
            {
                let imgSz = cfg.iconSize ? cfg.iconSize : new Vec2(200, 100);
                this.imgui.Image(cfg.icon, imgSz, null, null, null, Colors.black);
                this.imgui.SameLine();
            }
            this.imgui.Text(cfg.msg);
            this.imgui.Separator();
            if(cfg.type == "entry")
            {
                if(!this.editText)
                    this.editText = new MutableString("");
                else
                    this.editText.Set("");

                this.imgui.TextEntry(this.editText);
            }
            for(let i=0;i<cfg.buttons.length;i++)
            {
                if(this.imgui.Button(cfg.buttons[i]))
                {
                    if(cb)
                    {
                        let extra = null;
                        if(cfg.type == "entry")
                            extra = this.editText.Get();
                        cb(i, extra);
                    }
                    this.imgui.CloseCurrentPopup();
                }
            }
            this.imgui.EndPopup();
        }
    }

    ShowOpenDialog(prompt, cb, extensions=[], closeOnSelect=true, zIndex=-1)
    {
        let mcb = function(err, path)
        {
            if(closeOnSelect)
                this.FileBrowser.IsOpen.set(false);
            cb(err, [path]);
        }.bind(this);
        this.FileBrowser.SetClient(prompt, mcb, "PickFile", extensions, true, zIndex);
    }

    ShowSaveDialog(prompt, cb, extensions=[], closeOnSelect=true, zIndex=-1)
    {
        let mcb = function(err, path)
        {
            if(closeOnSelect)
                this.FileBrowser.IsOpen.set(false);
            cb(err, path);
        }.bind(this);
        this.FileBrowser.SetClient(prompt, mcb, "SaveFile", extensions, true, zIndex);
    }
}

