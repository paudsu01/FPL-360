// Variable declaration

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
// Type of url : "transfers", "my-team" and "event"
var URL_CODE = '';
// window.location.href value when content-script is loaded
var CURRENT_URL = window.location.href;
// API response from "https://fantasy.premierleague.com/api/bootstrap-static/"
var BOOTSTRAP_RESPONSE;

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

    let all_gameweeks = all_info_dict["events"];
    for (let gameweek of all_gameweeks){
        if (gameweek["is_current"] === true){
            CHOSEN_GAMEWEEK = gameweek["id"];
            break;
        }
    }

    // check url
    let url = window.location.href;
    if (url.endsWith("my-team")){
        URL_CODE = "my-team"
        CHOSEN_GAMEWEEK += 1;
    } else if (url.endsWith("transfers")){
        CHOSEN_GAMEWEEK += 1;
        URL_CODE = "transfers"
    } else {
        URL_CODE = "event";
        let url_pieces = url.split('/');
        CHOSEN_GAMEWEEK = url_pieces[url_pieces.length-1];
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

function check_if_url_is_a_valid_link(){

    let url = window.location.href;
    let my_team_re = new RegExp("^https?://fantasy\.premierleague\.com/my-team$")
    let transfer_re = new RegExp("^https?://fantasy\.premierleague\.com/transfers$")
    let event_re = new RegExp("^https?://fantasy\.premierleague\.com/entry/[0-9]*/event/[0-9]{1,2}$");

    if (my_team_re.test(url) || transfer_re.test(url) || event_re.test(url)){
        return true;
    }
    // all other links are invalid ( no need to inject content-scripts into them)
    return false;

}
function setup_mutation_listener_for_url_change(){

  const config = { attributes: false, childList: true, subtree: true }

  const observer = new MutationObserver(()=>{
    if (window.location.href != CURRENT_URL){

        CURRENT_URL = window.location.href;
        main();

    }
  })

  observer.observe(document.body, config)

}
async function initContentScript(){
 
    try {
    let [awayResponse, bootstrapResponse] = await Promise.all([
        // link to get team name and away jersey link
        fetch("https://paudsu01.github.io/FPL-360/extension/FPL-AWAY.json"),
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/")

            ])
     TEAM_JERSEY_LINK_DICT = await awayResponse.json();
     BOOTSTRAP_RESPONSE = await bootstrapResponse.json();
     
     // run the main function to inject content script 
     main();

    } catch (err){
        console.log(err);
    }
}

function main(){

    // return if not proper entry url
    is_a_proper_link = check_if_url_is_a_valid_link()
    if (!is_a_proper_link){
        console.log("no need to inject");
        return;
    }

    console.log("need to inject yes");
     // make a dict of team id to team code and 
     // a dict that maps from team name to team code
     create_team_name_id_code_dict(BOOTSTRAP_RESPONSE);
    
     // if url is points then get gameweek from url
     // if pick team then use api to get chosen gameweek

     // get chosen gameweek
     find_chosen_gameweek(BOOTSTRAP_RESPONSE);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     create_team_name_away_fixture_dict();

     // Swap kits if needed after element discovered
     waitForElement().then(()=>{
        swapKits();
     })

     // add event listeners to run main function if user clicks on (my-page, points)
    }

// add mutation listener to run this function again if the route changes
// This is necessary because content-script won't get loaded again as websites like this
// use Javascript frameworks and Ajax calls to only update parts of the existing webpage content as the user navigates around the site
window.onload = setup_mutation_listener_for_url_change;
initContentScript();
