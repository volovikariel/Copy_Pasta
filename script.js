// Easily create relative paths
const path = require('path');
// Detect keypresses
const gkm = require('gkm');
// Simulate keypresses
const robot = require('robotjs');
// Have access to file names in a folder
const glob = require('glob');

// Possibly a better notification system? 
//const notifier = require('node-notifier');
const { 
    app,
    Tray,
    Menu,
    globalShortcut,
    nativeImage,
    clipboard,
    Notification
} = require('electron');

let shiftIsPressed = false;

let takingInput = false;

let emotes = [];


let string = "";

gkm.events.on('key.released', function(data) {
    // Data is an object so return the actual string
    data = data[0];
    if(/Shift/.test(data)) {
        shiftIsPressed = false; 
    }
});

gkm.events.on('key.pressed', function(data) {
    // Data is an object so return the actual string
    data = data[0];

    // If backspace is pressed, remove a character
    if(/Backspace/.test(data)) {
        string = string.substring(0, string.length - 1);
        return;
    } 

    // PRIORITIES 
    // a) If it's not a supported letter[Num Lock, etc.] OR it's undefined[a bug?], return 
    // b) If it's a shift key press, make it true and return 
    // c) If it's a semicolon press, start taking input 
    // d) If it's a letter - check if it's in input - else - ignore it
    // If it is, add it to the string
    // Else start string back over at 0, start looking for a semicolon

    // a) If it's not a support letter OR it's the bugged undefined, return [Num Lock, etc.]
    let regex = new RegExp(/Undefined|Num Lock|Caps Lock/);
    if(regex.test(data)) {
        return;
    }

    // b) If it's a shift key press, make it true and return 
    if(data.match(/Shift/)) {
        if(!shiftIsPressed) {
            shiftIsPressed = true;
        }
        return;
    }

    // c) If it's a semicolon press, start taking input 
    if(data == 'Semicolon' && shiftIsPressed) {
        // If you've already been taking input and they entered another colon
        if(takingInput) {
            //TODO: Accept all file types
            const image = nativeImage.createFromPath(path.join(__dirname, `./images/${string}.png`));
            clipboard.writeImage(image);

            // Notification that it was copied
            new Notification({
                title: `Copied ${string} emote!`,
                icon: path.join(__dirname, `./images/${string}.png`)
            }).show();

            robot.keyToggle('control', 'down');
            robot.keyTap('backspace');
            robot.keyToggle('control', 'up');
            robot.keyTap('backspace');

            takingInput = false;
            string = "";
            return;
        }
        takingInput = true;
        return;
    }

    // d) If it's a valid input - check if it's in any emote
    if(takingInput) {
        if(shiftIsPressed) {
            takingInput = emotes.filter((emote) => {
                return emote.includes(string.concat(data));
            }).length > 0;
        }
        // Lowercase the string if no shift is pressed because [data] is always uppercased [if it's a number, just add it]
        else {
            takingInput = emotes.filter((emote) => {
                // Check if it's a letter, if it is AND it's included, return it, else return the check for numbers
                return (/[a-zA-Z]{1}/.test(emote)) ? emote.includes(string.concat(data.toLowerCase())): emote.includes(string.concat(data));
            }).length > 0;
        }

        // If it is valid letter, add it to the string with proper casing
        if(takingInput) {
            // If it's a letter AND shift isn't pressed, add the lowercase, else add it unmodified
            string += (/[a-zA-Z]{1}/.test(data) && !shiftIsPressed) ? data.toLowerCase() : data;
        }
        // Else start string back over at 0, start looking for a semicolon
        else {
            string = "";
        }
    }    
});



let tray = null
let contextMenu = null;
app.whenReady().then(() => {
    tray = new Tray(path.join(__dirname, './images/aww.png')); 
    tray.setToolTip('Copy Pasta');

    contextMenu = Menu.buildFromTemplate([ {
        label: 'running',
        checked: false, 
    } ])

    tray.setContextMenu(contextMenu)

    globalShortcut.register('CmdOrCtrl+shift+0', () => {
        process.exit();
    });

    globalShortcut.register('CmdOrCtrl+shift+5', () => {
        syncEmotes();
    });

    syncEmotes('startup');
})

let newEmotes;
function syncEmotes(param = 'none') {
    glob("./images/*", function (err, files) {
        if(err) {
            new Notification({
                title: "ERROR",
                body: `${err}`
            }).show();    
        }

        if(param == 'none') {
            newEmotes = files.map((filePath) => {
                return (path.relative("./images/", filePath).split('.'))[0];
            }); 

            newEmotes = newEmotes.filter((filePath) => {
                return !emotes.includes(filePath);
            });

            // If there is a new emote, notify the user of it
            if(newEmotes.length != 0) {
                let notif = new Notification({
                    title: "Synced",
                    body: `Now you can use: ${newEmotes}`,
                    icon: path.join(__dirname, './images/aww.png'),
                }).show();
            }
            else {
                new Notification({
                    title: "Synced",
                    body: "No new added emotes",
                    icon: path.join(__dirname, './images/aww.png')
                }).show();    
            }
        }

        // Converts all files globbed up into their relative paths from [./images/emoteName.*] into [emoteName]
        files = files.map((filePath) => {
            return (path.relative("./images/", filePath).split('.'))[0];
        }); 

        emotes = emotes.concat(files);        

        // If only 'aww.png' is found, tell them that they can add more images!
        if(files.length == 1) {
            new Notification({
                title: "Don't forget to add pictures of your emotes of choice!",
                body: "Once it's done, press CTRL+SHIFT+5 to refresh your emotes. Do note that the emotes have the same name as picture names!",
                icon: path.join(__dirname, './images/aww.png')
            }).show();    
        }

    })
}
