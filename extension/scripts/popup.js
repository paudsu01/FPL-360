var all_ids = ["away-home-jersey", "next-few-fixtures", "last-few-gw", "profit-loss", "net-transfers"];
async function save_values_to_chrome_storage(){

    //   // Save it using the Chrome extension storage API.
    //   chrome.storage.sync.set({'foo': 'hello', 'bar': 'hi'}, function() {
    //     console.log('Settings saved');
    //   });
  
    //   // Read it using the storage API
    //   chrome.storage.sync.get(['foo', 'bar'], function(items) {
    //     message('Settings retrieved', items);
    //   });

    let settings = {};

    for (let id of all_ids){
        let element = document.querySelector(`#${id}`);
        if (element.checked){
            settings[id] = true;
        } else {
            settings[id] = false;
        }
    }

    await chrome.storage.local.clear();
    await chrome.storage.local.set(settings);
}

window.onload = async function (){

    // fill our on/off values in input elements
    let settings = await chrome.storage.local.get(all_ids)
    for (let id of all_ids){

        let element = document.querySelector(`#${id}`);
        element.checked = true;
        try {
            if (settings[id] != true) element.checked = false;
        } catch (err){
            // if err raised, no settings stored in the extension storage
            // this means all the features are turned on
        }
    }
    // add event listener to save button to store the saved options using chrome.storage.local api
    let save_button = document.querySelector("button");
    save_button.addEventListener("click", ()=>{
        document.querySelector("#message").innerHTML = '';
        save_values_to_chrome_storage();
        document.querySelector("#message").innerHTML = 'Saved! Reload FPL page';
        setTimeout(()=>{
            document.querySelector("#message").innerHTML = '';
        }, 2000)
    })

}