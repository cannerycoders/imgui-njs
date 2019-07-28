# imgui-njs example

Here is a stripped-down demo of `imgui-njs` targeting a browser environment.
Note that imgui-njs can be used in both `electron` and browser environments but
for simplicity we'll leave electron deployment as an exercise for the reader.
This example relies on the ubiquitous node-express server package to run but
it should be straightforward to wire it into your favorite webserver 
environment.

Steps (requires console access):

- cd this-directory
- npm install  (installs express, assumes npm and node are already installed)
- node server.js
- (in browser)  http://localhost:8080

Notes:

- mostly tested on Google Chrome
- Firefox works, but certain canvas operations are slower


