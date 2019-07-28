# imgui-njs todo

<!-- TOC depthFrom:2 depthTo:3 updateOnSave:true withLinks:true -->

- [imgui-njs](#imgui-njs)
    - [integration history (imgui)](#integration-history-imgui)
    - [unimplemented](#unimplemented)
    - [bugs](#bugs)
    - [test](#test)

<!-- /TOC -->

## imgui-njs

### integration history (imgui)

`git show 742b5f4c` (bunch of small changes from docking branch)

### unimplemented

#### panels

* Filtering demos
* Inputs, Nav and Focus demos
* Examples and Help menus
    * log window

#### logging

#### drawing/rendering

* custom mouse cursors
* drawlist
    * channels
    * foreground, background
    * fast arcs/circles
    * DrawListSharedData
* Context (apparently unneeded, single/alt FontAtlas suffices)

#### animation

#### unimplemented widgets

* alt range editor
* numerical expression "picker"
* hue wheel

#### performace

* lazy render:
    * dirty display tracking
* don't need to clip on entire canvas?

### bugs

#### widgets

* tabs don't resize well (crash)
* multi-component widgets needs work

#### rendering

* triangles aren't clipped
* mysterious occasional clipping bug (button-text during scroll)

#### events

* tab-nav

#### window

### test

* scalability to 10s of windows and 1000s of items
* memory leaks/garbage collection
