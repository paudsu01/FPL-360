// Variable declaration
// API response from "https://fantasy.premierleague.com/api/fixtures
var ALL_FIXTURES;
// User's team id
var USER_ID;
// User's team data
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

function create_next_few_fixtures_div_element(teamID, colorOnly = false){

    // function to set background color and text for each fixture div
    // fixture_info : ["TEAM", "H/A", FDR]
    let set_background_and_text_for_fixtures = (fixture_info, element)=>{
                        let home_away = (fixture_info.at_home) ? "H" : "A";
                        element.innerText += `${fixture_info.team} (${home_away})`
                        element.style = `background : ${FDR_TO_COLOR_CODE[fixture_info.fdr][0]}; color: ${FDR_TO_COLOR_CODE[fixture_info.fdr][1]}; padding: 2px; border: 0.5px solid black; align-items:center;display:flex`
                    }

    let set_background_and_append_div = (parent_div, color, fixture_info)=>{
        let third_div = document.createElement("div");
        third_div.style = `width: 15px; height: 15px; border-radius: 50%; background: ${color};margin: 2px auto;`
        third_div.classList.add("fixture-color-div");

        // add tooltip to div
        let home_away = (fixture_info.at_home) ? "H" : "A";
        let span = document.createElement("span");
        span.classList.add("fixture-info");
        if (fixture_info){
            span.style = `background : ${FDR_TO_COLOR_CODE[fixture_info.fdr][0]}; color: ${FDR_TO_COLOR_CODE[fixture_info.fdr][1]}; padding: 2px; border: 0.5px solid black`
            span.innerText = `${fixture_info.team} (${home_away})`
        } else {
            span.innerText = "Blank";
            span.style = "background : black; color: white; padding: 2px; border: 0.5px solid black";
        }
        third_div.appendChild(span);
        parent_div.appendChild(third_div);
    }

   let start = CHOSEN_GAMEWEEK;
   let increment = (colorOnly) ? 4 : 3
   let end = Math.min(CHOSEN_GAMEWEEK+increment, 38)

   // `next_five_gws` is an array of length 5. Each element represents a GW
   // Index 0 represents the next GW (CHOSEN_GAMEWEEK)
   // Each GW is an array of elements of type: {team, at_home, fdr}
   var next_five_gws = get_next_five_gws(teamID, start);
    
   var MAIN_DIV_ELEMENT = document.createElement("div");
   MAIN_DIV_ELEMENT.setAttribute("class", "upcoming-fixtures")
   // Hide if any secondary divs overflow
   if (!colorOnly) {
        MAIN_DIV_ELEMENT.setAttribute("style",
            `display: grid; overflow: hidden; grid-template-columns: repeat(4, 1fr); font-size: 9px`)
   } else {
        MAIN_DIV_ELEMENT.setAttribute("style",
            `display: flex; box-sizing: border-box;`)
   }
    

   while (start <= end){

    let secondary_div = document.createElement("div");

    if (colorOnly){
        secondary_div.setAttribute("style",
            "display: inline-block; flex: 1");
    } else {
        secondary_div.setAttribute("style",
            "display: grid; overflow: hidden; grid-template-columns: repeat(1, 1fr)");
    }

    if (next_five_gws[start - CHOSEN_GAMEWEEK].length == 0) {

        if (!colorOnly){
            // set background to the grey for blank fixture
            secondary_div.style = `background: rgb(231, 231, 231); border: 0.5px solid black`;
        } else {
            // if color only: then create a new div element and insert with color black
            set_background_and_append_div(secondary_div, "black", null);
        }

    } else {
            for (let each_fixture of next_five_gws[start - CHOSEN_GAMEWEEK]){

                if (next_five_gws[start - CHOSEN_GAMEWEEK].length == 1){
                    if (colorOnly){
                        set_background_and_append_div(secondary_div, FDR_TO_COLOR_CODE[each_fixture.fdr][0], each_fixture);
                    } else {
                        set_background_and_text_for_fixtures(each_fixture, secondary_div);
                    }
                } else {
                    if (colorOnly){
                            set_background_and_append_div(secondary_div, FDR_TO_COLOR_CODE[each_fixture.fdr][0], each_fixture);
                    } else {
                        let div_element = document.createElement("div");
                        set_background_and_text_for_fixtures(each_fixture, div_element);
                        secondary_div.append(div_element);
                    }
                }
            }
    }
    MAIN_DIV_ELEMENT.appendChild(secondary_div);
    start ++;
   }

   return MAIN_DIV_ELEMENT;
}

function modify_DOM_for_sidebar(sidebar){

    // The player's are divided into their position and 
    // each position has a table of it's own where player info is present inside each tr tag
    let all_tables = sidebar.querySelectorAll("table");
    for (let table of all_tables){
        // the tr element for all players is inside the tbody of each table
        let all_tr_elements = table.querySelector("tbody").querySelectorAll("tr");

        for (let tr_element of all_tr_elements){
            
            // The 2nd(1st index) td is what we are looking for (for image and other necessary stuff)
            let required_td = tr_element.querySelectorAll("td")[1];
            let teamCode = required_td.querySelector("span").innerText;
            
            // avoid goalies for jersey swap
            if ((!(ALL_SETTINGS["away-home-jersey"] == false)) && required_td.querySelectorAll("span")[1].innerText !== "GKP"){

                // Change img attribute to swap for away jersey as necessary
                // TODO
                modify_src_attributes(TEAM_AWAY_DICT[teamCode], required_td.querySelector("source"), required_td.querySelector("img"), teamCode);

            }

            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){

                let fixtures_div = required_td.querySelector(".upcoming-fixtures");
                if (fixtures_div) fixtures_div.remove();

                fixtures_div = create_next_few_fixtures_div_element(TEAM_ID_DICT[teamCode], true);
                // inject the next five fixtures
                required_td.appendChild(fixtures_div);

            }

            try {
                tr_element.querySelector(".net-transfers-info").remove();
            } catch (error) {
            }
            // inject the net transfers arrow
            let name_div = required_td.querySelector("[class^='ElementInTable__Name']");

            if (!(ALL_SETTINGS['net-transfers'] == false)){


                let playerID = get_player_id(name_div.innerText, TEAM_ID_DICT[teamCode]);
                let net_transfers_element = create_net_transfers_element(playerID, tooltip="div");
                net_transfers_element.style.fontSize = '12px';
                net_transfers_element.style.float = '';
                required_td.nextSibling.appendChild(net_transfers_element);
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
        if (URL_CODE== "transfers" && pictureElement === undefined) continue;
        if (pictureElement === undefined) throw new Error("No img element found in pitch");

        let imgElement = pictureElement.querySelector("img");
        let teamName = imgElement.getAttribute("alt");
        let team_short_name = TEAM_NAME_TO_SHORT_NAME_DICT[teamName];

        if (!(ALL_SETTINGS["away-home-jersey"] == false)){
            // no away jersey for goalies unfortunately :(
            if (currentIndex != secondGoalieValue && currentIndex != 0) {

                let away_jersey_needed = (team_short_name in TEAM_AWAY_DICT && TEAM_AWAY_DICT[team_short_name] === true) ? true : false;
                modify_src_attributes(away_jersey_needed, pictureElement, team_short_name);
            }
        }
        if (URL_CODE == 'my-team' || URL_CODE == 'transfers'){

            // inject their next 5 fixtures after modifying img attribute
            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){
                try {
                    // delete if exists since we will create the same element again
                    playerElement.removeChild(playerElement.querySelector(".upcoming-fixtures"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                var fixtures_div = create_next_few_fixtures_div_element(TEAM_ID_DICT[team_short_name]);
                // playerElement.appendChild(fixtures_div);
            }

            continue;
        
            var player_web_name = playerElement.querySelector("[class^='PitchElementData__ElementName']").innerText;
            let player_id = get_player_id(player_web_name, TEAM_ID_DICT[team_short_name]);

            if (URL_CODE == 'transfers'){
                // show net transfers data
                let player_value_element = playerElement.querySelector("[class^='PitchElementData__ElementValue']");
                try {
                    player_value_element.removeChild(player_value_element.querySelector(".price-change-info"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                let netTransfersElement = create_net_transfers_and_profit_loss_element(player_id);
                player_value_element.appendChild(netTransfersElement);

            // the url code will now only be my-team so no need to check for that
            }

            if (!(ALL_SETTINGS["expected-points"] == false)){

                try {
                    playerElement.removeChild(playerElement.querySelector(".expected-points-div"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                // get expected points
                let expected_points = PLAYER_ID_TO_DATA[player_id]["ep_next"];
                let expected_points_div = create_expected_points_div(expected_points);
                playerElement.appendChild(expected_points_div);
            }
        }
    }

    // if the user is on the transfers page, then need to add away jersey if necessary and fixtures
    // for the player search sidebar

    // also need to add mutation observer to observe changes
    if (URL_CODE == 'transfers' && modifySidebar){

        // Layout__Secondary
        let sidebar = document.querySelector("[class^='SquadBase__PusherSecondary']");
        modify_DOM_for_sidebar(sidebar);

        // disconnect obersver if setup already
        if (bench_observer) bench_observer.disconnect();
        // setup mutation observer to observe changes in sidebar DOM
        setup_mutation_observer_for_sidebar_changes(sidebar);
    }

    // loop finished, setup mutation observer
    if (URL_CODE == "transfers" || URL_CODE == 'my-team'){
        setup_mutation_observer_for_pitch_changes();
    }
}

function create_expected_points_div(expected_points){

    let main_div = document.createElement("div");
    main_div.classList.add("expected-points-div");
    main_div.style = "display: block"

    let first_div = document.createElement("div");
    first_div.classList.add("expected-points-xp-div");
    first_div.innerText = "xP"

    let second_div = document.createElement("div");
    second_div.classList.add("expected-points-value-div");
    let [background, color] = get_color_for_points(expected_points);
    second_div.style.background = background;
    second_div.style.color = color;
    second_div.innerText = expected_points;

    for (let div of [first_div, second_div]){
        main_div.appendChild(div);
    }
    return main_div;
}
function get_profit_loss(playerID){

    if (!(USER_DATA.picks === undefined)){
        for (let pick of USER_DATA.picks){
            if (pick.element == playerID){
                return (pick.selling_price - pick.purchase_price) / 10
            }
        }
    }
    return 0;
}
function create_profit_loss_element(playerID){

    let profit_loss_element = document.createElement("div");
    profit_loss_element.classList.add("profit-loss-info");
    profit_loss_element.innerText = '(';
    profit_loss_element.style = 'float:left';

    let profit_loss = get_profit_loss(playerID);
    let color = (profit_loss >= 0) ? "green" : "red";
    let triangle = (profit_loss >= 0) ? "▲" : "▼";

    let triangle_element = document.createElement("span");
    triangle_element.style = `color: ${color}`
    triangle_element.innerText = triangle;

    let price_element = document.createElement("span");
    price_element.innerText = profit_loss + ')';

    profit_loss_element.appendChild(triangle_element);
    profit_loss_element.appendChild(price_element);

    return profit_loss_element;

}
function create_net_transfers_element(playerID, tooltip="span"){

    let get_price_change_info_in_arrows = (net_transfers)=>{
        if (Math.abs(net_transfers) <= 5e3) return "‹";
        else if (Math.abs(net_transfers) <= 5e4) return "‹‹";
        else if (Math.abs(net_transfers) <= 1e5) return "‹‹‹";
        else return "‹‹‹‹";
    }

    let net_transfers_element = document.createElement("div");
    net_transfers_element.classList.add("net-transfers-info");
    
    let player_data = PLAYER_ID_TO_DATA[playerID];
    let transfers_in = player_data.transfers_in_event;
    let transfers_out = player_data.transfers_out_event;

    let color = ((transfers_in - transfers_out) >= 0) ? "green" : "red";
    let degree = ((transfers_in - transfers_out) >= 0) ? 90 : -90;
    net_transfers_element.style = `margin-left:2px;display: inline-block; rotate:${degree}deg; font-size:7px; margin-top:2px; float:left; letter-spacing:-1px; color:${color}`;

    let price_change_info = get_price_change_info_in_arrows(transfers_in-transfers_out);
    net_transfers_element.innerText = price_change_info

    // add tooltip
    color = ((transfers_in - transfers_out) >= 0) ? "rgb(1, 252, 122)" : "red";
    let tooltip_element = document.createElement(tooltip);
    tooltip_element.classList.add("net-transfers-info-tooltip");
        tooltip_element.style = `letter-spacing: normal;background : ${color}; color: ${(color == 'red') ? "white" : "black"}; padding: 2px; border: 0.5px solid black; rotate:${-degree}deg`
        if (tooltip == "div") {
            tooltip_element.style.width='120px'
            tooltip_element.style.marginLeft='-40px';
        }
        tooltip_element.innerText = `Net transfers: ${transfers_in - transfers_out}`;
    net_transfers_element.appendChild(tooltip_element);

    return net_transfers_element;

}
function create_net_transfers_and_profit_loss_element(playerID){
    
    let MAIN_DIV_ELEMENT = document.createElement("div");
    MAIN_DIV_ELEMENT.classList.add("price-change-info");
    MAIN_DIV_ELEMENT.style = 'display: inline-block; font-size:smaller;';

    if (!(ALL_SETTINGS["profit-loss"] == false)){
        var profit_loss_element = create_profit_loss_element(playerID);
        MAIN_DIV_ELEMENT.appendChild(profit_loss_element);
    }
    if (!(ALL_SETTINGS["net-transfers"] == false)){
        let net_transfers_element = create_net_transfers_element(playerID);
        MAIN_DIV_ELEMENT.appendChild(net_transfers_element);
    }
    return MAIN_DIV_ELEMENT;
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

function setup_mutation_observer_for_sidebar_changes(sidebar){

    bench_observer = new MutationObserver(()=>{
        // only interested if sidebar's DOM modified when in transfers page
         if (trim_url(window.location.href) == CURRENT_URL){
            let sidebar = document.querySelector("[class^='SquadBase__PusherSecondary']");
            modify_DOM_for_sidebar(sidebar);

            // disconnect obersver if setup already
            if (bench_observer) bench_observer.disconnect();
            // setup mutation observer to observe changes in sidebar DOM
            setup_mutation_observer_for_sidebar_changes(sidebar);
        }
    });

    let config = {attributes:false, childList: true, subtree: true};
    bench_observer.observe(sidebar, config)
    
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

    let all_ids = ["away-home-jersey", "next-few-fixtures", "profit-loss", "net-transfers", "expected-points"];
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
    
    if (ALL_SETTINGS["profit-loss"] == false){
        main()
    } else{

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
    }

    } catch (err){
        console.log(err);
    }
}

function setup_mutation_observer_for_pitch_changes(){

    // setup observer to run modifyDOM function if player performs actions that modify the DOM inside the "[data-testid='pitch']" div element
    // These actions could be brining a substitue player to the starting lineup for example
    pitch_observer = new MutationObserver(()=>{
        // another observer callback handles route changes
        if (trim_url(window.location.href) != CURRENT_URL) return;
        pitch_observer.disconnect();
        // Swap kits if needed after element discovered
        waitForElement(document.body, "[data-testid='pitch']").then(()=>{
            modifyDOM(false);
        })
    });

    let pitchElement = document.querySelector("[data-testid='pitch']");
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