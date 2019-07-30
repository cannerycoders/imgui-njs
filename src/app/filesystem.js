/* global BrowserFS, navigator */
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
        if(runtime == "browser")
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
        {
            this.path = require("path");
            this.fs = require("fs");
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