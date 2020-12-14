import {ValRef, Vec2, MutableString} from "../types.js";
import {WindowFlags} from "../window.js";
import {InputTextFlags} from "../widgets/inputtext.js";
import {TextFilter} from  "../widgets/text.js";
import {CondFlags, ItemFlags} from "../flags.js";
import {SelectableFlags} from "../widgets/selectable.js";

export var FileBrowserMode =
{
    PickFile: 0,
    PickDir: 1,
    SaveFile: 2,
    ViewOnly: 3
};

const ClientModes = Object.keys(FileBrowserMode);
const RecentDirs = "FileBrowser/RecentDirs"; // first in list is last sel
const DefaultIcons =
{
    RecentDirs: String.fromCodePoint(0xe88a), // material icons history
    Filter: String.fromCodePoint(0xe152), // material icons filter_list

    Clock: String.fromCodePoint(0x1f551), // https://graphemica.com/
};

export var TheFileBrowser = null;

export class FileBrowser
{
    // filesys is an object that implements a subset of nodejs/fs&path
    // entrypoints. It exposes path entrypoints vis filesys.path
    //
    // prefs is an optional object with methods GetValue and SetValue
    // implementation expected to persist values of type string and
    // string array
    constructor(filesys, prefs=null, icons=DefaultIcons)
    {
        if(!TheFileBrowser) TheFileBrowser = this;
        this.IsOpen = new ValRef(false);
        this.filesys = filesys;
        this.path = filesys.path;
        this.opMode = FileBrowserMode.ViewOnly;
        this.selection = "";
        this.selectionIndex = -1;
        this.selectionIndexMax = -1;
        this.clientCB = null;
        this.clientPrompt = "Select file(s)";
        this.cwd = null;
        this.cwdList = null;
        this.cwdSubdirs = null;
        this.cwdFiles = null;
        this.filter = null;
        this.nameEntry = new MutableString();
        this.mkdirEntry = new MutableString();
        this.minSize = new Vec2(200, 200);
        this.prefs = prefs;
        this.icons = icons;
        this.zIndex = -1;
        this.recentDirs = []; // whether or not we have prefs support
        this.imgui = null;
    }

    InstallFilesys(filesys)
    {
        this.filesys = filesys;
    }

    Begin(imgui)
    {
        this.imgui = imgui;
    }

    End()
    {
    }

    GetDir()
    {
        return this.cwd;
    }

    SetDir(dir) // Async
    {
        let ndir = dir.replace(/\\/g, "/"); // backslashes begone!
        let driveSpec = ndir.indexOf(":");
        if(driveSpec != -1)
        {
            // "//C:/foo/bar" | "/C:/foo/bar" -> "C:/foo/bar"
            ndir = ndir.slice(driveSpec-1);
        }
        // console.log(`SetDir ${dir} -> ${ndir}`);
        this.cwd = ndir;
        this.cwdFiles = [];
        this.cwdSubdirs = [];
        this.cwdErrEntries = [];
        this.selection = "";
        this.selectionIndex = 0;
        this.selectionType = ""; // only valid if selection is non-empty
        if(this.filter)
            this.filter.Clear();
        if(this.cwd == "/")
        {
            this.cwdList = ["/"];
            this.filesys.listVolumes(this.readDirCB.bind(this));
        }
        else
        {
            this.cwdList = this.cwd.split("/");
            if(this.cwdList[0] == "") // path started with "/"
                this.cwdList[0] = "/";
            else
                this.cwdList.unshift("/"); // insert front
            if(this.cwdList[this.cwdList.length-1] == "") // path ended with '/'
                this.cwdList.pop();
            this.cwdSubdirs.push("..");
            let opts = {withFileTypes: true};
            // D: -> D:/ to prevent confusion over per-drive cwd
            this.filesys.readdir(this.cwd+"/", opts, this.readDirCB.bind(this));
        }
    }

    // In order to support multi and single-select,
    // client is expected to manually close via IsOpen.set(false)
    SetClient(prompt, cb, mode, ext, doopen=true, zIndex=-1)
    {
        if(typeof(mode) == "string")
            mode = ClientModes.indexOf(mode);
        this.opMode = mode;
        this.clientCB = cb;
        this.clientPrompt = prompt ? prompt : "View files(s)";
        this.clientExtensions = ext;
        this.zIndex = zIndex;
        if(doopen)
        {
            this.IsOpen.set(true);
            // need to refresh here in case file system has changed
            if(this.cwd)
                this.SetDir(this.cwd);
        }
    }

    GetSelection(asRelative=true)
    {
        let str = (this.opMode == FileBrowserMode.SaveFile) ?
                        this.nameEntry.toString() : this.selection;
        if(asRelative)
            return str;
        else
            return this.path.join(this.cwd, str).replace(/\\/g, "/"); // backslashes begone!
    }

    Show(imgui)
    {
        const topButtons = true;
        if(!this.IsOpen.get())
        {
            this.clientCB = null; // safety for close-button cancelation
            return;
        }

        if(!this.filter)
            this.filter = new TextFilter(imgui);
        const fontSize = imgui.GetFontSize();

        imgui.SetNextWindowPos(new Vec2(10, 10), CondFlags.FirstUseEver);
        imgui.SetNextWindowSize(new Vec2(400, 300), CondFlags.FirstUseEver); // XXX: add clientPrompt
        if(this.zIndex != -1)
            imgui.SetNextWindowZIndex(this.zIndex);

        let title = this.clientPrompt + "##File Browser";
        if (!imgui.Begin(title, this.IsOpen, WindowFlags.NoCollapse
             /* |WindowFlags.AlwaysAutoResize*/))
        {
            imgui.End();
            return;
        }

        let recentDirs = this.prefs ? this.prefs.GetValue(RecentDirs, []) : this.recentDirs;
        if(this.cwd == null)
        {
            let firstDir;
            if(recentDirs.length)
                firstDir = recentDirs[0];
            else
                firstDir = "/";
            this.SetDir(firstDir); // async...
            imgui.End();
            return;
        }

        // Recent locations
        const pnm = "RecentDirMenu";
        if(imgui.SmallButton(this.icons.Clock)) // IconButtonAlt("Recent", this.icons.RecentDirs))
            imgui.OpenPopup(pnm);
        if(imgui.BeginPopup(pnm))
        {
            for(let d of recentDirs)
            {
                if(imgui.MenuItem(d, false))
                    this.SetDir(d);
            }
            imgui.EndPopup();
        }
        imgui.SameLine();

        // show current path as buttons
        let lastX2 = 0;
        let winMax = imgui.GetWindowPos().x +
                     imgui.GetWindowContentRegionMax().x;
        if(this.cwdList.length == 0)
        {
            if(imgui.SmallButton("/")) // windows root dir
                this.SetDir("/"); // Async
        }
        else
        for (let i=0; i<this.cwdList.length; i++)
        {
            if(i > 0 && (winMax-lastX2) > 50)
                imgui.SameLine();
            if (imgui.SmallButton(this.cwdList[i]))
            {
                // button was clicked, so we need to rescan
                let subset = this.cwdList.slice(0, i+1);
                let newpath = subset.join("/"); // ["/", "C:"] -> "//C:"
                if(newpath.indexOf("//") == 0)
                    newpath = newpath.slice(1);
                this.SetDir(newpath); // Async
            }
            lastX2 = imgui.GetItemRectMax().x;
        }

        // new line
        imgui.Text("Filter");
        imgui.SameLine();
        this.filter.Draw("", 5*fontSize);
        if(topButtons)
        {
            imgui.SameLine();
            this.showButtons(imgui, fontSize);
        }

        if(this.checkShortcuts(imgui, "header"))
        {
            // eg: escape key always closes
            this.doClose();
            imgui.End();
            return;
        }

        imgui.Separator();

        let xsize = imgui.GetWindowContentRegionMax().x;
        let ysize = imgui.GetWindowContentRegionMax().y - imgui.GetCursorPosY();
        if(!topButtons)
            ysize -= (imgui.GetFrameHeight() - 10);
        imgui.BeginChild("##FileDialog_FileList", new Vec2(xsize, ysize));
        if(this.checkShortcuts(imgui, "filelist"))
        {
            // eg: escape key always closes
            imgui.EndChild();
            this.doClose();
            imgui.End();
            return;
        }

        // first list dirs (selection is navigation) ---------------------
        imgui.PushStyleColor("Text", imgui.GetStyleColor("FBDir"));
        for (let i=0;i<this.cwdSubdirs.length;i++)
        {
            let p = this.cwdSubdirs[i];
            if(this.filter.IsActive() && !this.filter.PassFilter(p))
                continue;
            if(p == ".") continue; // may not happen
            if (imgui.Selectable(p+"/", p == this.selection,
                SelectableFlags.AllowDoubleClick))
            {
                this.selection = p;
                this.selectionIndex = i;
                this.updateSelection();
                if(imgui.IsMouseDoubleClicked([0]) ||
                    this.opMode != FileBrowserMode.OpenDir)
                {
                    this.performAction();
                }
            }
        }
        imgui.PopStyleColor();
        if (this.opMode == FileBrowserMode.SaveFile && this.cwd != "/")
        {
            let id = "Create Folder";
            imgui.PushStyleColor("Text", imgui.GetStyleColor("FBMkDir"));
            if(imgui.Selectable("New folder...", false))
            {
                imgui.OpenPopup(id);
                this.selectionType == "newfolder";
                this.mkdirEntry.Set("");
            }
            imgui.PopStyleColor();
            if(imgui.BeginPopup(id))
            {
                imgui.Text("New Folder:"); imgui.SameLine();
                if(imgui.InputText("##newfolder", this.mkdirEntry,
                    InputTextFlags.EnterReturnsTrue))
                {
                    let dir = this.path.join(this.cwd, this.mkdirEntry.toString());
                    console.info("creating " + this.mkdirEntry.toString());
                    this.filesys.mkdir(dir, {recursive: true}, (err)=>
                    {
                        if(err)
                        {
                            console.error(err);
                            return;
                        }
                        this.mkdirEntry.Set("");
                        imgui.FocusWindow(null); // to dismiss popup
                        this.SetDir(this.cwd);
                    });
                }
                imgui.EndPopup();
            }
        }

        // next list files ---------------------
        imgui.PushStyleColor("Text", imgui.GetStyleColor("FBFile"));
        for (let i=0;i<this.cwdFiles.length;i++)
        {
            let p = this.cwdFiles[i];
            if(this.filter.IsActive() && !this.filter.PassFilter(p))
                continue;
            if (imgui.Selectable(p, p == this.selection,
                SelectableFlags.AllowDoubleClick))
            {
                this.selection = p;
                this.selectionIndex = i + this.cwdSubdirs.length;
                this.updateSelection();
                if(imgui.IsMouseDoubleClicked([0]))
                    this.performAction();
            }
            if(imgui.BeginPopupContextItem("##file"+i))
            {
                if(imgui.Selectable("delete " + p + "?"))
                {
                    let fp = this.path.join(this.cwd, p);
                    console.info("deleting " + fp);
                    this.filesys.unlink(fp, (err) => {
                        if(err)
                            console.error(err);
                        else
                            console.info(fp + " deleted");
                        this.SetDir(this.cwd);
                    });
                }
                imgui.EndPopup();
            }
        }
        this.selectionIndexMax = this.cwdSubdirs.length + this.cwdFiles.length - 1;
        imgui.PopStyleColor();
        imgui.EndChild();
        if(!topButtons)
        {
            imgui.Separator();
            this.showButtons(imgui, fontSize);
        }
        imgui.End();
    }

    disableSelection()
    {
        return this.selection.length == 0 ||
               (this.opMode == FileBrowserMode.PickFile &&
                this.selectionType != "file") ||
               (this.opMode == FileBrowserMode.PickDir &&
                this.selectionType != "dir");
    }

    performAction() // where is null when mouse performs op
    {
        switch(this.selectionType)
        {
        case "dir":
            if(this.opMode == FileBrowserMode.PickDir)
                this.performSelection();
            else
            if(this.selection == "..")
            {
                if(/^[a-zA-Z]:[/]?$/.test(this.cwd))  // C: and C:/
                    this.SetDir("/");
                else
                    this.SetDir(this.path.dirname(this.cwd)); // Async
            }
            else
            {
                let np = this.path.join(this.cwd, this.selection);
                np = this.path.normalize(np);
                this.SetDir(np); // Async
            }
            break;
        case "file":
            if(this.opMode == FileBrowserMode.PickFile)
                this.performSelection();
            break;
        case "newfolder":
            break;
        }
    }

    performSelection() // works to select file or dir
    {
        let path = this.GetSelection(false/*abs*/);
        this.updateRecentDirs();
        if(this.clientCB)
            this.clientCB(0, path);
        else
            console.notice("would have selected:" + path);
    }

    showButtons(imgui)
    {
        //let maxwidth = imgui.GetContentRegionAvailWidth();
        let disable = this.disableSelection();
        switch(this.opMode)
        {
        case FileBrowserMode.PickFile:
        case FileBrowserMode.PickDir:
        default:
            if(disable)
            {
                imgui.PushItemFlag(ItemFlags.Disabled);
                imgui.PushStyleVar("Alpha", .5);
            }
            if(imgui.Button("Select"))
            {
                this.performSelection();
            }
            if(disable)
            {
                imgui.PopItemFlag();
                imgui.PopStyleVar();
            }
            imgui.SameLine();
            imgui.Text(this.selection);
            break;
        case FileBrowserMode.SaveFile:
            imgui.InputText("##FileName", this.nameEntry);
            imgui.SameLine();
            if(this.nameEntry.Length() == 0)
            {
                imgui.PushItemFlag(ItemFlags.Disabled);
                imgui.PushStyleVar("Alpha", .5);
            }
            if(imgui.Button("Save"))
            {
                this.performSelection();
            }
            if(this.nameEntry.Length() == 0)
            {
                imgui.PopItemFlag();
                imgui.PopStyleVar();
            }
            break;
        }
    }

    updateRecentDirs()
    {
        if(!this.prefs) return;
        let recentDirs = this.prefs ? this.prefs.GetValue(RecentDirs, []) : this.recentDirs;
        // ensure only one instance of cwd in recentDirs
        let idx = recentDirs.indexOf(this.cwd);
        if(idx != 0)
        {
            if(idx != -1)
                recentDirs.splice(idx,1);
            recentDirs.unshift(this.cwd); // aka push_front
            if(this.prefs)
                this.prefs.SetValue(RecentDirs, recentDirs.slice(0, 15));
        }
        this.recentDirs = recentDirs; // used in the non-prefs case
    }

    // XXX: it's possible that our child window is the "navwindow"
    // and this
    checkShortcuts(imgui)
    {
        if(!imgui.IsWindowFocused()) // don't consume if nav isn't
            return false;

        // When focused we consume all input.
        let io = imgui.guictx.IO;
        for (let n=0; n<io.InputKeyEvents.length; n++)
        {
            let evt = io.InputKeyEvents[n];
            switch(evt.key)
            {
            case "ArrowUp":
                if(this.selectionIndex>0)
                {
                    this.selectionIndex--;
                    this.updateSelection();
                }
                else
                    this.selectionIndex = 0;
                break;
            case "ArrowDown":
                if(this.selectionIndex<this.selectionIndexMax)
                {
                    this.selectionIndex++;
                    this.updateSelection();
                }
                break;
            case "Escape":
                return true;
            case "Return":
            case "Enter":
                // should return ever trigger selection/close?
                // when in file-select mode, return on a dir
                // should open that dir
                this.performAction();
                break;
            default:
                // console.log(evt.key, imgui.IsItemFocused());
                // save-as typein?
                break;
            }
        }
    }

    updateSelection()
    {
        if(this.selectionIndex >= 0 && this.selectionIndex <= this.selectionIndexMax)
        {
            if(this.selectionIndex < this.cwdSubdirs.length)
            {
                this.selection = this.cwdSubdirs[this.selectionIndex];
                this.selectionType = "dir";
            }
            else
            {
                this.selection = this.cwdFiles[this.selectionIndex-this.cwdSubdirs.length];
                this.selectionType = "file";
                if(this.opMode == FileBrowserMode.SaveFile)
                    this.nameEntry.Set(this.selection);
            }
        }
    }

    doClose()
    {
        // reset prompt, callback, etc
        if(this.clientCB)
            this.clientCB(0, null); // not an error, but a nullfile
        this.IsOpen.set(false);
    }

    readDirCB(err, flist)
    {
        if(err)
        {
            console.error(err);
            return;
        }
        // bad to sort flist here, since stat is async
        let nfiles = 0;
        for(let i=0; i<flist.length; i++)
        {
            // Warning: BrowserFS doesn't support opts, and DirEnt
            //  so we currently make a slew of stat calls
            let f = flist[i];
            let fpath;
            if(this.cwd == "/" && this.path.sep == "\\")
                fpath = f; // cuz this.path.join("/", "C:") is bad
            else
                fpath = this.path.join(this.cwd, f);
            this.filesys.stat(fpath, (err, stats) => {
                if(err)
                    this.cwdErrEntries.push(f);
                else
                if(stats.isDirectory())
                    this.cwdSubdirs.push(f);
                else
                if(stats.isFile())
                    this.cwdFiles.push(f);
                else
                    console.debug("skipping " + f); // (links, specical files)
                nfiles++;
                if(nfiles == flist.length-1)
                {
                    // ".." sorts to top for my locale
                    this.cwdSubdirs.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                    this.cwdFiles.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                    this.selectionIndex = 0;
                    this.selectionType = "dir";
                    this.selection = this.cwdSubdirs[0];
                }
            });
        }
    }
}

export default FileBrowser;
