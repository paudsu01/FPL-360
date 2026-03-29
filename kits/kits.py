from __future__ import annotations
from typing import List, Dict
import requests
import os
import json
import shutil

# Path(Directory) to store kits
IMAGE_DIRECTORY = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "extension", "img", "kits"
    )

def verify(bootstrap: Dict) -> Dict:
    """
    Verifies and raises exception if PL teams from the bootstrap response
    doesn't match the teams from config.json

    Args:
        bootstrap: bootstrap response from FPL api

    Returns:
        Config dict: config.json as dict
    """
    
    # Team short names based on the bootstrap response
    teams = set(team.get('short_name', '') for team in bootstrap.get("teams", []))

    # Read config.json
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_path, 'r') as inp:
        config : Dict = json.loads(inp.read())
    
    # See if teams in config.json matches teams from the bootstrap
    if set(config["teams"].keys()) == teams:
        # config.json teams are valid
        return config
    else:
        raise Exception("Config.json teams doesn't match the FPL teams from bootstrap response. Read GUIDE.md")


def download_home_kits(teams: List[Dict]) -> None:
    """
    Download all the team's home kits and save them in `extension/img/kits/`
    The home kit can be accessed using "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_id}-{width}.webp"

    For each team, images of 3 different dimensions are downloaded:
        * 66w : 66 x 87
        * 110w : 110 x 145
        * 220w : 220 x 290

    Args:
        teams:  List of premier league teams info. Each element is a dict
                We are interested in the team's code and their short name. e.g. ARS, MCI

    Returns: None
    """
    for team in teams:

        team_id = team["code"]
        team_short_name = team["short_name"]
        
        path = os.path.join(IMAGE_DIRECTORY, f'{team_short_name}')
        os.makedirs(path, exist_ok=True)

        for width in [66, 110, 220]:
            link = f"https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_id}-{width}.webp"
            image_bytes = requests.get(link).content

            with open(f'{path}/home_{width}.webp', 'wb') as out:
                out.write(image_bytes)

# TODO
def download_away_kits(config: Dict) -> None:
    pass

def remove_existing_kit_images() -> None:
    """
    Quicky and dirty way to remove existing(old) kit images from ${IMAGE_DIRECTORY}
    Args: None
    Returns: None
    """
    if os.path.isdir(IMAGE_DIRECTORY):
        shutil.rmtree(IMAGE_DIRECTORY)
        os.mkdir(IMAGE_DIRECTORY)
    else:
        if os.path.exists(IMAGE_DIRECTORY):
            raise Exception(f"Remove {IMAGE_DIRECTORY} file. It should be a directory")
        else:
            os.mkdir(IMAGE_DIRECTORY)

def main():
    r = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/")
    if r.status_code == 200:
        bootstrap = r.json()
        # verify PL teams with teams from config.json
        config = verify(bootstrap)

        # remove existing(old) images of kits after verification
        remove_existing_kit_images()

        # TODO
        download_home_kits(bootstrap["teams"])
        # TODO
        # download_away_kits(config)
    else:
        raise Exception(f"Request for FPL bootstrap response failed: Got status code {r.status_code}")

    # download home kits
        # * download all three sizes -> convert to png
    pass

if __name__ == "__main__":
    main()