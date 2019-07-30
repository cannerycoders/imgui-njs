import {ValRef, Vec2, MutableString} from "/js/imgui-njs/src/types.js";
import FileBrowser from "/js/imgui-njs/src/panels/filebrowser.js";
import Log from "/js/imgui-njs/src/panels/log.js";
import {Imgui} from "/js/imgui-njs/src/imgui.js";
import {WindowFlags} from "/js/imgui-njs/src/window.js";
import {Colors} from "/js/imgui-njs/src/color.js";

import {Prefs} from "./prefs.js";
import {FileSystem} from "./filesystem.js";

// A base Application for generic imgui applications.  Clients
// can extend this class or roll their own.

export default class ImguiApp
{
    constructor(appname="UntitledImguiApp", version="1.0.0")
    {
        console.info("App Init " + new Date().toLocaleString());
        this.appname = appname;
        this.version = version;
        this.prefs = new Prefs(this.appname);
        this.running = true;
        this.runtime = (window.process && window.process.type)
                            ? "electron" : "browser";
        this.filesystem = new FileSystem(this.runtime);
        this.fs = this.filesystem.fs;
        this.path = this.filesystem.path;
        this.canvas = document.getElementById("AppCanvas");
        if(!this.canvas)
        {
            alert("Can't find canvas element named AppCanvas");
            return;
        }
        this.imgui = new Imgui(this.canvas, this.appname);
        this.FileBrowser = new FileBrowser(this.filesystem, this.prefs); // Begin below
        this.Log = new Log(this.imgui);
        this.showLog = new ValRef(false);
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
        this.prefs.SetValue(name, value);
        this.imgui.MarkIniSettingsDirty();
    }

    GetPref(name, dflt)
    {
        return this.prefs.GetValue(name, dflt);
    }

    Begin(onReady) // onReady: cuz begin takes triggers async loading
    {
        if(!this.canvas) return;
        this.imgui = new Imgui(this.canvas, this.appname);
        console.info(`${this.appname} Begin ${new Date().toLocaleString()}`);
        console.info(`  version: ${this.version}`);
        console.info(`  ${this.imgui.GetVersion()}`);
        this.imgui.guictx.SettingsHandlers.push(this.prefs);
        this.imgui.LoadIniSettingsFromDisk();
        this.FileBrowser.Begin(this.imgui);
        onReady(0);
    }

    End() // done
    {
        this.imgui.EndFrame();
        if(this.runtime == "electron")
        {
            const remote = require("electron").remote;
            remote.getCurrentWindow().close();
        }
    }

    OnLoop(time)
    {
        if(!this.canvas) return;
        this.imgui.NewFrame(time);
        this.ShowContextMenu(this.imgui);
        this.FileBrowser.Show(this.imgui); // manages its own IsOpen state
        this.Log.Show(this.imgui, "Log", this.showLog);
        this.OnFrame(this.imgui); //
        this.imgui.Render();
        return this.running;
    }

    OnFrame(imgui)
    {
        // overridable method
    }

    ShowContextMenu(imgui)
    {
        if(imgui.BeginPopupContextVoid("ContextMenu", 1))
        {
            if(imgui.MenuItem("Log", null, this.showLog.get()))
                this.showLog.toggle();

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

