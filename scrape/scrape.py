from __future__ import annotations

import json
import os
from typing import Dict

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from exceptions import AppropriateDivNotDetectedException


def parse_response(html : str) -> Dict[str, str]:

    soup = BeautifulSoup(html, "lxml")
    main_div = soup.find(class_="history-kits")
    # the div element with class "history-kits__club__kit--awaykit"  contain img with src to away jersey

    # e.g (simplified version) : 

    # <div class="history-kits__club__kit--awaykit">
    # <picture>
    # <img src="LINK_TO_AWAY_JERSEY" alt>
    # </picture>
    # <h6>Away Kit</h6>
    # </div>

    # the team names on the other hand are in the format
    # <h2 class="pageTitle">Arsenal</h2>

    div_elements = main_div.find_all("div", class_="history-kits__club__kit--awaykit")
    h2_elements = main_div.find_all("h2", class_="pageTitle")
    team_jersey_dict = {}

    for div_element, h2_element in zip(div_elements, h2_elements):

        teamName = h2_element.text
        jersey_link = div_element.find("img")["src"]
        team_jersey_dict[teamName] = jersey_link
    
    return team_jersey_dict
        
def save_as_json(team_away_jersey_dict : Dict[str, str]) -> None:

    json_dict = json.dumps(team_away_jersey_dict, indent=2)
    PATH_TO_ROOT_DIRECTORY = os.path.dirname(os.path.dirname(__file__))
    PATH_TO_JSON = os.path.join(PATH_TO_ROOT_DIRECTORY, 'extension/FPL-AWAY.json')

    with open(PATH_TO_JSON, 'w') as outfile:
        outfile.write(json_dict)

if __name__ == "__main__":

    LINK = "https://www.premierleague.com/history/kits"

    # Configure options for headless firefox mode
    options = webdriver.FirefoxOptions()
    options.add_argument("--headless")

    driver = webdriver.Firefox(options = options)

    driver.get(LINK)
    try:
        # each of the div element with this class name contaisn info for each club
        WebDriverWait(driver, 10).until(
                            EC.presence_of_element_located((By.CLASS_NAME, "history-kits__club"))
                                )
    except:
        raise AppropriateDivNotDetectedException("Div element with the provided class name not detected")

    # parse the html recieved with beautifulSoup and lxml parser
    team_away_jersey_dict = parse_response(driver.page_source)

    # save the dict as json 
    save_as_json(team_away_jersey_dict)