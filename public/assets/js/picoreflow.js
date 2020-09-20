import { getProfiles, newRow, editProfile, calculateProfileData, onProfileChange, createProfile } from "./profiles.js";
import { graphOptions, graphInit, populateProfileGraph, updateGraph } from "./graph.js";
import { timeScale, toFahrenheit, toCelsius, getRandomProfileName } from "./helpers.js"

var state = "IDLE";
var state_last = "";
var graph = {...graphInit};
var points = [];
var profiles = {};
var time_mode = 0;
var curProfileName = "";
var tempProfile;
var config = {
    tempScale: "C",
    timeScaleSlope: "S",
    timeScaleProfile: "S",
    kwhRate: 0.26,
    currencyType: "CAD"
};




var host = "ws://" + window.location.hostname + ":" + window.location.port;
var ws_status = new WebSocket(host+"/status");
var ws_control = new WebSocket(host+"/control");
var ws_config = new WebSocket(host+"/config");
var ws_storage = new WebSocket(host+"/storage");


if(window.webkitRequestAnimationFrame) window.requestAnimationFrame = window.webkitRequestAnimationFrame;


function updateProgress(percentage) {
    if(state=="RUNNING") {
        if(percentage > 100) percentage = 100;
        $('#progressBar').css('width', percentage+'%');
        if(percentage>5) $('#progressBar').html(parseInt(percentage)+'%');
    } else {
        $('#progressBar').css('width', 0+'%');
        $('#progressBar').html('');
    }
}


function hazardTemp() {
    if (config.tempScale == "F") return toFahrenheit(1500);
    else return 1500;
}



function runTask() {
    console.log("running " + curProfileName);
    let cmd = {
        "cmd": "RUN",
        "profile": curProfileName
    }

    graph.firing.data = [];
    graph.plot = updateGraph(graph)

    ws_control.send(JSON.stringify(cmd));
}
window.runTask = runTask




function runTaskSimulation() {
    var cmd = {
        "cmd": "SIMULATE",
        "profile": curProfileName
    }

    graph.firing.data = [];
    graph.plot = updateGraph(graph)


    ws_control.send(JSON.stringify(cmd));

}
window.runTaskSimulation = runTaskSimulation




function abortTask() {
    var cmd = {"cmd": "STOP"};
    ws_control.send(JSON.stringify(cmd));
}
window.abortTask = abortTask




function enterNewMode() {
    state="EDIT"
    $('#status').slideUp();
    $('#edit').show();
    $('#profile_selector').hide();
    $('#btn_controls').hide();
    $('#form_profile_name').attr('value', getRandomProfileName());
    $('#form_profile_name').attr('placeholder', 'Please enter a name');
    graph.profile.points.show = true;
    graph.profile.data = [];
    tempProfile = createProfile(profiles, curProfileName, config);
}
window.enterNewMode = enterNewMode



function enterEditMode() {
    state="EDIT"
    $('#status').slideUp();
    $('#edit').show();
    $('#profile_selector').hide();
    $('#btn_controls').hide();
    $('#form_profile_name').val(curProfileName);

    graph.profile.points.show = true;
    graph.plot = updateGraph(graph);
    editProfile(profiles[curProfileName], config);
    tempProfile = profiles[curProfileName];

    //Link table to graph
    $(".form-control").change(function(e) {
        let inputID = this.id;
        let val = this.value;

        // handle changes to the schedule / profile name
        if (inputID == "form_profile_name") {
            if (val.includes(":") || val.includes(" ")) {
                alert("Sorry, your schedule name may not contain a colon (:) or a space");
                $('#form_profile_name').val(curProfileName);
            } else {
                tempProfile = profiles[curProfileName];
                tempProfile.name = val;
                $('#form_profile_name').val(val);
                curProfileName = val;
            }

        // handle changes to any part of the schedule other than the name
        } else {
            tempProfile = onProfileChange(tempProfile, inputID, parseInt(val), config)
        }

        //console.log(tempProfile)
    });
}
window.enterEditMode = enterEditMode



function addSegment(curProfileName) {
    tempProfile = profiles[curProfileName];
    tempProfile.simplified.push({rise: 0, target: 0, hold: 0});
    // potential problem: changing a profile name before adding a segment
    // will result in the old profile not being deleted (as editProfile)
    // will be called on tempProfile which will leave the original profile 
    // unaltered.
    editProfile(tempProfile, config);
}
window.addSegment = addSegment



function saveProfile(profileName) {

    if (tempProfile == {}) {
        alert("Uh, something went wrong. Please try again.");
        leaveEditMode();
    }

    let newProfile = tempProfile;

    console.log("saving new profile", tempProfile)

    // if the name was changed, delete the old profile data
    if (newProfile.name != profileName) {
        delete profiles[profileName]
    }

    // filter out any segments with no data in them
    let segments = newProfile.simplified.filter(seg => !!seg.rise && !!seg.target && !!seg.hold)

    // convert to C for storage if the user is using F
    if (config.tempScale == "F") {
        segments.forEach(segment, index => {
            simplified[index].rise = segment.rise.toCelsius();
            simplified[index].target = segment.target.toCelsius();
        })
    }

    // pop the filtered segments back into the profile object
    newProfile.simplified = segments;

    // munch the profile to make the graph happy then put it into profiles
    profiles[newProfile.name] = calculateProfileData(newProfile, config);

    // display the new graph
    graph = populateProfileGraph(graph, config, profiles[newProfile.name]);

    console.log(profiles[newProfile.name])

    let profile = {
        data: newProfile.data,
        simplified: newProfile.simplified,
        totalTime: newProfile.totalTime,
        name: newProfile.name
    };

    var put = { "cmd": "PUT", "profile": profile }

    var put_cmd = JSON.stringify(put);

    ws_storage.send(put_cmd);

    leaveEditMode();

}
window.saveProfile = saveProfile


function leaveEditMode() {
    tempProfile = {};
    curProfileName = $('#form_profile_name').val();
    ws_storage.send('GET');
    state="IDLE";
    $('#edit').hide();
    $('#profile_selector').show();
    $('#btn_controls').show();
    $('#status').slideDown();
    $('#profile-table').slideUp();
    graph.profile.points.show = false;
    graph.plot = updateGraph(graph)

}
window.leaveEditMode = leaveEditMode



function toggleTable() {
    if ($('#profile-table').css('display') == 'none') $('#profile-table').slideDown();
    else  $('#profile-table').slideUp();

}




$(document).ready(function() {

    if(!("WebSocket" in window)) {
        $('#chatLog, input, button, #examples').fadeOut("fast");
        $('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
    }
    else {

        // Status Socket ////////////////////////////////

        ws_status.onopen = () => {
            console.log("Status Socket has been opened");

            $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span>Getting data from server", {
            ele: 'body', // which element to append to
            type: 'success', // (null, 'info', 'error', 'success')
            offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
            align: 'center', // ('left', 'right', or 'center')
            width: 385, // (integer, or 'auto')
            delay: 2500,
            allow_dismiss: true,
            stackup_spacing: 10 // spacing between consecutively stacked growls.
            });
        };

        ws_status.onclose = () => {
            $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>ERROR 1:</b><br/>Status Websocket not available", {
            ele: 'body', // which element to append to
            type: 'error', // (null, 'info', 'error', 'success')
            offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
            align: 'center', // ('left', 'right', or 'center')
            width: 385, // (integer, or 'auto')
            delay: 5000,
            allow_dismiss: true,
            stackup_spacing: 10 // spacing between consecutively stacked growls.
          });
        };

        ws_status.onmessage = e => {
            //console.log("received status data")
            //console.log(e.data);

            let x = JSON.parse(e.data);
            if (x.type == "backlog") {

                console.log("populating graph from backlog")

                // get the correct profile selected
                if (x.profile && x.profile.name) {
                    curProfileName = x.profile.name;
                    populateProfileGraph(graph, config, profiles[curProfileName]);
                    $('#profile-select').select2('val', curProfileName);
                }

                // adding log points to graph live object
                x.log.forEach(entry => {
                    graph.firing.data.push([entry.runtime, entry.temperature]);
                })


                // drop the firing info into the graph
                graph.plot = updateGraph(graph)

            }

            if (state!="EDIT") {
                state = x.state;

                if (state!=state_last) {
                    if(state_last == "RUNNING") {
                        $('#target_temp').html('---');
                        updateProgress(0);
                        $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>Run completed</b>", {
                        ele: 'body', // which element to append to
                        type: 'success', // (null, 'info', 'error', 'success')
                        offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
                        align: 'center', // ('left', 'right', or 'center')
                        width: 385, // (integer, or 'auto')
                        delay: 0,
                        allow_dismiss: true,
                        stackup_spacing: 10 // spacing between consecutively stacked growls.
                        });
                    }
                }

                if(state=="RUNNING") {
                    $("#nav_start").hide();
                    $("#nav_stop").show();

                    graph.firing.data.push([x.runtime, x.temperature]);
                    graph.plot = updateGraph(graph)


                    let left = parseInt(x.totaltime-x.runtime);
                    let eta = new Date(left * 1000).toISOString().substr(11, 8);

                    updateProgress(parseFloat(x.runtime)/parseFloat(x.totaltime)*100);
                    $('#state').html('<span class="glyphicon glyphicon-time" style="font-size: 22px; font-weight: normal"></span><span style="font-family: Digi; font-size: 40px;">' + eta + '</span>');
                    $('#target_temp').html(parseInt(x.target));


                }
                else
                {
                    $("#nav_start").show();
                    $("#nav_stop").hide();
                    $('#state').html('<p class="ds-text">'+state+'</p>');
                }

                $('#act_temp').html(parseInt(x.temperature));
                
                if (x.heat > 0.5) { $('#heat').addClass("ds-led-heat-active"); } else { $('#heat').removeClass("ds-led-heat-active"); }
                if (x.cool > 0.5) { $('#cool').addClass("ds-led-cool-active"); } else { $('#cool').removeClass("ds-led-cool-active"); }
                if (x.air > 0.5) { $('#air').addClass("ds-led-air-active"); } else { $('#air').removeClass("ds-led-air-active"); }
                if (x.temperature > hazardTemp()) { $('#hazard').addClass("ds-led-hazard-active"); } else { $('#hazard').removeClass("ds-led-hazard-active"); }
                if ((x.door == "OPEN") || (x.door == "UNKNOWN")) { $('#door').addClass("ds-led-door-open"); } else { $('#door').removeClass("ds-led-door-open"); }

                state_last = state;

            }
        };

        // Config Socket /////////////////////////////////
        
        ws_config.onopen = () => {ws_config.send('GET');};

        ws_config.onmessage = e => {

            let x = JSON.parse(e.data);

            config.tempScale = x.temp_scale.toUpperCase();
            config.timeScaleSlope = x.time_scale_slope.toUpperCase();
            config.timeScaleProfile = x.time_scale_profile.toUpperCase();
            config.kwhRate = x.kwh_rate;
            config.currencyType = x.currency_type.toUpperCase();
                          

            $('#act_temp_scale').html('º'+config.tempScale);
            $('#target_temp_scale').html('º'+config.tempScale);


            
        }

        // Control Socket ////////////////////////////////

        ws_control.onopen = () => {console.log("control socket opened")};

        ws_control.onmessage = e => {
            //Data from Simulation
            console.log ("control socket has been opened")
            console.log (e.data);
            let x = JSON.parse(e.data);
            graph.firing.data.push([x.runtime, x.temperature]);
            graph.plot = updateGraph(graph)

        }

        // Storage Socket ///////////////////////////////

        ws_storage.onopen = () => {ws_storage.send('GET')};

        ws_storage.onmessage = e => {
            let message = JSON.parse(e.data);

            if (message.resp) {
                if(message.resp == "FAIL") {
                    if (confirm('Overwrite?')) {
                        message.force=true;
                        console.log("Sending: " + JSON.stringify(message));
                        ws_storage.send(JSON.stringify(message));
                    } else {
                        //do nothing
                    }
                }

                return;
            }

            // convert json message into profiles object
            profiles = getProfiles(message, config);

            // if the selected profile name is NOT in the valid list, pick one that is
            if (!profiles.hasOwnProperty(curProfileName)) curProfileName = profiles[Object.keys(profiles)[0]].name;

            // put the selected profile as selected in the dropdown
            $('#profile-select').select2('val', curProfileName);

            // populate the profile graph
            graph = populateProfileGraph(graph, config, profiles[curProfileName]);

        };


        $("#profile-select").select2( {
            placeholder: "Select Profile",
            allowClear: true,
            minimumResultsForSearch: -1
        });


        $("#profile-select").on("change", e => {
            populateProfileGraph(graph, config, profiles[e.val]);
        });

    }
});


