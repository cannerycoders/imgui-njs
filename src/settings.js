import {WindowFlags} from "./window.js";
import {Vec2} from "./types.js";
import {GetHash} from "./hashutil.js";

// initially our settings will be stored in a single json string
// of the form:
//  {
//      "Type1": {
//          "Entity1": {encapsulation},
//          "Entity2": {encapsulation}
//       },
//      "Type2": {
//          "Entity1": {encapsulation},
//          "Entity2": {encapsulation}
//       }
//  }

// We expect a subclass of SettingsHandler for each serializable datatype.
// The SettingsHandler manager reads/writes the single json file.
export class SettingsHandler
{
    constructor() {}
    GetTypeName() {console.assert(0);}
    // return an object appropriate for JSON.stringify
    Encapsulate(imgui) {console.assert(0);}
    // obj is a parsed json obj
    Instantiate(imgui, obj) {console.assert(0);}
}

class WindowSettings
{
    constructor(o)
    {
        this.Name = null;
        this.ID = 0;
        this.Pos = new Vec2();
        this.Size = new Vec2();
        this.Collapsed = false;
    }

    Encapsulate()
    {
        return this;
    }

    Instantiate(o)
    {
        this.Name = o.Name;
        this.ID = o.ID;
        this.Pos.x = o.Pos.x;
        this.Pos.y = o.Pos.y;
        this.Size.x = o.Size.x;
        this.Size.y = o.Size.y;
        this.Collapsed = o.Collapsed;
    }
}

export class WindowsSettingsHandler extends SettingsHandler
{
    constructor()
    {
        super();
    }
    GetTypeName() { return "Windows"; }
    Encapsulate(imgui) // we read from the real windows list
    {
        let g = imgui.guictx;
        let o = {};
        for(let win of g.Windows)
        {
            if(win.Flags & WindowFlags.NoSavedSettings)
                continue;
            let settings = (win.SettingsIdx != -1) ?
                            g.SettingsWindows[win.SettingsIdx] :
                            imgui.findWindowSettings(win.ID);
            if (!settings)
            {
                settings = imgui.createNewWindowSettings(win.Name);
                win.SettingsIdx = g.SettingsWindows.indexOf(settings);
            }
            console.assert(settings.ID == win.ID);
            settings.Pos.Copy(win.Pos);
            settings.Size.Copy(win.SizeFull);
            settings.Collapsed = win.Collapsed;
            o[win.Name] = settings.Encapsulate();
        }
        return o;
    }
    Instantiate(imgui, strOrObj)
    {
        let g = imgui.guictx;
        try
        {
            let o = typeof(strOrObj) == "string" ? JSON.parse(strOrObj) : strOrObj;
            let extra = [];
            for(let key in o)
            {
                let ws = null;
                for(let w of g.SettingsWindows)
                {
                    if(key == w.Name)
                    {
                        ws = w;
                        break;
                    }
                }
                if (ws == null)
                {
                    ws = new WindowSettings();
                    extra.push(ws);
                }
                ws.Instantiate(o[key]);
            }
            for(let el of extra)
                g.SettingsWindows.push(el);
        }
        catch(err)
        {
            console.error("JSON parse error: " + err);
        }
    }
}

export var ImguiSettingsMixin =
{
    // - The disk functions are automatically called if io.IniFilename != NULL
    //   (default is "imgui.ini").
    // - Set io.IniFilename to NULL to load/save manually. Read
    //  io.WantSaveIniSettings description about handling .ini saving manually.

    // call after CreateContext() and before the first call to NewFrame().
    // NewFrame() automatically calls LoadIniSettingsFromDisk(io.IniFilename).
    LoadIniSettingsFromDisk(ini_filename=null)
    {
        if(ini_filename == null)
            ini_filename = this.guictx.IO.IniFilename;
        // for now, we'll use localStorage:
        let d = window.localStorage.getItem(ini_filename);
        if(d)
           this.LoadIniSettingsFromMemory(d);
    },

    // this is automatically called (if io.IniFilename is not empty) a few
    // seconds after any modification that should be reflected in the .ini
    // file (and also by DestroyContext).
    SaveIniSettingsToDisk(ini_filename)
    {
        let g = this.guictx;
        g.SettingsDirtyTimer = 0;
        if (!ini_filename)
            return;
        let value = this.SaveIniSettingsToMemory();
        if(value)
            window.localStorage.setItem(ini_filename, value);
    },


    // call after CreateContext() and before the first call to NewFrame() to
    // provide .ini data from your own data source.
    LoadIniSettingsFromMemory(json)
    {
        try
        {
            let o = JSON.parse(json);
            for(let key in o)
            {
                let h = this.FindSettingsHandler(key);
                if(h)
                    h.Instantiate(this, o[key]);
            }
            this.guictx.SettingsLoaded = true;
        }
        catch(err)
        {
            console.error("Problem parsing settings", err);
        }
    },

    // return a zero-terminated string with the .ini data which you can
    // save by your own means. call when io.WantSaveIniSettings is set,
    // then save data by your own mean and clear io.WantSaveIniSettings.
    SaveIniSettingsToMemory(pretty=false)
    {
        let g = this.guictx;
        g.SettingsDirtyTimer = 0.;
        let o = {};
        for(let handler_n = 0; handler_n < g.SettingsHandlers.length; handler_n++)
        {
            let handler = g.SettingsHandlers[handler_n];
            let typename = handler.GetTypeName();
            o[typename] = handler.Encapsulate(this);
        }
        if(pretty)
            g.SettingsIniData = JSON.stringify(o, null, 2);
        else
            g.SettingsIniData = JSON.stringify(o);
        return g.SettingsIniData;
    },

    MarkIniSettingsDirty(win=null)
    {
        if(win && win.Flags & WindowFlags.NoSavedSettings)
            return;
        let g = this.guictx;
        if (g.SettingsDirtyTimer <= 0)
            g.SettingsDirtyTimer = g.IO.IniSavingRate;
    },

    createNewWindowSettings(name)
    {
        let g = this.guictx;
        g.SettingsWindows.push_back(new WindowSettings());
        let wSetting = g.SettingsWindows.back();
        wSetting.Name = name;
        wSetting.ID = GetHash(name);
        return wSetting;
    },

    findWindowSettings(id)
    {
        let g = this.guictx;
        for (let i = 0; i != g.SettingsWindows.length; i++)
        {
            if (g.SettingsWindows[i].ID == id)
                return g.SettingsWindows[i];
        }
        return null;
    },

    findOrCreateWindowSettings(name)
    {
        let settings = this.findWindowSettings(GetHash(name));
        if (settings)
            return settings;
        return this.createNewWindowSettings(name);
    },

    FindSettingsHandler(type_name)
    {
        let g = this.guictx;
        for(let i=0;i<g.SettingsHandlers.length;i++)
        {
            let h = g.SettingsHandlers[i];
            if(h.GetTypeName() === type_name)
                return h;
        }
        return null;
    },
};
