// Variables declaration

// current gameweek 
var CURRENT_GAMEWEEK=-1;
// Team id to name(teamn code e.g ARS for arsenal)
var ID_TEAM_DICT={};
// Team code to true if away fixture in current gameweek else false
var TEAM_AWAY_DICT={};
// Team code to link for away jersey
var TEAM_JERSEY_LINK_DICT={};
// Team name to team code
var TEAM_NAME_TO_CODE_DICT={};

// Functions
function swapKits(){

    let pitchElement = document.querySelector("[data-testid='pitch']");
    // the player jersey boxes in the website are inside button tags
    // 30 button tags : 2 for each player

    // Skip goalkeeper buttons(index 0 and 1)

    // Necessary to alternate between button tags
    // loop over buttons with index 2,4,...
    let all_buttons = pitchElement.querySelectorAll("button");
    for (let currentIndex=2; currentIndex < all_buttons.length; currentIndex += 2){
        
        let imgElement = all_buttons[currentIndex].querySelector("img");
        let teamName = imgElement.getAttribute("alt");
        let teamCode = TEAM_NAME_TO_CODE_DICT[teamName];

        if (TEAM_AWAY_DICT[teamCode] === true){
            imgElement.setAttribute("src", TEAM_JERSEY_LINK_DICT[teamCode])
        }

    }

}

function create_team_name_id_code_dict(all_info_dict){

    let teams = all_info_dict["teams"];
    for (let team of teams){
        ID_TEAM_DICT[team.id] = team["short_name"]
        TEAM_NAME_TO_CODE_DICT[team.name] = team["short_name"]
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

async function create_team_name_away_fixture_dict(){

    let response = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${CURRENT_GAMEWEEK}`)
    let fixtures = await response.json();
    for (let fixture of fixtures){
        let home_team = ID_TEAM_DICT[fixture["team_h"]];
        let away_team = ID_TEAM_DICT[fixture["team_a"]];
        TEAM_AWAY_DICT[home_team] = false;
        TEAM_AWAY_DICT[away_team] = true;
    }
    
}

async function main(){

    try {
    let [awayResponse, bootstrapResponse] = await Promise.all([
        // link to get team name and away jersey link
        fetch("https://paudsu01.github.io/FPL-360/extension/FPL-AWAY.json"),
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/")

            ])
     TEAM_JERSEY_LINK_DICT = await awayResponse.json();
     bootstrapResponse = await bootstrapResponse.json();

     // make a dict of team id to team code and 
     // a dict that maps from team name to team code
     create_team_name_id_code_dict(bootstrapResponse);
    
     // get current gameweek
     find_current_gameweek(bootstrapResponse);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     create_team_name_away_fixture_dict();

     // Swap kits if needed after windows gets loaded
     window.onload = swapKits;

    } catch (err){
        console.log(err);
    }
}

main();
