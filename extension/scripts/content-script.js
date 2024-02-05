console.log("content-script loaded")
// Variables declaration

// chosen gameweek 
var CHOSEN_GAMEWEEK=-1;
// Team id to name(teamn code e.g ARS for arsenal)
var ID_TEAM_DICT={};
// Team code to true if away fixture in current gameweek else false
var TEAM_AWAY_DICT={};
// Team code to link for away jersey
var TEAM_JERSEY_LINK_DICT={};
// Team name to team code
var TEAM_NAME_TO_CODE_DICT={};

// Functions
function waitForElement(){

    return new Promise((resolve, reject)=>{

        if (document.querySelector("[data-testid='pitch']")) {
            resolve();
        } else {

            const observer = new MutationObserver(mutations => {
                if (document.querySelector("[data-testid='pitch']")) {
                    observer.disconnect();
                    resolve();
                }
            });
    
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

    }

    )
}
function swapKits(){

    let pitchElement = document.querySelector("[data-testid='pitch']");

    // the player jersey boxes in the website are inside button tags
    // 30 button tags : 2 for each player

    // Skip goalkeeper buttons(index 0 and 1)

    // Necessary to alternate between button tags
    // loop over buttons with index 2,4,...

    let all_buttons = pitchElement.querySelectorAll("button");

    for (let currentIndex=2; currentIndex < all_buttons.length; currentIndex += 2){
        
        // index 22 is for the bench goalie
        if (currentIndex == 22) continue;

        let sourceElement= all_buttons[currentIndex].querySelector("source");
        let imgElement = all_buttons[currentIndex].querySelector("img");
        let teamName = imgElement.getAttribute("alt");
        let teamCode = TEAM_NAME_TO_CODE_DICT[teamName];

        if (teamCode in TEAM_AWAY_DICT && TEAM_AWAY_DICT[teamCode] === true){
            // Modify attributes to handle re-sizing of the window for these images
            let jerseyLink = TEAM_JERSEY_LINK_DICT[teamCode]
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

    }

}

function create_team_name_id_code_dict(all_info_dict){

    let teams = all_info_dict["teams"];
    for (let team of teams){
        ID_TEAM_DICT[team.id] = team["short_name"]
        TEAM_NAME_TO_CODE_DICT[team.name] = team["short_name"]
    }
}

function find_chosen_gameweek(all_info_dict){

    // check url

    let all_gameweeks = all_info_dict["events"];
    for (let gameweek of all_gameweeks){
        if (gameweek["is_current"] === true){
            CHOSEN_GAMEWEEK = gameweek["id"];
            break;
        }
    }

}

async function create_team_name_away_fixture_dict(){

    let response = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${CHOSEN_GAMEWEEK}`)
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
    
     // if url is points then get gameweek from url
     // if pick team then use api to get chosen gameweek

     // get chosen gameweek
     find_chosen_gameweek(bootstrapResponse);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     create_team_name_away_fixture_dict();

     // Swap kits if needed after element discovered
     waitForElement().then(()=>{
        swapKits();
     })

     // add event listeners to run main function if user clicks on (my-page, points)
     

    } catch (err){
        console.log(err);
    }
}

main();
