// Variable declaration
// observer for pitch changes
var pitch_observer;

// Functions

async function fetch_events(type, object){
    // fetch the last few events data
    let gameweek_value = (type == "next") ? get_current_gameweek()+1: get_current_gameweek();
    let end = (type == "next") ? Math.max(1, gameweek_value + 4) : Math.max(1, gameweek_value - 4);

    if (end > gameweek_value){
        [gameweek_value, end] = [end, gameweek_value];
    }

    while (gameweek_value >= end){
        let response = await fetch(`https://draft.premierleague.com/api/event/${gameweek_value}/live`);
        object[gameweek_value] = await response.json();
        if (type == "next"){
            FARTHEST_GAMEWEEK_WITH_DATA = FARTHEST_GAMEWEEK_WITH_DATA || gameweek_value
        } else {
            LAST_GAMEWEEK_WITH_DATA = gameweek_value;
        }
        gameweek_value --;
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
function get_increment_second_goalie_indexes(){
    if (URL_CODE == "event"){
        return [0, 2, 22]
    } else if (URL_CODE == "my-team"){
        return [0, 3, 33]  
    }
}

function create_next_few_fixtures_object(teamID, start){

   let end = Math.min(start+4, 38)

   if (teamID in TEAM_ID_TO_NEXT_FIVE_FIXTURES) return TEAM_ID_TO_NEXT_FIVE_FIXTURES[teamID];

   let fixtures_object = {};

   let start_counter = start;
   while (start_counter <= end){
    fixtures_object[start_counter] = []
    start_counter ++;
   }

   // go through all remaining fixtures and break if we find event "end + 1"
   for (let counter = start; counter <= end; counter++){

        let fixtures = NEXT_FEW_EVENTS_DATA[counter]["fixtures"];
        for (let fixture of fixtures){

            if (fixture["team_h"] == teamID || fixture["team_a"] == teamID){

                let home_away = (fixture["team_h"] == teamID) ? "H" : "A"
                let team = (fixture["team_h"] == teamID) ? ID_TEAM_DICT[fixture["team_a"]] : ID_TEAM_DICT[fixture["team_h"]];
                fixtures_object[counter].push([team, home_away])

            }
        }
    }
    // save for next use 
    TEAM_ID_TO_NEXT_FIVE_FIXTURES[teamID] = fixtures_object;

    return fixtures_object;
}

function create_next_few_fixtures_div_element(teamID){

    // function to set background color and text for each fixture div
    let set_background_and_text_for_fixtures = (fixture_list, element)=>{
                        element.innerText += `${fixture_list[0]} (${fixture_list[1]})`
                        element.style = "background :#92cbcb; color: black; padding: 2px; border: 0.5px solid black; font-weight: bolder; align-items: center;display: flex;";
                    }
   let start = CHOSEN_GAMEWEEK;
   let end = Math.min(CHOSEN_GAMEWEEK+3, 38)
   // the fixtures object will be of the type:
   // {24 : [["TEAM", "H"]],
   // 25 : [["TEAM", "A"], ["TEAM", "H"]], (double gameweek)
   // 26 : [], (blank gameweek)
   // ....
    //}
   var fixtures_object = create_next_few_fixtures_object(teamID, start);
    
   var MAIN_DIV_ELEMENT = document.createElement("div");
   MAIN_DIV_ELEMENT.setAttribute("class", "upcoming-fixtures")
   // Hide if any secondary divs overflow
    MAIN_DIV_ELEMENT.setAttribute("style",
        "display: grid; overflow: hidden; grid-template-columns: repeat(4, 1fr); font-size: 9px")

   while (start <= end){

        let secondary_div = document.createElement("div");

        secondary_div.setAttribute("style",
            "display: grid; overflow: hidden; grid-template-columns: repeat(1, 1fr)");

        if (fixtures_object[start].length == 0) {

            secondary_div.innerText = '';
            // set background to the grey for blank fixture
            secondary_div.style = `background: rgb(33,26,35); border: 0.5px solid black`;
        } else {

            for (let each_fixture of fixtures_object[start]){

                if (fixtures_object[start].length == 1){
                    set_background_and_text_for_fixtures(each_fixture, secondary_div);
                } else {
                    let div_element = document.createElement("div");
                    set_background_and_text_for_fixtures(each_fixture, div_element);
                    secondary_div.append(div_element);
                }
            }
    }
    MAIN_DIV_ELEMENT.appendChild(secondary_div);
    start ++;
   }

   return MAIN_DIV_ELEMENT;
}

async function modifyDOM(){

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
                    if (URL_CODE == 'my-team'){
                        var away_jersey_needed = await check_if_away_jersey_needed(all_buttons[currentIndex], teamCode, true, TEAM_AWAY_DICT,"[class^='styles__ElementValue']")
                    } else {
                        var away_jersey_needed = await check_if_away_jersey_needed(all_buttons[currentIndex], teamCode, false, TEAM_AWAY_DICT,"[class^='styles__ElementValue']")
                    }

                    modify_src_attributes(away_jersey_needed, sourceElement, imgElement, teamCode);
                }
            }

        } catch (err){
            // error when no a player removed and no jersey there to know which the player is
        }

        if (URL_CODE == 'my-team'){

            if (!(ALL_SETTINGS["next-few-fixtures"] == false)){
                // inject their next 5 fixtures after modifying img attribute if "my-team" page
                try {
                    playerElement.removeChild(playerElement.querySelector(".upcoming-fixtures"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                var fixtures_div = create_next_few_fixtures_div_element(TEAM_ID_DICT[teamCode]);
                playerElement.appendChild(fixtures_div);
            }
        
            var player_web_name = playerElement.querySelector("[class^='styles__ElementName']").innerText;
            let player_id = get_player_id(player_web_name, TEAM_ID_DICT[teamCode]);
            if (!(ALL_SETTINGS["last-few-gw"] == false)){
                // inject their past 5 fixtures data after (Last few gameweeks points)
                try {
                    playerElement.removeChild(playerElement.querySelector(".past-fixtures"));}
                catch (err) {
                    // type error if query selector doesn't return a node
                }
                var past_fixtures_div = create_past_fixtures_div_element(player_id, TEAM_ID_DICT[teamCode]);
                playerElement.appendChild(past_fixtures_div);
            }

        }
    }
    // if the user is on the transfers page, then need to add away jersey if necessary

    // loop finished, setup mutation observer
    if (URL_CODE == 'my-team'){
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

function create_past_fixtures_div_element(playerID, teamID){

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
        if (player_event_data.explain.length == 1){
            var fixture = get_fixture(player_event_data["explain"][0][1], teamID, start)
        } else {
            var fixture = '';
            for (let each_game of player_event_data.explain){
                fixture = fixture + ', ' + get_fixture(each_game[1], teamID, start)
            }
            if (fixture != '') fixture = fixture.slice(0, fixture.length -2)
        }
        // show Gameweek, team, xG, xA
        info.innerText = `GW ${start} ${fixture} xG ${stats.expected_goals} xA ${stats.expected_assists}`
        secondary_div.appendChild(info);
 
        MAIN_DIV_ELEMENT.appendChild(secondary_div);
        start ++;

    }
    return MAIN_DIV_ELEMENT;
}

function get_fixture(fixtureID, teamID, gameweek){

    for (let each_fixture of LAST_FEW_EVENTS_DATA[gameweek]["fixtures"]){
        if (each_fixture.id == fixtureID){
            return (each_fixture.team_h == teamID) ? `${ID_TEAM_DICT[each_fixture.team_a]}(A)` : `${ID_TEAM_DICT[each_fixture.team_h]}(H)`
        }
    }
    return "Blank"
}
function get_player_event_data(gameweek, playerID){
    return LAST_FEW_EVENTS_DATA[gameweek]["elements"][`${playerID}`];
}

function get_current_gameweek(){

    return Number(BOOTSTRAP_RESPONSE["events"]["current"]);

}
function find_chosen_gameweek(all_info_dict){

    CHOSEN_GAMEWEEK = all_info_dict["events"]["current"];

    // check url
    let url = trim_url(window.location.href);
    if (url.endsWith("my")){
        URL_CODE = "my-team";
        CHOSEN_GAMEWEEK += 1;
    } else if (url.endsWith("transactions")){
        CHOSEN_GAMEWEEK += 1;
        URL_CODE = "transactions";
    } else {
        URL_CODE = "event";
        let url_pieces = url.split('/');
        CHOSEN_GAMEWEEK = url_pieces[url_pieces.length-1];
    }

}

function create_team_name_away_fixture_dict_and_modify_DOM(fixtures){

    if (!(ALL_SETTINGS["away-home-jersey"] == false)){
        TEAM_AWAY_DICT = {};
        for (let fixture of fixtures){
            let home_team = ID_TEAM_DICT[fixture["team_h"]];
            let away_team = ID_TEAM_DICT[fixture["team_a"]];
            if (!(home_team in TEAM_AWAY_DICT)) TEAM_AWAY_DICT[home_team] = false;
            if (!(away_team in TEAM_AWAY_DICT)) TEAM_AWAY_DICT[away_team] = true;
    }
    }
     // Swap kits if needed after element discovered
     waitForElement(document.body, "[data-testid='pitch']").then(()=>{
        modifyDOM();
     })
}

async function fetch_team_name_away_fixture_dict_and_modify_DOM(){

    if (!(ALL_SETTINGS["away-home-jersey"] == false)){
        let response = await fetch(`https://draft.premierleague.com/api/event/${CHOSEN_GAMEWEEK}/live`);
        response = await response.json();
        create_team_name_away_fixture_dict_and_modify_DOM(response["fixtures"]);
    } else {
        create_team_name_away_fixture_dict_and_modify_DOM({});
    }

    }

function check_if_url_is_a_valid_link(){

    // not supporting transactions for now
    let url = trim_url(window.location.href);
    let my_team_re = new RegExp("^https?://draft\.premierleague\.com/team/my/?$")
    let event_re = new RegExp("^https?://draft\.premierleague\.com/entry/[0-9]*/event/[0-9]{1,2}/?$");

    if (my_team_re.test(url) || event_re.test(url)){
        return true;
    }
    // all other links are invalid ( no need to inject content-scripts into them)
    return false;

}

function setup_mutation_observer_for_url_change(){

  const config = { attributes: false, childList: true, subtree: true }

  const observer = new MutationObserver(()=>{

    if (trim_url(window.location.href) != CURRENT_URL){

        // disconnect pitch oberser since main sets it again
        if (pitch_observer) pitch_observer.disconnect();
        CURRENT_URL = trim_url(window.location.href);
        main();
    }
  })

  observer.observe(document.body, config)

}

async function initContentScript(){

    let all_ids = ["away-home-jersey", "next-few-fixtures", "last-few-gw", "profit-loss", "net-transfers", "expected-points"];
    // if ALL_SETTINGS is empty, then every feature is turned on
    ALL_SETTINGS = await chrome.storage.local.get(all_ids);

    try {
    let [awayResponse, bootstrapResponse] = await Promise.all([
        // link to get team name and away jersey link
        fetch("https://paudsu01.github.io/FPL-360/extension/FPL-HOME-AWAY.json"),
        // link to get info for current gameweek and team name and their appropriate ids
        fetch("https://draft.premierleague.com/api/bootstrap-static"),
            ])
    TEAM_JERSEY_LINK_DICT = await awayResponse.json();
    BOOTSTRAP_RESPONSE = await bootstrapResponse.json();

    if (!(ALL_SETTINGS["last-few-gw"] == false)){
        await fetch_events("previous", LAST_FEW_EVENTS_DATA, LAST_GAMEWEEK_WITH_DATA);
    }

    if (!(ALL_SETTINGS["next-few-fixtures"] == false)){
        await fetch_events("next", NEXT_FEW_EVENTS_DATA, FARTHEST_GAMEWEEK_WITH_DATA)
    }
    // make a dict of team id to team code and 
    // a dict that maps from team name to team code
    create_team_name_id_code_dict(BOOTSTRAP_RESPONSE);
    
    // create dict from player web name to id
    create_player_dict();

    waitForElement(document.body, "[class^='ismjs-main-nav']").then(()=>{
        main();
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
            modifyDOM();
        })
    });

    let pitchElement = document.querySelector("[data-testid='pitch']");
    // Options for the observer (which mutations to observe)
    var config = { characterData: true, attributes: false, childList: false, subtree: true };
    pitch_observer.observe(pitchElement, config)
    
}

async function main(){

    // return if not proper entry url
    is_a_proper_link = check_if_url_is_a_valid_link()
    if (!is_a_proper_link){
        return;
    }

     // get chosen gameweek
     find_chosen_gameweek(BOOTSTRAP_RESPONSE);

     // make a dict that maps from teamName to away fixture value(true if the team has a next away fixture else false)
     // and call the modifyDOM function after done ( The modifyDOM function is inside this function since the function is async and 
     // we need the fixture dict ready before we swap kits)
     if (URL_CODE == "event"){
        fetch_team_name_away_fixture_dict_and_modify_DOM();
     } else {
        create_team_name_away_fixture_dict_and_modify_DOM(NEXT_FEW_EVENTS_DATA[CHOSEN_GAMEWEEK]["fixtures"]);
    }

}

// add mutation listener to run the main function again if the route changes
// This is necessary because content-script won't get loaded again as websites like this
// use Javascript frameworks and Ajax calls to only update parts of the existing webpage content as the user navigates around the site
window.onload = setup_mutation_observer_for_url_change;
initContentScript();