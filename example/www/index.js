import {App} from "./app.js";

function onLoaded()
{
    App.Begin((err) => {
        window.requestAnimationFrame(onLoop);
    });
}

async function onLoop(time)
{
    if(App.OnLoop(time))
        window.requestAnimationFrame(onLoop);
    else
    {
        console.log("render thread done");
        App.End();
    }
}

document.addEventListener("DOMContentLoaded", onLoaded, false);

