/* global BrowserFS */
// see:
// https://github.com/jvilk/BrowserFS
// https://jvilk.com/browserfs/2.0.0-beta/index.html
// https://en.wikipedia.org/wiki/OverlayFS
// https://www.html5rocks.com/en/tutorials/webdatabase/websql-indexeddb/
// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
// https://stackoverflow.com/questions/1443158/binary-data-in-json-string-something-better-than-base64
// https://www.html5rocks.com/en/tutorials/file/filesystem/
// https://developer.mozilla.org/en-US/docs/Web/API/File_and_Directory_Entries_API/Introduction
//
// The simplest of filesystem shims.  Works in cahoots with a server
// and communicates over a websocket.  We currently assume all files
// are small enough to read in one go.  Permissions, etc are missing.

// currently we don't expose the node-glue apis outside this file.
export class FileSystem
{
    constructor(runtime)
    {
        let self = this;
        this.runtime = runtime;
        this.isWindows = false;
        if(runtime == "browser")
        {
            if(window.BrowserFS != undefined)
            {
                console.info("Installing BrowserFS");
                this.fs = BrowserFS.BFSRequire("fs");
                this.path = BrowserFS.BFSRequire("path");
                BrowserFS.FileSystem.IndexedDB.Create(function(e, lsfs) {
                    BrowserFS.FileSystem.XmlHttpRequest.Create(function(e, http) {
                        BrowserFS.FileSystem.MountableFileSystem.Create({
                            "/home": lsfs,
                            "/net": http
                        }, function(e, mfs) {
                            BrowserFS.initialize(mfs);
                            // BFS is now ready to use!
                            self.oninit();
                        });
                    });
                });
            }
            else
                console.warn("No file-IO in browser mode");
        }
        else
        if(runtime == "electron")
        {
            // we use window.require to trick webpack for electron
            /* we don't want to use remote package since it's 
             * deprecated.
             */

            /*
            let remote = window.require("electron").remote;
            this.fs = remote.require("fs");
            this.path = window.require("path"); 
            */
            this.isWindows = navigator && 
                            (navigator.platform.indexOf("Win32") != -1);
        }
        else
        {
            this.path = require("path"); // webpack handles this?
            this.fs = null; // no filesystem here yet (eg: cordova)
        }
    }

    oninit()
    {
        console.debug("FileSystem initialized");
        // self.test();
    }

    stat(pathname, islstat, cb)
    {
        this.fs.stat(pathname, islstat, cb);
    }

    statSync(pathname, islstat)
    {
        return this.fs.statSync(pathname, islstat);
    }

    readFile(pathname, options, cb) // cb(string|Buffer)
    {
        this.fs.readFile(pathname, options, cb);
    }

    readFileSync(pathname, options=null)
    {
        return this.fs.readFileSync(pathname, options);
    }

    // mode: 0o666 is default
    writeFile(pathname, data, encoding=null, flag="w+", mode=null, cb)
    {
        this.fs.writeFile(pathname, data, encoding, flag, mode, cb);
    }

    writeFileSync(pathname, contents, encoding=null, flag)
    {
        return this.fs.writeFileSync(pathname, contents, encoding, flag);
    }

    listVolumes(cb)
    {
        if(this.isWindows)
        {
            let opts = {withFileTypes: true};
            this.filesys.readdir(this.cwd, opts, cb);
        }
        else
        {
            // spawn a cmd child process, pipe the "wmic" command to it
            // alt take: spawn wmic directly (assumes wmic is in path)
            // https://stackoverflow.com/questions/15878969/enumerate-system-drives-in-nodejs
            let cp = window.require("child_process");
            if(!cp)
            {
                console.error("listVolumes missing child_process module");
                return;
            }
            let spawn = cp.spawn;
            const list = spawn("wmic", ["logicaldisk", "get", "name"]);
            list.stdout.on("data", (data) =>
            {
                // console.log("stdout: " + String(data));
                const output = String(data);
                const out = output.split("\r\n").map(e=>e.trim()).filter(e=>e!="");
                if (out[0]==="Name")
                {
                    let ret = [];
                    // expect items 1-length to be drives
                    // for now we ignore network drives and cull
                    // redundant mounts (eclipse seems to introduce one)
                    for(let vol of out.slice(1))
                    {
                        if(vol[1] == ":")
                        {
                            let vdir = vol.slice(0, 2); // "C:"
                            if(ret.indexOf(vdir) == -1)
                                ret.push(vdir);
                        }
                    }
                    cb(0, ret);
                }
            });
            list.stderr.on("data", function (data) {
                console.error("stderr: " + data);
            });
            list.on("exit", function (code) {
                if (code !== 0)
                {
                    console.error("child process exited with code " + code);
                    cb(code, []);
                }
            });

            //  -- here's the actual command -------------------
            // list.stdin.write("wmic logicaldisk get name\n");
            // list.stdin.end();
        }
    }

    readdir(pathname, opts, cb) // cb(err, string[])
    {
        // BrowserFS doens't support opts
        this.fs.readdir(pathname, cb);
    }

    readdirSync(pathname)
    {
        return this.fs.readdirSync(pathname); // returns string[]
    }

    mkdir(pathname, opts, cb)
    {
        // opts: recursive, mode
        this.fs.mkdir(pathname, opts, cb);
    }

    mkdirSync(pathname, opts)
    {
        this.fs.mkdirSync(pathname, opts);
    }

    rmdir(pathname, cb)
    {
        this.fs.rmdir(pathname, cb);
    }

    unlink(pathname, cb)
    {
        this.fs.unlink(pathname, cb);
    }

    test()
    {
        this.mkdir("/home/dana", {recursive: true},
            (err) =>
            {
                if(err && err.code != "EEXIST")
                {
                    console.error(err);
                    return;
                }
                let fn = "/home/dana/test.txt";
                this.fs.writeFile(fn,
                    "Cool, I can do this in the browser!",
                    function(err) {
                        this.fs.readFile(fn, function(err, contents) {
                            console.log(contents.toString());
                        });
                });
            });
        this.fs.readdir("/net/examples/orca", function(err, files)
            {
                if(err)
                    console.error(err);
                console.log("/net/examples/orca: " + files);
            });
    }
}