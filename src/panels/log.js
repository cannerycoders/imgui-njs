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

// Our log should work with either fixed or variable-width fonts.
// we select short lower-case since color is emphasis
const sLevelShorten = 
{
    "ERROR": "err",
    "WARNING": "warn",
    "NOTICE": "note",
    "INFO": "info",
    "DEBUG": "dbg",
};

export class LogWindow
{
    constructor(app)
    {
        this.app = app;
        this.IsShowing = new ValRef(false);

        this.entries = [];
        this.scrollToBottom = true;
        this.filter = null;
        this.lastError = "";
        this.lastErrorLevel = null;
        this.lastMsg = "";
        this.lastMsgLevel = "";
        this.console = {
            debug: console.debug,
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            alert: window.alert
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
            window.alert = this.Alert.bind(this);
        }
        else
        {
            console.debug = this.console.debug;
            console.info = this.console.info;
            console.log = this.console.log;
            console.warn = this.console.warn;
            console.error = this.console.error;
            window.alert = this.console.alert;
        }
    }

    Debug(msg, ...args)
    {
        // send debug message to real console
        let d = new Date();
        let h = ("0" + d.getHours()).slice(-2);
        let m = ("0" + d.getMinutes()).slice(-2);
        this.console.log(`${h}:${m} DEBUG ` + msg + args.join(" "));
        // was: this.log(msg, "DEBUG", args);
    }

    Info(msg, ...args)
    {
        this.log(msg, "INFO", args); // nb: levels are styles, see sLevelShorten
    }

    Notice(msg, ...args)
    {
        this.log(msg, "NOTICE", args);// nb: levels are styles, see sLevelShorten
    }

    Warning(msg, ...args)
    {
        this.log(msg, "WARNING", args);
    }

    Error(msg, ...args)
    {
        this.log(msg, "ERROR", args);
    }

    Alert(msg, ...args)
    {
        var x = document.getElementById("Alert");
        if(x)
        {
            x.className = "show";
            x.innerHTML = `<span>${msg}${args}</span>`;
            setTimeout(() => 
            { 
                x.className = ""; 
                x.innerHTML = "";
            }, 3000);
        }
        else
            this.log(msg, "ALERT", args);
    }

    GetLastMsg(maxLength=0)
    {
        if(maxLength == 0)
            return this.lastMsg;
        else
            return this.lastMsg.slice(0, maxLength);
    }

    GetLastMsgColor(imgui)
    {
        let lev = this.lastMsgLevel;
        if(lev)
            return imgui.guictx.Style.GetColor(lev);
        else
            return imgui.guictx.Style.GetColor("TextDisabled");
    }

    GetLastMsgLevel()
    {
        return this.lastMsgLevel;
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
        if(typeof(msg) == "object")
            msg = JSON.stringify(msg);
        if(args && args.length > 0)
        {
            msg += ", ";
            msg += args.join(", ");
        }
        this.lastMsg = msg;
        this.lastMsgLevel = level;
        if(level == "WARNING" || level == "ERROR" || level == "ALERT")
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
        this.app.OnLogActivity(this.lastMsg, this.lastMsgLevel);
    }

    Clear(doClose=true)
    {
        this.entries = [];
        this.lastMsg = "";
        this.lastError = "";
        this.lastMsgLevel = "";
        if(doClose)
            this.IsShowing.set(false);
        this.app.OnLogActivity(this.lastMsg, this.lastMsgLevel);
    }

    FilterEntries(filter)
    {
        this.entries = this.entries.filter(filter); 
    }

    Raise()
    {
        this.IsShowing.set(true);
        this.raiseRequested = true;
        this.lastMsg = "";
        this.lastMsgLevel = "";
    }

    Begin(imgui)
    {}

    Show(imgui, winname="Log")
    {
        if(!this.IsShowing.get()) return;

        if(!this.filter)
            this.filter = new TextFilter(imgui);
        if(this.app.IsMobileDevice())
        {
            imgui.SetNextWindowPos(new Vec2(0,0));
            imgui.SetNextWindowSize(imgui.guictx.IO.DisplaySize);
        }
        else
        {
            imgui.SetNextWindowPos(new Vec2(10, 10), CondFlags.FirstUseEver);
            imgui.SetNextWindowSize(new Vec2(580, 200), CondFlags.FirstUseEver);
        }
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
            let toClipboard = null;
            this.lastError = "";
            if (imgui.Button("Clear"))
                this.Clear();
            imgui.SameLine();
            if (imgui.Button("Copy"))
                toClipboard = [];
            imgui.SameLine();
            this.filter.Draw("Filter", 100);
            imgui.Separator();
            imgui.BeginChild("scrolling", new Vec2(0,0), false,
                                WindowFlags.HorizontalScrollbar);
            if(this.entries.length)
            {
                let font = imgui.PushFont("Small");
                let offset = font.MeasureWidth("MMMMMMM");
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
                    let head = this.formatEntryHead(entry);
                    imgui.Text(head);
                    if(c)
                        imgui.PopStyleColor();
                    imgui.SameLine(offset);
                    imgui.Text(msg);
                    if(toClipboard)
                        toClipboard.push(`${head} . ${msg}`);
                }
                imgui.PopFont();
                if(toClipboard)
                    imgui.SetClipboardText(toClipboard.join("\n"));
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

    GetLevelColor(imgui, lev)
    {
        let c;
        if(imgui)
        {
            if(lev == "")
                c = "#222";
            else
            {
                let imc = imgui.guictx.Style.GetColor(lev);
                c = imc.AsStr();
            }
        }
        else
        {
            c = {
                "": "#222",
                "INFO": "#448",
                "NOTICE": "#24a",
                "WARNING": "#942",
                "ERROR": "#a42",
            }[lev];
        }
        return c;
    }

    formatEntryHead(entry)
    {
        let d = new Date(entry.ts);
        let h = ("0" + d.getHours()).slice(-2);
        let m = ("0" + d.getMinutes()).slice(-2);
        let l = sLevelShorten[entry.l];
        return `${h}:${m} ${l}`;
    }
}

export default LogWindow;
