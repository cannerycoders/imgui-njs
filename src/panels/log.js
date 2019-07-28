import {ValRef, Vec2} from "../types.js";
import {TextFilter} from "../widgets/text.js";
import {WindowFlags} from "../window.js";
import {CondFlags} from "../flags.js";

var Singleton = null;

export function GetLog()
{
    return Singleton;
}

export class LogWindow
{
    constructor()
    {
        this.entries = [];
        this.scrollToBottom = true;
        this.filter = null;
        this.lastError = "";
        this.lastErrorLevel = null;
        this.console = {
            debug: console.debug,
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
        };
        if(!Singleton)
        {
            Singleton = this;
            this.bindConsole(true);
        }
        console.debug("Starting Log");
    }

    bindConsole(override)
    {
        if(override)
        {
            console.debug = this.Debug.bind(this);
            console.info = this.Info.bind(this);
            console.log = this.Notice.bind(this);
            console.warn = this.Warning.bind(this);
            console.error = this.Error.bind(this);
        }
        else
        {
            console.debug = this.console.debug;
            console.info = this.console.info;
            console.log = this.console.log;
            console.warn = this.console.warn;
            console.error = this.console.error;
        }
    }

    Debug(msg, ...args)
    {
        // this.log(msg, "DEBUG", args);
        // send debug message to real console
        this.console.log("DEBUG " + msg + args.join(" "));
    }

    Info(msg, ...args)
    {
        this.log(msg, "INFO", args);
    }

    Notice(msg, ...args)
    {
        this.log(msg, "NOTICE", args);
    }

    Warning(msg, ...args)
    {
        this.log(msg, "WARNING", args);
    }

    Error(msg, ...args)
    {
        this.log(msg, "ERROR", args);
    }

    GetLastError()
    {
        return this.lastError;
    }

    GetLastErrorLevel()
    {
        return this.lastErrorLevel;
    }

    log(msg, level="INFO", args)
    {
        if(msg.message)
            msg = msg.message;
        if(args && args.length > 0)
        {
            msg += ", ";
            msg += args.join(", ");
        }
        if(level == "WARNING")
            this.lastErrorLevel = level;
        else
        if(level == "ERROR")
        {
            this.lastErrorLevel = level;
            this.lastError = msg.slice(0, 35) + "...";
        }
        this.entries.push({m: msg, l: level, ts: Date.now()});
        this.dirty = true;
    }

    Clear()
    {
        this.entries = [];
    }

    Show(imgui, winname="Log", isOpen=null)
    {
        if(isOpen != null && !isOpen.get()) return;

        if(!this.filter)
            this.filter = new TextFilter(imgui);
        imgui.SetNextWindowPos(new Vec2(10, 10), CondFlags.FirstUseEver);
        imgui.SetNextWindowSize(new Vec2(580, 200), CondFlags.FirstUseEver);
        let title = `Log ${this.lastError}##${winname}`;
        let open = imgui.Begin(title, isOpen);
        if(!imgui.IsWindowCollapsed())
        {
            this.lastError = "";
            this.lastErrorLevel = null;
        }
        if(open)
        {
            this.lastError = "";
            if (imgui.Button("Clear"))
                this.Clear();
            imgui.SameLine();
            let copy = false;
            //    bool copy = imgui.Button("Copy");
            //    imgui.SameLine();
            this.filter.Draw("Filter", 100);
            imgui.Separator();
            imgui.BeginChild("scrolling", new Vec2(0,0), false,
                                WindowFlags.HorizontalScrollbar);
            if (copy)
                imgui.LogToClipboard();

            if(this.entries.length)
            {
                imgui.PushFont("monospace");
                for(let i = 0; i < this.entries.length; i++)
                {
                    let entry = this.entries[i];
                    let msg = entry.m != undefined ? entry.m : entry;
                    let lev = entry.l != undefined ? entry.l : "INFO";
                    if(!(this.filter.PassFilter(msg) ||
                         this.filter.PassFilter(lev)))
                    {
                        continue;
                    }

                    let c = imgui.guictx.Style.GetColor(entry.l);
                    if(c)
                        imgui.PushStyleColor("Text",  c);
                    imgui.Text(this.formatEntryHead(entry));
                    if(c)
                        imgui.PopStyleColor();
                    imgui.SameLine();
                    imgui.Text(". %s", msg);
                }
                imgui.PopFont();
            }
            if (this.dirty)
            {
                imgui.SetScrollHereY(1.);
                this.dirty = false;
            }
            imgui.EndChild();
        }
        imgui.End();
    }

    formatEntryHead(entry)
    {
        let d = new Date(entry.ts);
        let h = ("0" + d.getHours()).slice(-2);
        let m = ("0" + d.getMinutes()).slice(-2);
        return (entry.l+"     ").slice(0, 8) +
                    `${h}:${m}`;
    }
}

export default LogWindow;
