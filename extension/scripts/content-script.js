// Variable declaration

var ALL_SETTINGS = {};
// chosen gameweek 
var CHOSEN_GAMEWEEK=-1;
// Team id to name(teamn code e.g ARS for arsenal)
var ID_TEAM_DICT={};
// Team name code to fpl id
var TEAM_ID_DICT={};
// Team code to true if away fixture in current gameweek else false
var TEAM_AWAY_DICT={};
// Team code to link for home and away jersey
var TEAM_JERSEY_LINK_DICT={};
// Team name to team code
var TEAM_NAME_TO_CODE_DICT={};
// Team code to next 5 fixtures
var TEAM_ID_TO_NEXT_FIVE_FIXTURES={};
// player webname to player id mapping
// the value is going to be a list since different id players can have the same web name
var PLAYER_WEB_NAME_TO_ID = {};
// player id to player data dict
var PLAYER_ID_TO_DATA = {};
// Type of url : "transfers", "my-team" and "event"
var URL_CODE = '';
// window.location.href value when content-script is loaded
var CURRENT_URL = trim_url(window.location.href);
// API response from "https://fantasy.premierleague.com/api/bootstrap-static/"
var BOOTSTRAP_RESPONSE;
// API response from "https://fantasy.premierleague.com/api/fixtures?future=1
var ALL_FUTURE_FIXTURES;
// API response from "https://fantasy.premierleague.com/api/fixtures?future=0
var ALL_PAST_FIXTURES;
// store response from https://fantasy.premierleague.com/api/event/${GW}/live/
// in one object, with the gameweeks as keys as the api response as values
var LAST_FEW_EVENTS_DATA ={};
var LAST_GAMEWEEK_WITH_DATA = null;
var CURRENT_SEASON;
// User's team id
var USER_ID;
// User's team data
var USER_DATA;
// Fixture difficulty rating to color code
var FDR_TO_COLOR_CODE={
    1: ["rgb(55, 85, 35)", "black"],
    2: ["rgb(1, 252, 122)", "black"],
    3: ["rgb(231, 231, 231)", "black"],
    4: ["rgb(255, 23, 81)", "white"],
    5: ["rgb(128, 7, 45)", "white"]
}
// observer for pitch changes
var pitch_observer;
// observer for changes in sidebar in transfers page
var bench_observer;

// Functions

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
// trim url to remove query parameters and hashtags from end of url while also
function trim_url(link){

    let url = link.split('?')[0].split('#')[0];
    if (url[url.length -1] == '/') url = url.slice(0, url.length-1);
    return url;
}

function get_user_id(href){

    let split_values = href.split('/');
    return Number(split_values[split_values.length-3]);
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
function get_increment_second_goalie_indexes(){
    if (URL_CODE == "event"){
        return [0, 2, 22]
    } else if (URL_CODE == "my-team"){
        return [0, 3, 33]  
    } else {
        return [0, 3, 3]
    }
}

async function check_if_away_jersey_needed(playerButtonElement, teamCode){

        let awayJerseyNeeded = false;

        if (URL_CODE == 'event' || URL_CODE == 'transfers'){
            if (teamCode in TEAM_AWAY_DICT && TEAM_AWAY_DICT[teamCode] === true){
                // Modify attributes to handle re-sizing of the window for these images
                awayJerseyNeeded = true;
            }
        } else {

            // element might take time to load
            await waitForElement(playerButtonElement, "span")

            // only pick first team if double gameweek
            let oppositionTeam = playerButtonElement.querySelector("span").innerText.split(',')[0];
            let pattern = new RegExp(/\([HA]\)/);
            let matches = oppositionTeam.match(pattern);
            if (matches && matches[0] == '(A)'){
                awayJerseyNeeded = true;
            }
        }

        return awayJerseyNeeded

}
function create_next_five_fixtures_object(teamID, start){

   let end = Math.min(start+4, 38)

   if (teamID in TEAM_ID_TO_NEXT_FIVE_FIXTURES) return TEAM_ID_TO_NEXT_FIVE_FIXTURES[teamID];

   let fixtures_object = {};

   while (start <= end){
    fixtures_object[start] = []
    start ++;
   }

   // go through all remaining fixtures and break if we find event "end + 1"
   for (let fixture of ALL_FUTURE_FIXTURES){

        if (fixture["team_h"] == teamID || fixture["team_a"] == teamID){

            if (Number(fixture.event) > end) break;

            let home_away = (fixture["team_h"] == teamID) ? "H" : "A"
            let team = (fixture["team_h"] == teamID) ? ID_TEAM_DICT[fixture["team_a"]] : ID_TEAM_DICT[fixture["team_h"]];
            let fdr = (fixture["team_h"] == teamID) ? fixture["team_h_difficulty"] : fixture["team_a_difficulty"];
            fixtures_object[fixture["event"]].push([team, home_away, fdr])

        }
    }
    // save for next use 
    TEAM_ID_TO_NEXT_FIVE_FIXTURES[teamID] = fixtures_object;

    return fixtures_object;
}

function create_next_five_fixtures_div_element(teamID, colorOnly = false){

    // function to set background color and text for each fixture div
    let set_background_and_text_for_fixtures = (fixture_list, element)=>{
                        element.innerText += `${fixture_list[0]} (${fixture_list[1]})`
                        element.style = `background : ${FDR_TO_COLOR_CODE[fixture_list[2]][0]}; color: ${FDR_TO_COLOR_CODE[fixture_list[2]][1]}; padding: 2px; border: 0.5px solid black`
                    }

    let set_background_and_append_div = (parent_div, color, fixture_info)=>{
        let third_div = document.createElement("div");
        third_div.style = `width: 15px; height: 15px; border-radius: 50%; background: ${color};margin: 2px auto;`
        third_div.classList.add("fixture-color-div");

        // add tooltip to div
        let span = document.createElement("span");
        span.classList.add("fixture-info");
        if (fixture_info){
            span.style = `background : ${FDR_TO_COLOR_CODE[fixture_info[2]][0]}; color: ${FDR_TO_COLOR_CODE[fixture_info[2]][1]}; padding: 2px; border: 0.5px solid black`
            span.innerText = `${fixture_info[0]} (${fixture_info[1]})`
        } else {
            span.innerText = (fixture_info == null) ? "Blank" : `${fixture_info[0]} (${fixture_info[1]})`
            span.style = "background : black; color: white; padding: 2px; border: 0.5px solid black";

        }
        third_div.appendChild(span);
        parent_div.appendChild(third_div);
    }
   // the fixtures object will be of the type:
   // {24 : [["TEAM", "H", FDR]],
   // 25 : [["TEAM", "A", FDR], ["TEAM", "H", FDR]], (double gameweek)
   // 26 : [], (blank gameweek)
   // ....
    //}
   let start= CHOSEN_GAMEWEEK;
   let increment = (colorOnly) ? 4 : 3
   let end = Math.min(CHOSEN_GAMEWEEK+increment, 38)

   var fixtures_object = create_next_five_fixtures_object(teamID, start);
    
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

    if (fixtures_object[start].length == 0) {

        if (!colorOnly){
            secondary_div.innerText = '-';
            // set background to the grey for blank fixture
            secondary_div.style = `background: rgb(231, 231, 231); border: 0.5px solid black`;
        } else {
            // if color only: then create a new div element and insert with color black
            set_background_and_append_div(secondary_div, "black", null);
        }

    } else {
            for (let each_fixture of fixtures_object[start]){

                if (fixtures_object[start].length == 1){
                    if (colorOnly){
                        set_background_and_append_div(secondary_div, FDR_TO_COLOR_CODE[each_fixture[2]][0], each_fixture);
                    } else {
                        set_background_and_text_for_fixtures(each_fixture, secondary_div);
                    }
                } else {
                    if (colorOnly){
                            set_background_and_append_div(secondary_div, FDR_TO_COLOR_CODE[each_fixture[2]][0], each_fixture);
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

function modify_DOM_for_sidebar(){

    const SIDEBAR = document.querySelector("[class^='SquadBase__PusherSecondary']");
    // The player's are divided into their position and 
    // each position has a table of it's own where player info is present inside each tr tag
    let all_tables = SIDEBAR.querySelectorAll("table");
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
                modify_src_attributes(TEAM_AWAY_DICT[teamCode], required_td.querySelector("source"), required_td.querySelector("img"), teamCode);

            }

            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){

                let fixtures_div = required_td.querySelector(".upcoming-fixtures");
                if (fixtures_div) fixtures_div.remove();

                fixtures_div = create_next_five_fixtures_div_element(TEAM_ID_DICT[teamCode], true);
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

    // disconnect obersver if setup already
    if (bench_observer) bench_observer.disconnect();
    // setup mutation observer to observe changes in sidebar DOM
    setup_mutation_observer_for_sidebar_changes(SIDEBAR);
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

async function modifyDOM(modifySidebar=true){

    let pitchElement = document.querySelector("[data-testid='pitch']");
    // the player jersey boxes in the website are inside button tags
    let all_buttons = pitchElement.querySelectorAll("button");


    // for points page:  30 button tags : 2 for each player
    // for transfers and my-team page:  45 button tags : 3 for each player
    // Skip goalkeeper buttons(indexes 0 and 1 for points, 0-2 for the rest)
    let [startValue, incrementValue, secondGoalieValue] = get_increment_second_goalie_indexes();

    // Necessary to avoid unnecessary between button tags including buttons for second goalie
    // loop over buttons with index 2,4,... for points page
    // loop over buttons with index 3,6,... for transfers, my-team page
   for (let currentIndex=startValue; currentIndex < all_buttons.length; currentIndex += incrementValue){

        let playerElement = all_buttons[currentIndex];
        let imgElement = playerElement.querySelector("img");
        let teamName = imgElement.getAttribute("alt");
        let teamCode = TEAM_NAME_TO_CODE_DICT[teamName];

        try {
            if (!(ALL_SETTINGS["away-home-jersey"] == false)){
                // index 22 is for the bench goalie
                if (currentIndex != secondGoalieValue && currentIndex != startValue) {

                    let sourceElement= playerElement.querySelector("source");

                    let away_jersey_needed = await check_if_away_jersey_needed(all_buttons[currentIndex], teamCode)

                    modify_src_attributes(away_jersey_needed, sourceElement, imgElement, teamCode);
                }
            }

        } catch (err){
            // error when no a player removed and jo jersey there to know which the player is
        }

        if (URL_CODE == 'my-team' || URL_CODE == 'transfers'){

            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){
                // inject their next 5 fixtures after modifying img attribute if "my-team" page
                try {
                    playerElement.removeChild(playerElement.querySelector(".upcoming-fixtures"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                var fixtures_div = create_next_five_fixtures_div_element(TEAM_ID_DICT[teamCode]);
                playerElement.appendChild(fixtures_div);
            }
        
            var player_web_name = playerElement.querySelector("[class^='PitchElementData__ElementName']").innerText;
            if (!(ALL_SETTINGS["last-few-gw"] == false)){
                // inject their past 5 fixtures data after (Last few gameweeks points)
                try {
                    playerElement.removeChild(playerElement.querySelector(".past-fixtures"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                let player_id = get_player_id(player_web_name, TEAM_ID_DICT[teamCode]);
                var past_fixtures_div = create_past_fixtures_div_element(player_id, TEAM_ID_DICT[teamCode]);
                playerElement.appendChild(past_fixtures_div);
            }

            if (URL_CODE == 'transfers'){
                // show net transfers data
                let player_value_element = playerElement.querySelector("[class^='PitchElementData__ElementValue']");
                try {
                    player_value_element.removeChild(player_value_element.querySelector(".price-change-info"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                let player_id = get_player_id(player_web_name, TEAM_ID_DICT[teamCode]);
                let netTransfersElement = create_net_transfers_and_profit_loss_element(player_id);
                player_value_element.appendChild(netTransfersElement);
            }
        }

    }

    // if the user is on the transfers page, then need to add away jersey if necessary and fixtures
    // for the player search sidebar

    // also need to add mutation observer to observe changes
    if (URL_CODE == 'transfers' && modifySidebar){
        modify_DOM_for_sidebar();
    }

    // loop finished, setup mutation observer
    if (URL_CODE == "transfers" || URL_CODE == 'my-team'){
        setup_mutation_observer_for_pitch_changes();
    }
}

function get_profit_loss(playerID){

    for (let pick of USER_DATA.picks){
        if (pick.element == playerID){
            return (pick.selling_price - pick.purchase_price) / 10
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

function create_past_fixtures_div_element(playerID, teamID){

    let get_color_for_points = (points)=>{

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

    let MAIN_DIV_ELEMENT = document.createElement("div");
    MAIN_DIV_ELEMENT.classList.add("past-fixtures");
    MAIN_DIV_ELEMENT.setAttribute("style",
            `display: flex; box-sizing: border-box;`)

    if (LAST_GAMEWEEK_WITH_DATA == null) return MAIN_DIV_ELEMENT;

    let end = get_current_gameweek();
    let start = LAST_GAMEWEEK_WITH_DATA;

    while (start <= end){

        let player_event_data = get_player_event_data(start, playerID);
        let stats = player_event_data["stats"];
        let points = stats.total_points;

        // div to show points
        let secondary_div = document.createElement("div");
        secondary_div.classList.add("point-div");
        let [background, color] = get_color_for_points(points);
        secondary_div.style = `width: 17px; height: 17px; color: ${color}; background: ${background} ;margin: 2px auto; font-size: 12px; border: 0.1px solid black`
        secondary_div.innerText = points;

        // span element for tooltip when hovering over the point
        let info = document.createElement("div");
        info.classList.add("point-info");
        info.style = `background : ${background}; color: ${color}; padding: 2px; border: 0.5px solid black`
        // get fixture info : opposition team and home/away info
        let fixture = get_fixture(player_event_data["explain"][0].fixture, teamID)
        // show Gameweek, team, xG, xA
        info.innerText = `GW ${start} ${fixture} xG ${stats.expected_goals} xA ${stats.expected_assists}`
        secondary_div.appendChild(info);
 
        MAIN_DIV_ELEMENT.appendChild(secondary_div);
        start ++;

    }
    return MAIN_DIV_ELEMENT;
}

function get_fixture(fixtureID, teamID){

    for (let each_fixture of ALL_PAST_FIXTURES){
        if (each_fixture.id == fixtureID){
            return (each_fixture.team_h == teamID) ? `${ID_TEAM_DICT[each_fixture.team_a]}(A)` : `${ID_TEAM_DICT[each_fixture.team_h]}(H)`
        }
    }
    return "Blank"
}
function get_player_event_data(gameweek, playerID){

    let all_players = LAST_FEW_EVENTS_DATA[gameweek]["elements"];
    return all_players.find((player)=>{return player.id == playerID});
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
function create_team_name_id_code_dict(all_info_dict){

    let teams = all_info_dict["teams"];
    for (let team of teams){
        ID_TEAM_DICT[team.id] = team["short_name"];
        TEAM_ID_DICT[team.short_name] = team.id;
        TEAM_NAME_TO_CODE_DICT[team.name] = team["short_name"];
    }
}

function get_current_gameweek(){

    let all_gameweeks = BOOTSTRAP_RESPONSE["events"];
    for (let gameweek of all_gameweeks){
        if (gameweek["is_current"] === true){
            return Number(gameweek["id"]);
        }
    }

}
function find_chosen_gameweek(all_info_dict){

    let all_gameweeks = all_info_dict["events"];
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
        CHOSEN_GAMEWEEK += 1;
    } else if (url.endsWith("transfers")){
        CHOSEN_GAMEWEEK += 1;
        URL_CODE = "transfers";
    } else {
        URL_CODE = "event";
        let url_pieces = url.split('/');
        CHOSEN_GAMEWEEK = url_pieces[url_pieces.length-1];
    }

}

async function fetch_team_name_away_fixture_dict_and_modify_DOM(){

    let response = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${CHOSEN_GAMEWEEK}`)
    let fixtures = await response.json();
    TEAM_AWAY_DICT = {};
    for (let fixture of fixtures){
        let home_team = ID_TEAM_DICT[fixture["team_h"]];
        let away_team = ID_TEAM_DICT[fixture["team_a"]];
        if (!(home_team in TEAM_AWAY_DICT)) TEAM_AWAY_DICT[home_team] = false;
        if (!(away_team in TEAM_AWAY_DICT)) TEAM_AWAY_DICT[away_team] = true;
    }
    
     // Swap kits if needed after element discovered
     waitForElement(document.body, "[data-testid='pitch']").then(()=>{
        modifyDOM();
     })
}

function check_if_url_is_a_valid_link(){

    let url = trim_url(window.location.href);
    let my_team_re = new RegExp("^https?://fantasy\.premierleague\.com/my-team/?$")
    let transfer_re = new RegExp("^https?://fantasy\.premierleague\.com/transfers/?$")
    let event_re = new RegExp("^https?://fantasy\.premierleague\.com/entry/[0-9]*/event/[0-9]{1,2}/?$");

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
            modify_DOM_for_sidebar();
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

        // fetch latest team of the user if user navigated to transfers page
        if (CURRENT_URL.endsWith("transfers") && (!(ALL_SETTINGS["profit-loss"] == false))){
            fetch(`https://fantasy.premierleague.com/api/my-team/${USER_ID}/`).then(
                response=>response.json()).then((response)=>{
                    USER_DATA = response;
                    main();
                    })
        } else {
            main();
        }

    }
  })

  observer.observe(document.body, config)

}
async function initContentScript(){
 
    let all_ids = ["away-home-jersey", "next-few-fixtures", "last-few-gw", "profit-loss", "net-transfers", "expected-points"];
    // if ALL_SETTINGS is empty, then every feature is turned on
    ALL_SETTINGS = await chrome.storage.local.get(all_ids);

    try {
    let [awayResponse, bootstrapResponse, FutureFixturesResponse, PastFixturesResponse] = await Promise.all([
        // link to get team name and away jersey link
        fetch("https://paudsu01.github.io/FPL-360/extension/FPL-HOME-AWAY.json"),
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        // Get all future fixtures 
        fetch("https://fantasy.premierleague.com/api/fixtures/?future=1"),
        // Get all past fixtures
        fetch("https://fantasy.premierleague.com/api/fixtures/?future=0"),
            ])
    TEAM_JERSEY_LINK_DICT = await awayResponse.json();
    BOOTSTRAP_RESPONSE = await bootstrapResponse.json();
    ALL_FUTURE_FIXTURES = await FutureFixturesResponse.json();
    ALL_PAST_FIXTURES = await PastFixturesResponse.json();

    if (!(ALL_SETTINGS["last-few-gw"] == false)){

        // fetch the last few events data
        let gameweek_value = get_current_gameweek()   ;
        let end = Math.max(1, gameweek_value - 4);
        while (gameweek_value >= end){
            let response = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek_value}/live/`);
            LAST_FEW_EVENTS_DATA[gameweek_value] = await response.json();
            LAST_GAMEWEEK_WITH_DATA = gameweek_value;
            gameweek_value --;
        }
    }

     // make a dict of team id to team code and 
     // a dict that maps from team name to team code
     create_team_name_id_code_dict(BOOTSTRAP_RESPONSE);
     
     // create dict from player web name to id
     create_player_dict();

    waitForElement(document.body, "[href^='/entry/']").then(()=>{
            USER_ID = get_user_id(trim_url(document.querySelector("[href^='/entry/']").getAttribute("href")));
            if (!(ALL_SETTINGS["profit-loss"] == false)){
                fetch(`https://fantasy.premierleague.com/api/my-team/${USER_ID}/`).then(
                    response=>response.json()).then((response)=>{
                        USER_DATA = response;
                        main();
                })
            } else {
                main();
            }
        })

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
    let attributes = (URL_CODE == "my-team") ? true : false
    let config = { childList: true, subtree: true, attributes: true};
    pitch_observer.observe(pitchElement, config)
    
    // set event listener for reset button to run modifyDOM function
    if (URL_CODE == 'transfers'){
        }

}

async function main(){

    // return if not proper entry url
    is_a_proper_link = check_if_url_is_a_valid_link()
    if (!is_a_proper_link){
        return;
    }

    
     // if url is points then get gameweek from url
     // if pick team then use api to get chosen gameweek

     // get chosen gameweek
     find_chosen_gameweek(BOOTSTRAP_RESPONSE);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     // and call the modifyDOM function after done ( The modifyDOM function is inside this function since the function is async and 
     // we need the fixture dict ready before we swap kits)
     if (URL_CODE != "my-team" && (!(ALL_SETTINGS["away-home-jersey"] == false))){
        fetch_team_name_away_fixture_dict_and_modify_DOM();
     } else {
        // Swap kits if needed after element discovered
        await waitForElement(document.body,"[data-testid='pitch']");
        modifyDOM();
    }

}

// add mutation listener to run the main function again if the route changes
// This is necessary because content-script won't get loaded again as websites like this
// use Javascript frameworks and Ajax calls to only update parts of the existing webpage content as the user navigates around the site
window.onload = setup_mutation_observer_for_url_change;
initContentScript();