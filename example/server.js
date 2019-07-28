const fs = require("fs");
const url = require("url");
const http = require("http");
const express = require("express");
const path = require("path");

const logRequestStart = (req, res, next) => {
    if(["GET", "HEAD"].indexOf(req.method) == -1)
        console.info(`${req.method} ${req.originalUrl}`);
    next();
};

const context = {};
context.app = express();
context.app.use(logRequestStart);
context.app.use("/", express.static(path.join(__dirname,"./www")));
context.app.use("/js/imgui-njs", express.static(path.join(__dirname,"../src")));
context.server = http.createServer({}, context.app);

/* operation -------------------------------------------------------------- */
try
{
    console.log("listening on port 8080");
    context.server.listen(8080);
}

catch(err)
{
    console.err(err);
}
