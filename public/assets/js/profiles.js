import { timeProfileFormatter, timeScale, toFahrenheit, toCelsius } from "./helpers.js";


export function getProfiles(profilesArr, config) {

    let profiles = {}

    // delete old options in dropdown select
    $('#profile-select').find('option').remove().end();

    // obtain list of valid profiles (ie ones with a name attribute)
    var validProfiles = profilesArr.filter(prof =>  prof.hasOwnProperty("name") && prof.name);

    // create a profiles object with the names as keys, and
    // fill select with new options from websocket
    validProfiles.forEach( profile => {
        // create the profile plus all the bonus calculated bits
        profiles[profile.name] = calculateProfileGraph(profile, config)

        // add the profile to the dropdown
        $('#profile-select').append(`<option value="${profile.name}">${profile.name}</option>`);
    })

    return profiles;

}



function formatDPS(val, config) {
    let tval = val;
    if (config.timeScaleSlope == "M") tval = val * 60;    
    if (config.timeScaleSlope == "H") tval = (val * 60) * 60;
    return Math.round(tval);
}

function deleteProfile(ws_storage, profiles, profileToDel, graph) {
    var deleteStruct = { 
        "cmd": "DELETE", 
        "profile": {
            "type": "profile",
            "data": "",
            "name": profileToDel,
        }
    };
    var delete_cmd = JSON.stringify(deleteStruct);

    console.log("Deleting profile:" + profileToDel);

    ws_storage.send(delete_cmd);
    ws_storage.send('GET');
    
    // pull the next profile up as the selected one
    newProfile = profiles[profiles.keys()[0]].name;

    state="IDLE";
    $('#edit').hide();
    $('#profile_selector').show();
    $('#btn_controls').show();
    $('#status').slideDown();
    $('#profile_table').slideUp();
    $('#profile-select').select2('val', curProfileName);
    graph.profile.points.show = false;
    graph.profile.draggable = false;

    return profiles

}



export function newRow(scheduleName, index, target, ramp, hold, config) {
    return `
        <div class="row">
            <div class="col-lg-1 col-sm-1"><h4>${index + 1}</h4></div>
            <div class="col-lg-3 col-sm-12">
                <input 
                    type="number" 
                    class="form-control profile-table-temp" 
                    id="${scheduleName}:${index}:target"
                    value="${config.tempScale == "F" ? target.toFahrenheit() : target}" 
                />
            </div>
            <div class="col-lg-3 col-sm-12">
                <input 
                    type="number" 
                    class="form-control profile-table-ramp" 
                    id="${scheduleName}:${index}:ramp"
                    value="${config.tempScale == "F" ? ramp.toFahrenheit() : ramp}" 
                />
            </div>
            <div class="col-lg-3 col-sm-12">
                <input 
                    type="number" 
                    class="form-control profile-table-hold" 
                    id="${scheduleName}:${index}:hold"
                    value="${hold}" 
                />
            </div>
        </div>
    `;
}


export function editProfile(curProfile, config) {
    let segments = curProfile.simplified;
    console.log(segments)

    var html = `
            <h3>Firing Schedule: ${curProfile.name}</h3>
            <div class="container">
            <div class="row">
                <div class="col-lg-1 col-sm-1">Segment</div>
                <div class="col-lg-3 col-sm-12">Target Temperature in °${config.tempScale}</div>
                <div class="col-lg-3 col-sm-12">Ramp in &deg;${config.tempScale}/${config.timeScaleSlope}</div>
                <div class="col-lg-3 col-sm-12">Hold (in ${timeScale(config.timeScaleProfile)})</div>
            </div>
            `;



    segments.forEach((s, index) => {
        html += newRow(curProfile.name, index, s.target, s.rise, s.hold, config);
    });


    html += `
        <div class="row">
            <div class="col-lg-3 col-sm-12">
                <button type="button" class="add-segment" onClick="addSegment('${curProfile.name}')">Add Segment</button>
            </div>
            <div class="col-lg-3 col-sm-12">
                <button type="button" class="save-profile" onClick="saveProfile('${curProfile.name}')">Save</button>
            </div>
        </div>
        </div>
            `;

    $('#profile-table').html(html).show();



}

export function onProfileChange(tempProfile, inputID, val, config) {
    let decodedID = inputID.split(":");
    let scheduleName = decodedID[0];
    let segID = decodedID[1];
    let fieldType = decodedID[2];

    // update the profile object with the new value
    tempProfile.simplified[segID][fieldType] = val;
    
    tempProfile = calculateProfileData(tempProfile, config)

    return tempProfile;
}

export function calculateProfileData(profile, config) {
    let timeCount = 0;
    let segments = profile.simplified;
    let segData = [];
    let problemFlag = false;

    segments.forEach((segment, index) => {

        if (segment.rise == 0) {
            problemFlag = true;
            alert("The rise for a given segment may never be 0. If you would like to hold at a temperature, then add a hold to the segment just before, rather than creating a new segment.")
        } else if (segment.target < 0) {
            problemFlag = true;
            alert("Are you sure you're operating a kiln? Target temp may not be less than 0")
        } else if (segment.hold < 0) {
            problemFlag = true;
            alert("This is an amazing program but it is not a time machine. Please set your hold to 0 or more")
        }

        // calculate the segment in a robot friendly way
        let startTime = timeCount;
        let startTemp = (index == 0) ? 21 : segments[index -1].target;
        let rise = segment.rise;
        let targetTemp = segment.target;

        if (startTemp < targetTemp && rise < 0) {
            problemFlag = true;
            alert(`You cannot ask a kiln to reach a target (${targetTemp}) that is larger than the previous target (${startTemp}) while decreasing temperature at ${rise} per hour.`)
        } else if (startTemp > targetTemp && rise > 0) {
            problemFlag = true;
            alert(`You cannot ask a kiln to reach a target (${targetTemp}) that is smaller than the previous target (${startTemp}) while increasing temperature at ${rise} per hour.`)
        }

        // figure out the minDuration
        let minDuration = (targetTemp - startTemp) / rise;
        minDuration = timeProfileFormatter(minDuration, false, {timeScaleProfile: "H"});

        segData.push({startTime, startTemp, rise, targetTemp, minDuration});

        timeCount += minDuration;

        if (segment.hold > 0) {
            startTime = timeCount;
            startTemp = targetTemp;
            rise = 0;
            targetTemp = startTemp;
            minDuration = timeProfileFormatter(segment.hold, false, config);
            segData.push({startTime, startTemp, rise, targetTemp, minDuration});
            timeCount += minDuration;
        }
    })

    profile["data"] = segData;
    profile["type"] = "newProfile";
    profile["totalTime"] = timeCount;
    profile = calculateProfileGraph(profile, config);

    return profile;
}

function calculateProfileGraph(profile, config) {
    let data = profile.data;

    // calculating details about the firing
    let kwh = (3850*profile.totalTime/3600/1000).toFixed(2);
    let cost =  (kwh*config.kwhRate).toFixed(2);
    let jobTime = new Date(profile.totalTime * 1000).toISOString().substr(11, 8);

    // creating graph which is a set of points where x is time and y is temp
    let graphData = data.map(segment => [segment.startTime, segment.startTemp]);

    // grab the last point on the graph (the ending temp and time)
    let lastSeg = data[data.length - 1];
    graphData.push([profile.totalTime, lastSeg.targetTemp]);

    // create the profile plus all the bonus calculated bits
    return {
        ...profile,
        kwh: kwh,
        cost: cost,
        jobTime: jobTime,
        graphData: graphData
    }
}