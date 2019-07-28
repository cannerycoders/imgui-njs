
export var ImguiLoggingMixin =
{
    // - All text output from the interface can be captured into
    //   tty/file/clipboard. By default, tree nodes are automatically
    //   opened during logging.

    // start logging to tty (stdout)
    LogToTTY(auto_open_depth)
    {
    },

    // start logging to file
    LogToFile(auto_open_dept =-1, filename=null)
    {},

    // start logging to OS clipboard
    LogToClipboard(auto_open_depth = -1)
    {},

    // stop logging (close file, etc.)
    LogFinish()
    {},

    // helper to display buttons for logging to tty/file/clipboard
    LogButtons()
    {},

    // pass text data straight to log (without being displayed)
    LogText(str)
    {},
};