// Utility functions and variables for content-script js files

// variables

// Team code to next 5 fixtures
var TEAM_ID_TO_NEXT_FIVE_FIXTURES={};
// Team code to true if away fixture in current gameweek else false
var TEAM_AWAY_DICT={};
// chosen gameweek 
var CHOSEN_GAMEWEEK=-1;
// Type of url : "transfers", "my-team" and "event"
var URL_CODE = '';
// window.location.href value when content-script is loaded
var CURRENT_URL = trim_url(window.location.href);
// Team code to link for home and away jersey
var TEAM_JERSEY_LINK_DICT={};
// API response from "https://(fantasy|draft).premierleague.com/api/bootstrap-static"
var BOOTSTRAP_RESPONSE;
// store response from https://(fantasy|draft).premierleague.com/api/event/${GW}/live/
// in one object, with the gameweeks as keys as the api response as values
var LAST_FEW_EVENTS_DATA ={};
var NEXT_FEW_EVENTS_DATA ={};
var LAST_GAMEWEEK_WITH_DATA = null;
var FARTHEST_GAMEWEEK_WITH_DATA = null;
// Team id to name(teamn code e.g ARS for arsenal)
var ID_TEAM_DICT={};
// Team name code to fpl id
var TEAM_ID_DICT={};
// Team name to team code
var TEAM_NAME_TO_CODE_DICT={};
// player webname to player id mapping
// the value is going to be a list since different id players can have the same web name
var PLAYER_WEB_NAME_TO_ID = {};
// player id to player data dict
var PLAYER_ID_TO_DATA = {};
// Fixture difficulty rating to color code
var FDR_TO_COLOR_CODE={
    1: ["rgb(55, 85, 35)", "black"],
    2: ["rgb(1, 252, 122)", "black"],
    3: ["rgb(231, 231, 231)", "black"],
    4: ["rgb(255, 23, 81)", "white"],
    5: ["rgb(128, 7, 45)", "white"]
}
// user settings dict
var ALL_SETTINGS = {};
// functions 

function trim_url(link){

    let url = link.split('?')[0].split('#')[0];
    if (url[url.length -1] == '/') url = url.slice(0, url.length-1);
    return url;

}

// returns player's id based on their webName and teamName
function get_player_id(webName, teamID){

    let playersList = PLAYER_WEB_NAME_TO_ID[webName];
    if (playersList.length == 1) return playersList[0][0];

    for (let playerList of playersList){
        if (playerList[1] == teamID){
            return playerList[0];
        }
    }

}

function get_user_id(href){

    let split_values = href.split('/');
    return Number(split_values[split_values.length-3]);
}

function modify_src_attributes(away_jersey_needed, sourceElement, imgElement, teamCode){

    let jerseyLink = away_jersey_needed ? TEAM_JERSEY_LINK_DICT[teamCode]["away"] : TEAM_JERSEY_LINK_DICT[teamCode]["home"]
    // remove everything after .png in the link
    jerseyLink = jerseyLink.replace(/\?width=\d*&height=[0-9]*/g, "");

    // srcset is of the type
    // srcset="/dist/img/shirts/standard/shirt_6-66.webp 66w, /dist/img/shirts/standard/shirt_6-110.webp 110w, /dist/img/shirts/standard/shirt_6-220.webp 220w"

    // image dimensions
    // 66w : 66 x 87
    // 110w : 110 x 145
    // 220w : 220 x 290

    let srcsetAttribute = `${jerseyLink}?width=66&height=87 66w, ${jerseyLink}?width=110&height=145 110w, ${jerseyLink}?width=220&height=290 220w`
    sourceElement.setAttribute("srcset", srcsetAttribute);
    imgElement.setAttribute("srcset", srcsetAttribute)

    imgElement.setAttribute("src", jerseyLink + "?width=66&height=87")
}

function get_color_for_points(points){
        //        0 -2 : no color ( red)
        //        3 - 5 : no color
        //       6 - 8 : green
        //        9 - 11 : blue 
        //        12+ : purple

        if (points <= 2) return FDR_TO_COLOR_CODE[4];
        else if (points <= 5) return FDR_TO_COLOR_CODE[3];
        else if (points <= 8) return FDR_TO_COLOR_CODE[2];
        else if (points <= 12) return ["rgb(64,224,208)", "black"];
        else return ["rgb(128, 98, 214)", "white"];
}

function create_team_name_id_code_dict(all_info_dict){

    let teams = all_info_dict["teams"];
    for (let team of teams){
        ID_TEAM_DICT[team.id] = team["short_name"];
        TEAM_ID_DICT[team.short_name] = team.id;
        TEAM_NAME_TO_CODE_DICT[team.name] = team["short_name"];
    }
}

function create_player_dict(){
    // creates player web name to id object and
    // creates player id to player data object
    for (let player_object of BOOTSTRAP_RESPONSE["elements"]){

        // create a empty list if no such key exists no far
        if (PLAYER_WEB_NAME_TO_ID[player_object.web_name] === undefined) PLAYER_WEB_NAME_TO_ID[player_object.web_name] = [];

        PLAYER_WEB_NAME_TO_ID[player_object.web_name].push([player_object.id, player_object.team]);
        PLAYER_ID_TO_DATA[player_object.id] = player_object;
    }

}

function waitForElement(parentElement, selector){

    return new Promise((resolve, reject)=>{

        if (parentElement.querySelector(selector)) {
            resolve();
        } else {

            const observer = new MutationObserver(mutations => {
                if (parentElement.querySelector(selector)) {
                    observer.disconnect();
                    resolve();
                }
            });
    
            observer.observe(parentElement, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }

    }

    )
}

async function check_if_away_jersey_needed(playerButtonElement, teamCode, use_regex, dict, querySelectorParameter){

    let awayJerseyNeeded = false;

    if (!use_regex){
        if (teamCode in dict && dict[teamCode] === true){
            // Modify attributes to handle re-sizing of the window for these images
            awayJerseyNeeded = true;
        }
    } else {

        // element might take time to load
        await waitForElement(playerButtonElement, querySelectorParameter)
        // only pick first team if double gameweek
        let oppositionTeam = playerButtonElement.querySelector(querySelectorParameter).innerText.split(',')[0];
        let pattern = new RegExp(/\([HA]\)/);
        let matches = oppositionTeam.match(pattern);
        if (matches && matches[0] == '(A)'){
            awayJerseyNeeded = true;
        }
    }

    return awayJerseyNeeded

}