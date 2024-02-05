// Variables declaration

// current gameweek 
var CURRENT_GAMEWEEK=-1;
// Team name to id
var TEAM_ID_DICT={};
// Team name to true if away fixture else false
var TEAM_AWAY_DICT={};
// Team name to link for away jersey
var TEAM_JERSEY_LINK_DICT={};

// Functions
function swapKits(){

    let pitchElement = document.querySelector("[data-testid='pitch']");

}

function create_team_name_id_dict(all_info_dict){

    let teams = all_info_dict["teams"];
    for (let team of teams){
        TEAM_ID_DICT[team.name] = team.id
    }
}

function find_current_gameweek(all_info_dict){

    let all_gameweeks = all_info_dict["events"];
    for (let gameweek of all_gameweeks){
        if (gameweek["is_current"] === true){
            CURRENT_GAMEWEEK = gameweek["id"];
            break;
        }
    }

}
async function fetchAllRequiredData(){
    try {
    let [awayResponse, bootstrapResponse] = await Promise.all([
        // link to get team name and away jersey link
        fetch("https://paudsu01.github.io/FPL-360/extension/FPL-AWAY.json"),
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/")

            ])
     TEAM_JERSEY_LINK_DICT = await awayResponse.json();
     bootstrapResponse = await bootstrapResponse.json();

     // get current gameweek
     find_current_gameweek(bootstrapResponse);

     // make a dict of teamName and id
     create_team_name_id_dict(bootstrapResponse);

    } catch (err){
        console.log(err);
    }
}

fetchAllRequiredData();

window.onload = swapKits