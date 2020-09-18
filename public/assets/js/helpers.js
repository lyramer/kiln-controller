import { animals, adjectives, colours } from "./options.js"

export function timeProfileFormatter(val, down, config) {
    var rval = val
    switch (config.timeScaleProfile){
        case "M":
            if (down) {rval = val / 60;} else {rval = val * 60;}
            break;
        case "H":
            if (down) {rval = val / 3600;} else {rval = val * 3600;} 
            break;
        default:
            alert("helpers.js: timeProfileFormatter function needs a slope");
    }
    return Math.round(rval);
}


export function timeTickFormatter(val) {
    if (val < 1800) { return val; }
    else {
        var hours = Math.floor(val / (3600));
        var div_min = val % (3600);
        var minutes = Math.floor(div_min / 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}

        return hours+":"+minutes;
    }
}

export function timeScale(timeScaleProfile) {
    switch(timeScaleProfile) {
        case "S":
            return "Seconds";
        case "M":
            return "Minutes";
        case "H":
            return "Hours";
    }
}

export function toFahrenheit(temp) {
    return temp * (9/5) + 32;
}

export function toCelsius(temp) {
    return temp * (5/9) - 32;
}

export function getRandomProfileName() {
    let newName = [
        adjectives[Math.floor(Math.random() * adjectives.length)],
        colours[Math.floor(Math.random() * colours.length)],
        animals[Math.floor(Math.random() * animals.length)],
    ]

    return newName.join("-");
    
}