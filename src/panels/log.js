import {ValRef, Vec2} from "../types.js";
import {TextFilter} from "../widgets/text.js";
import {WindowFlags} from "../window.js";
import {CondFlags} from "../flags.js";

var Singleton = null;

export function GetLog()
{
    return Singleton;
}

const MaxEntries = 2000;
const EntryCullSize = 100;

export class LogWindow
{
    constructor()
    {
        this.IsShowing = new ValRef(false);

        this.entries = [];
        this.scrollToBottom = true;
        this.filter = null;
        this.lastError = "";
        this.lastErrorLevel = null;
        this.lastMsg = "";
        this.lastMsgLevel = null;
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

    GetLastMsg(maxLength=24)
    {
        if(maxLength == 0)
            return this.lastMsg;
        else
            return this.lastMsg.slice(0, maxLength);
    }

    GetLastMsgColor(imgui)
    {
        let lev = this.lastMsgLevel;
        if(!lev) lev = "DEBUG";
        return imgui.guictx.Style.GetColor(lev);
    }

    GetLastError(maxLength=24)
    {
        if(maxLength == 0)
            return this.lastError;
        else
            return this.lastError.slice(0, maxLength);
    }

    GetLastErrorLevel()
    {
        return this.lastErrorLevel;
    }

    GetLastErrorColor(imgui)
    {
        let lev = this.lastErrorLevel;
        if(!lev) lev = "DEBUG";
        return imgui.guictx.Style.GetColor(lev);
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
        this.lastMsg = msg;
        this.lastMsgLevel = level;
        if(level == "WARNING" || level == "ERROR")
        {
            this.lastErrorLevel = level;
            this.lastError = msg; 
        }
        let now = Date.now();
        this.entries.push({m: msg, l: level, ts: now});
        if(this.entries.length > MaxEntries)
        {
            this.entries = this.entries.slice(EntryCullSize);
            this.entries.push({m: "log culled", l: "INFO",  ts: now});
        }

        this.dirty = true;
    }

    Clear()
    {
        this.entries = [];
        this.lastMsg = "";
        this.lastError = "";
    }

    Raise()
    {
        this.IsShowing.set(true);
        this.raiseRequested = true;
    }

    Show(imgui, winname="Log")
    {
        if(!this.IsShowing.get()) return;

        if(!this.filter)
            this.filter = new TextFilter(imgui);
        imgui.SetNextWindowPos(new Vec2(10, 10), CondFlags.FirstUseEver);
        imgui.SetNextWindowSize(new Vec2(580, 200), CondFlags.FirstUseEver);
        if(this.raiseRequested)
        {
            imgui.SetNextWindowCollapsed(false, CondFlags.Always);
            imgui.SetNextWindowFocus();
            this.raiseRequested = false;
        }
        let title = `Log ${this.lastError}##${winname}`;
        let open = imgui.Begin(title, this.IsShowing);
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
