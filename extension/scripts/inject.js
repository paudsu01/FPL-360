/* Trying to fetch /api/me from the content-script itself returns a null player because of lack of credentials for authentication
    This is in spite of doing something like the code below in the content-script:
        fetch("https://fantasy.premierleague.com/api/me", {
            credentials: 'include', // default Fetch API requests do not contain user credentials such as cookies and HTTP authentication headers. 
        })
    However, it works when we inject the script on the DOM itself because
    all the valid credentials for authentication will be sent that away returning a valid API response
*/
(async () => {
    var user_id;
    var user_data;
    try{
        const res1 = await fetch("https://fantasy.premierleague.com/api/me");
        const data = await res1.json();
        user_id = data.player.entry;

        const res2 = await fetch(`https://fantasy.premierleague.com/api/my-team/${user_id}/`);
        user_data = await res2.json();
    } catch(err) {
        console.log(err);
        user_id = undefined;
        user_data = undefined;
    }

    // send message to content-script side
    window.postMessage({
        type: 'FPL_ME',
        user_id: user_id,
        user_data: user_data
    })
})();