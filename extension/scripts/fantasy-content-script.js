// Variable declaration
// API response from "https://fantasy.premierleague.com/api/fixtures
var ALL_FIXTURES;
// User's team id
var USER_ID;
// User's team data (not used at the moment, but stored in case it will be necessary for future uses)
var USER_DATA ={};
// observer for pitch changes
var pitch_observer;
// observer for changes in sidebar in transfers page
var bench_observer;

// Functions

/*
    Returns the next five GWS for a team

    `TEAM_ID_TO_NEXT_FIVE_GWS` is mapping from teamID -> an array of length 5
    Each of these arrays contains 5 additional arrays, one for each GW in order
    Each GW array basically contains elements of type: {team, at_home, fdr}

    e.g. if ARS is facing against BUR(burnley), an easy opponent, at Arsenal's home,
    then the element will be {team: "BUR", at_home: true, fdr: 1}
*/
function get_next_five_gws(teamID, start){
    // start is inclusive, teamdID is int
   // inclusive as well
   let end = Math.min(start+4, 38)

   // cache return
   if (teamID in TEAM_ID_TO_NEXT_FIVE_GWS) return TEAM_ID_TO_NEXT_FIVE_GWS[teamID];

   // otherwise create the mapping one time and reuse it
   // The code below will/should only run once.
   Object.keys(ID_TEAM_DICT).forEach(teamID => {
    TEAM_ID_TO_NEXT_FIVE_GWS[teamID] = [[], [], [], [], []]
   })

   // Go through each fixture
   for (let fixture of ALL_FIXTURES){
    if (!fixture.event) continue; // Skip games with no assigned Gameweek

    let fixture_gw = Number(fixture.event);
    // only handle it if it is in the required range i.e. (start <= GW <= end)
    if (fixture_gw >= start && fixture_gw <= end) {
        let home_team_id = fixture["team_h"];
        let away_team_id = fixture["team_a"];

        // short name for team. e.g MUN, WOL
        let home_team_sname = ID_TEAM_DICT[home_team_id];
        let away_team_sname = ID_TEAM_DICT[away_team_id];

        // int value
        let home_team_fdr = fixture["team_h_difficulty"];
        let away_team_fdr = fixture["team_a_difficulty"];

        TEAM_ID_TO_NEXT_FIVE_GWS[home_team_id][fixture_gw - start].push({
            team: away_team_sname,
            at_home: true,
            fdr: home_team_fdr
        })
        TEAM_ID_TO_NEXT_FIVE_GWS[away_team_id][fixture_gw - start].push({
            team: home_team_sname,
            at_home: false,
            fdr: away_team_fdr
        })
    }
   }
    return TEAM_ID_TO_NEXT_FIVE_GWS[teamID];
}

function create_next_few_fixtures_div_element(teamID){
    /* The fixtures div element looks like this: 
      <div class="fpl-fixtures">
      
          <div class="fpl-gw-col">
              <div class="fpl-dot" style="background:#01fc7a" data-tip="GW 29: WHU (A)"></div>
          </div>

         <div class="fpl-gw-col">
           <div class="fpl-dot" style="background:#e7e7e7" data-tip="GW 30: LIV (H)"></div>
           <div class="fpl-dot" style="background:#ff1751" data-tip="GW 30: BRE (A)"></div>
         </div>

         <div class="fpl-gw-col">
           <div class="fpl-dot" style="background:#01fc7a" data-tip="GW 31: CRY (H)"></div>
         </div>
       </div>
    */

   // Each dot is a circle that represents a fixture
   let create_fpl_fixture_dot_element = (text, background_color) => {
        let div = document.createElement("div");
        div.setAttribute("class", "fpl-dot");
        div.setAttribute("data-tip", text);
        div.setAttribute("style", `background: ${background_color}`);
        return div;
   }

   let start = CHOSEN_GAMEWEEK;
   let end = Math.min(CHOSEN_GAMEWEEK+3, 38)

   // `next_five_gws` is an array of length 5. Each element represents a GW
   // Index 0 represents the next GW (CHOSEN_GAMEWEEK)
   // Each GW is an array of elements of type: {team, at_home, fdr}
   var next_five_gws = get_next_five_gws(teamID, start);
    
   var MAIN_DIV_ELEMENT = document.createElement("div");
   MAIN_DIV_ELEMENT.setAttribute("class", "fpl-fixtures");

   // Loop over each gameweek
   while (start <= end){

    // Create a GW column div
    let secondary_div = document.createElement("div");
    secondary_div.setAttribute("class", "fpl-gw-col");
    
    // If Blank gameweek
    if (next_five_gws[start - CHOSEN_GAMEWEEK].length == 0) {
        let fpl_fixture_dot = create_fpl_fixture_dot_element(`GW ${start}: Blank`, "black");
        secondary_div.appendChild(fpl_fixture_dot);

    } else {
            for (let each_fixture of next_five_gws[start - CHOSEN_GAMEWEEK]){
                    let location = (each_fixture.at_home) ? "H" : "A";
                    let background_color = FDR_TO_COLOR_CODE[each_fixture.fdr][0];
                    let fpl_fixture_dot = create_fpl_fixture_dot_element(
                        `GW ${start}: ${each_fixture.team} (${location})`, // text
                        background_color // background color
                    );

                    secondary_div.appendChild(fpl_fixture_dot);
            }
    }
    MAIN_DIV_ELEMENT.appendChild(secondary_div);
    start ++;
   }

   return MAIN_DIV_ELEMENT;
}

async function modify_DOM_for_sidebar(){

    await waitForElement(document.body, "table[aria-label]");

    // The player's are divided into their position and 
    // each position has a table of it's own where player info is present inside each tr tag
    let all_tables = document.querySelectorAll("table[aria-label]");
    for (let table of all_tables){
        // the tr element for all players is inside the tbody of each table
        let all_tr_elements = table.querySelector("tbody").querySelectorAll("tr");

        // Each tr element is for one player
        for (let tr_element of all_tr_elements){
            let tds = tr_element.querySelectorAll("td");
            // The 1st(0st index) td is what we are looking for (to add image and fixtures)
            let main_td = tds[0];
            // The 2nd td is the one for price (net-transfers)
            let price_td = tds[1];

            /* 
                <picture>...</picture>
                <div> # Info div
                    <span>Kelleher</span>
                    <span>
                        <span>Brentford</span>
                        <span>GKP</span>
                    </span>
                </div>
            */
            let picture_element = main_td.querySelector("picture");
            let info_div = picture_element.nextElementSibling;
            let team_name = info_div.lastElementChild.querySelector("span").innerText;
            let team_short_name = TEAM_NAME_TO_SHORT_NAME_DICT[team_name];
            let player_web_name = info_div.querySelector("span").innerText;

            // avoid goalies for jersey swap. Goalie's table has aria-label="Goalkeepers"
            if ((!(ALL_SETTINGS["away-home-jersey"] == false)) && table.getAttribute("aria-label").toLowerCase() !== "goalkeepers"){

                // Change img attribute to swap for away jersey as necessary
                let away_jersey_needed = team_short_name in TEAM_AWAY_DICT && TEAM_AWAY_DICT[team_short_name] === true;
                modify_src_attributes(away_jersey_needed, picture_element, team_short_name);
            }

            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){
                // create div for upcoming fixtures
                let old_fixtures_div = info_div.querySelector(".fpl-fixtures");
                if (old_fixtures_div) old_fixtures_div.remove();

                let fixtures_div = create_next_few_fixtures_div_element(TEAM_ID_DICT[team_short_name]);
                info_div.appendChild(fixtures_div);
            }

            if (!(ALL_SETTINGS['net-transfers'] == false)){
                // create div for upcoming fixtures
                let old_net_transfers_info = price_td.querySelector(".net-transfers-info");
                if (old_net_transfers_info) old_net_transfers_info.remove();

                let player_id = get_player_id(player_web_name, TEAM_ID_DICT[team_short_name]);
                let element = create_net_transfers_element(player_id, position="relative");
                element.style.fontSize = "large";
                element.style.marginLeft = "8px";
                price_td.appendChild(element);
            }
        }
    }
}

async function modifyDOM(modifySidebar=true){

    let pitchElement = document.querySelector('[data-sponsor="default"]');
    // the player jersey boxes in the website are inside button tags
    // should be 15 players in a team
    let all_buttons = pitchElement.querySelectorAll("button[data-pitch-element='true']")
    console.assert(all_buttons.length == 15, "DOM injection error: More than 15 buttons(players) found");

    // First goalie index is always 0; second goalie index is 1 for "transfers" page, 10 for the rest("my-team" and "event")
    let secondGoalieValue = (URL_CODE == "transfers") ? 1 : 11;

   // loop over each button. Each button is associated with a player in the team.
   for (let currentIndex=0; currentIndex < all_buttons.length; currentIndex += 1){

        let playerElement = all_buttons[currentIndex];
        let pictureElement = playerElement.querySelector("picture");

        // Skip when a player is removed and there is no jersey there to know which the player is in transfers page
        if (URL_CODE == "transfers" && pictureElement === null) continue;
        if (pictureElement === null) throw new Error("No img element found in pitch");

        let imgElement = pictureElement.querySelector("img");
        let teamName = imgElement.getAttribute("alt");
        let team_short_name = TEAM_NAME_TO_SHORT_NAME_DICT[teamName];

        /* AWAY JERSEY */
        if (!(ALL_SETTINGS["away-home-jersey"] == false)){
            // no away jersey for goalies unfortunately :(
            if (currentIndex != secondGoalieValue && currentIndex != 0) {

                let away_jersey_needed = team_short_name in TEAM_AWAY_DICT && TEAM_AWAY_DICT[team_short_name] === true;
                modify_src_attributes(away_jersey_needed, pictureElement, team_short_name);
            }
        }

        if (URL_CODE == 'my-team' || URL_CODE == 'transfers'){
        
            const show_next_few_fixtures = ALL_SETTINGS["next-few-fixtures"] == true;
            const show_expected_points = ALL_SETTINGS["expected-points"] == true;

            const fixture_bar_element = playerElement.querySelector('div[data-fixture-bar="true"]');
            // player name span element is before the fixture bar div element
            //  e.g
            //      Raya
            //      BRE(A)
            const player_web_name = fixture_bar_element.parentElement.querySelector("span").innerText;
            const player_id = get_player_id(player_web_name, TEAM_ID_DICT[team_short_name]);

            /* FPL ADDON FOR FIXTURES AND xP */
            if (show_next_few_fixtures || show_expected_points){
                try {
                    // delete if exists since we will create the same element again
                    playerElement.removeChild(playerElement.querySelector(".fpl-addon-container"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }

                // This addon container is where we will add the divs for fixtures and expected-points
                let addon_container_div = document.createElement("div");
                addon_container_div.setAttribute("class", "fpl-addon-container");

                if (show_expected_points){
                    //  create div for expected points
                    let expected_points = PLAYER_ID_TO_DATA[player_id]["ep_next"];
                    let expected_points_div = create_expected_points_div(expected_points);
                    addon_container_div.appendChild(expected_points_div);
                }
                if (show_next_few_fixtures){
                    // create div for upcoming fixtures
                    var fixtures_div = create_next_few_fixtures_div_element(TEAM_ID_DICT[team_short_name]);
                    addon_container_div.appendChild(fixtures_div);

                    // change attribute to justify-content:right if no expected points div to show
                    if (!show_expected_points) addon_container_div.style.justifyContent = "right";
                }

                // add the addon container div to the parent of the fixture div
                fixture_bar_element.parentElement.appendChild(addon_container_div);
            }

            if (URL_CODE == 'transfers' && ALL_SETTINGS["net-transfers"] == true){

                    // The first span element is the one that contains the price tag
                    let player_value_element = playerElement.querySelector("span");
                    player_value_element.style.fontSize = "small";
                    try {
                        player_value_element.removeChild(player_value_element.querySelector(".net-transfers-info"));}
                    catch (err) {
                        // type error if query selector doesn't return a node
                    }
                    // show net transfers and profit loss data in the element
                    let element = create_net_transfers_element(player_id, position="absolute");
                    player_value_element.appendChild(element);
            }
        }
    }

    // if the user is on the transfers page, then need to add away jersey if necessary and fixtures
    // for the player search sidebar
    // also need to add mutation observer to observe changes
    if (URL_CODE == 'transfers' && modifySidebar){

        await modify_DOM_for_sidebar();
        // setup mutation observer to observe changes in sidebar DOM
        setup_mutation_observer_for_sidebar_changes();
    }

    // loop finished, setup mutation observer
    if (URL_CODE == "transfers" || URL_CODE == 'my-team'){
        setup_mutation_observer_for_pitch_changes();
    }
}

function create_expected_points_div(expected_points){
    /* Here is what the div should look like
        <div class="fpl-xp-box">
            <div class="fpl-xp-header">xP</div>
            <div class="fpl-xp-val">7.0</div>
        </div>
    */

    let main_div = document.createElement("div");
    main_div.setAttribute("class", "fpl-xp-box");

    let first_div = document.createElement("div");
    first_div.setAttribute("class", "fpl-xp-header");
    first_div.innerText = "xP";
    main_div.appendChild(first_div);

    let second_div = document.createElement("div");
    second_div.setAttribute("class", "fpl-xp-val");
    second_div.innerText = expected_points;
    main_div.appendChild(second_div);

    // set background and color based on expected points
    let [background, color] = get_color_for_points(expected_points);
    second_div.style.background = background;
    second_div.style.color = color;

    return main_div;
}

function create_net_transfers_element(playerID, position="absolute"){
    /*
        <span class="net-transfers-info" style="position: absolute; color: green" title="Net transfers: 56,700">
        ‹‹‹
        </span>
    */
    
    let net_transfers_element = document.createElement("span");
    net_transfers_element.classList.add("net-transfers-info");
    net_transfers_element.style.position = position;

    let get_price_change_info_in_arrows = (net_transfers) => {
        // Handle Positive Transfers (and 0)
        if (net_transfers >= 0) {
            if (net_transfers <= 5e3) return "‹";
            if (net_transfers <= 5e4) return "‹‹";
            if (net_transfers <= 1e5) return "‹‹‹";
            return "‹‹‹‹";
        } 
        // Handle Negative Transfers
        else {
            if (net_transfers >= -5e3) return "›";
            if (net_transfers >= -5e4) return "››";
            if (net_transfers >= -1e5) return "›››";
            return "››››";
        }
    }
    
    let player_data = PLAYER_ID_TO_DATA[playerID];
    let net_transfers = player_data.transfers_in_event - player_data.transfers_out_event;
    let color = (net_transfers >= 0) ? "greenyellow" : "red";

    // will show on hover
    net_transfers_element.setAttribute("title", `Net transfers: ${net_transfers.toLocaleString()}`);

    net_transfers_element.innerText = get_price_change_info_in_arrows(net_transfers);
    net_transfers_element.style.color = color;

    return net_transfers_element;
}

function find_chosen_gameweek(bootstrapResponse){

    let all_gameweeks = bootstrapResponse["events"];
    for (let gameweek of all_gameweeks){
        if (gameweek["is_current"] === true){
            CHOSEN_GAMEWEEK = Number(gameweek["id"]);
            break;
        }
    }

    // check url
    let url = trim_url(window.location.href);

    if (url.endsWith("my-team")){
        URL_CODE = "my-team";
        CHOSEN_GAMEWEEK = Math.min(CHOSEN_GAMEWEEK+1, 38);
    } else if (url.endsWith("transfers")){
        CHOSEN_GAMEWEEK = Math.min(CHOSEN_GAMEWEEK+1, 38);
        URL_CODE = "transfers";
    } else {
        URL_CODE = "event";
        let url_pieces = url.split('/');
        CHOSEN_GAMEWEEK = url_pieces[url_pieces.length-1];
    }

}

function update_team_name_away_fixture_dict_and_modify_DOM(){

    // Get fixtures for the `CHOSEN_GAMEWEEK`
    const fixtures = ALL_FIXTURES.filter((obj) => obj.event == CHOSEN_GAMEWEEK);
    create_team_away_dict(fixtures, "finished");

     // Swap kits and modify DOM if needed after element discovered
    waitForElement(document.body, '[data-sponsor="default"]').then(() => {
        modifyDOM();
    })
}

function check_if_url_is_a_valid_link(){

    // "window.location.pathname"
    // returns a string that contains the path and filename of the current URL
    // after the domain name and port, but before any query parameters (?) or hash fragments (#)
    // it includes an initial leading forward slash (/)

    let url = window.location.pathname;
    let my_team_re = new RegExp("^/my-team/?$")
    let transfer_re = new RegExp("^/transfers/?$")
    let event_re = new RegExp("^/entry/[0-9]+/event/[0-9]{1,2}/?$");

    if (my_team_re.test(url) || transfer_re.test(url) || event_re.test(url)){
        return true;
    }
    // all other links are invalid ( no need to inject content-scripts into them)
    return false;
}

function setup_mutation_observer_for_sidebar_changes(){

    bench_observer = new MutationObserver(()=>{
        // only interested if sidebar's DOM modified when in transfers page
         if (trim_url(window.location.href) == CURRENT_URL){
            // disconnect obersver if setup already
            if (bench_observer) bench_observer.disconnect();

            modify_DOM_for_sidebar().then(()=>{
                // setup mutation observer to observe changes in sidebar DOM
                setup_mutation_observer_for_sidebar_changes();
            })
        }
    });

    let config = {attributes:false, childList: true, subtree: true};
    // bench_observer.observe(sidebar, config)
    
}

function setup_mutation_observer_for_url_change(){

  const config = { attributes: false, childList: true, subtree: true }

  const observer = new MutationObserver(()=>{
    if (trim_url(window.location.href) != CURRENT_URL){

        // disconnect pitch oberser since main sets it again
        if (pitch_observer) pitch_observer.disconnect();
        if (bench_observer) bench_observer.disconnect();

        CURRENT_URL = trim_url(window.location.href);
        main();
    }
  })

  observer.observe(document.body, config)

}

async function initContentScript(){

    let all_ids = ["away-home-jersey", "next-few-fixtures", "net-transfers", "expected-points"];
    // if ALL_SETTINGS is empty, then every feature is turned on
    ALL_SETTINGS = await chrome.storage.local.get(all_ids);

    try {
    let [bootstrapResponse, FixturesResponse] = await Promise.all([
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        // Get all fixtures 
        fetch("https://fantasy.premierleague.com/api/fixtures/"),
            ])
    BOOTSTRAP_RESPONSE = await bootstrapResponse.json();
    ALL_FIXTURES = await FixturesResponse.json();

    // make a dict of team id to team code and 
    // a dict that maps from team name to team code
    create_team_name_id_code_dict(BOOTSTRAP_RESPONSE);
    
    // create dict from player web name to id
    create_player_dict();
    
    // We need to access the user's ID using the API call using "https://fantasy.premierleague.com/api/me"
    // However, we cannot fetch this from the content-script itself. So, we inject js code to the DOM to do this
    // Look at inject.js for more details

    // Add a listener which collects the user ID
    window.addEventListener("message", (message)=>{
        // make sure it is correct data type from `inject.js`
        if (message.data.type == 'FPL_ME'){
            USER_ID = message.data.user_id;
            USER_DATA = message.data.user_data;
            main();
        }
    })
    // inject script that fetches the user id and sends us the message using `postMessage`
    // Look at `inject.js`
    injectJSFileToDOM("scripts/inject.js")

    } catch (err){
        console.log(err);
    }
}

function mutation_observer_callback_pitch_changes(){

    if (trim_url(window.location.href) != CURRENT_URL) return;
    pitch_observer.disconnect();
    // Swap kits if needed after element discovered
    waitForElement(document.body, '[data-sponsor="default"]').then(()=>{
        modifyDOM(false);
    })
}

function setup_mutation_observer_for_pitch_changes(){

    // setup observer to run modifyDOM function if player performs actions that modify the DOM inside the "[data-testid='pitch']" div element
    // These actions could be brining a substitue player to the starting lineup for example
    const callback = debounce(mutation_observer_callback_pitch_changes, 100);
    pitch_observer = new MutationObserver(callback);

    let pitchElement = document.querySelector('[data-sponsor="default"]');
    // Options for the observer (which mutations to observe)
    let config = { childList: true, subtree: true, attributes: true};
    pitch_observer.observe(pitchElement, config)
}

async function main(){

    // return if not proper entry url
    is_a_proper_link = check_if_url_is_a_valid_link()
    if (!is_a_proper_link){
        return;
    }
    
     // if url is points then get gameweek from url
     // if pick team then use api to get chosen gameweek

     // get chosen gameweek -> stores in CHOSEN_GAMEWEEEK variable
     find_chosen_gameweek(BOOTSTRAP_RESPONSE);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     // and call the modifyDOM function after done ( The modifyDOM function is inside this function since the function is async and 
     // we need the fixture dict ready before we swap kits)
     if (!(ALL_SETTINGS["away-home-jersey"] == false)){
        update_team_name_away_fixture_dict_and_modify_DOM();
     } else {
        // Swap kits if needed after element discovered
        await waitForElement(document.body, '[data-sponsor="default"]');
        modifyDOM();
    }
}

// add mutation listener to run the main function again if the route changes
// This is necessary because content-script won't get loaded again as websites like this
// use Javascript frameworks and Ajax calls to only update parts of the existing webpage content as the user navigates around the site
initContentScript();
window.onload = setup_mutation_observer_for_url_change;