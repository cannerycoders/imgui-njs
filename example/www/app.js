import {Vec2, ValRef, MutableString} from "/js/imgui-njs/types.js";
import FileBrowser from "/js/imgui-njs/panels/filebrowser.js";
import {Imgui} from "/js/imgui-njs//imgui.js";
import {WindowFlags} from "/js/imgui-njs/window.js";
import {Colors} from "/js/imgui-njs/color.js";
import Log from "/js/imgui-njs/panels/log.js";
import ImguiDemo from "/js/imgui-njs/panels/demo.js";

export var AppName = "Simple App";

class Application
{
    constructor()
    {
        console.info("App Init " + new Date().toLocaleString());
        this.appname = AppName;
        this.running = true;
        this.runtime = (window.process && window.process.type)
                            ? "electron" : "browser";
        this.version = "0.0.0";
        this.log = null;
        this.demo = null;
        this.canvas = document.getElementById("AppCanvas");
        if(!this.canvas)
        {
            alert("Can't find canvas element named AppCanvas");
            return;
        }
        console.debug("App constructor");
        window.App = this;
    }

    GetName()
    {
        return this.appname;
    }

    Begin(onReady) // onReady: cuz begin may trigger async loading
    {
        if(!this.canvas) return;
        this.imgui = new Imgui(this.canvas, this.appname);

        this.log = new Log(this.imgui);
        this.demo = new ImguiDemo(this.imgui);

        console.info(this.appname + " begin " + new Date().toLocaleString());
        console.info(`  version: ${this.version}`);
        console.info(`  ${this.imgui.GetVersion()}`);

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
        this.log.Show(this.imgui);
        this.demo.Show(this.imgui);
        this.imgui.Render();
        return this.running;
    }

}

export var App = new Application();
