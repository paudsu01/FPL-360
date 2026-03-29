from __future__ import annotations
import requests
import os
import json
import shutil
import io

from PIL import Image
from alive_progress import alive_bar
from typing import List, Dict

# Path(Directory) to store kits
IMAGE_DIRECTORY = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "extension", "img", "kits"
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
    teams = set(
        team.get("short_name", "") for team in bootstrap.get("teams", []))

    # Read config.json
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r") as inp:
        config: Dict = json.loads(inp.read())

    # See if teams in config.json matches teams from the bootstrap
    if set(config["teams"].keys()) == teams:
        # config.json teams are valid
        return config
    else:
        raise Exception(""" Config.json teams doesn't match the FPL teams
            from bootstrap response. Read GUIDE.md
            """)


def download_home_kits(teams: List[Dict]) -> None:
    """
    Download all the team's home kits and save them in `extension/img/kits/`
    The home kit can be accessed using
        "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_id}-{width}.webp"

    For each team, images of 3 different dimensions are downloaded:
        * 66w : 66 x 87
        * 110w : 110 x 145
        * 220w : 220 x 290

    Args:
        teams:  List of premier league teams info. Each element is a dict
                We are interested in the team's code
                and their short name. e.g. ARS, MCI

    Returns: None
    """
    # Show bar progress
    with alive_bar(len(teams)) as bar:
        for team in teams:

            team_id = team["code"]
            team_short_name = team["short_name"]

            path = os.path.join(IMAGE_DIRECTORY, f"{team_short_name}")
            os.makedirs(path, exist_ok=True)

            for width in [66, 110, 220]:
                link = f"https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_id}-{width}.webp"
                image_bytes = requests.get(link).content

                image_path = os.path.join(path, f"home_{width}.webp")
                with open(image_path, "wb") as out:
                    out.write(image_bytes)

            # Update bar progress
            bar()


def download_away_kits(config: Dict) -> None:
    """
    Download all the team's away kit and saves them in `extension/img/kits/`
    The away kit can be accessed using
        "https://cdn.sofifa.net/kits/{team_id}/{season}_1@3x.png"

    * Note that the `team_id` of a team in sofifa
    isn't the same `team_id` of a team in FPL.

    For each team, images of 3 different dimensions are created:
        * 66w : 66 x 87
        * 110w : 110 x 145
        * 220w : 220 x 290
    Moreover, the original image is in `png` format, but each image is resized
        and saved in `webp` format.

    Args:
        config: dict which is loaded from `config.json`
    Returns:
        None
    """
    teams = config["teams"]
    season = config["season"]

    # Show bar progress
    with alive_bar(len(teams)) as bar:
        # loop through each team
        for team_short_name, team_id in teams.items():
            path = os.path.join(IMAGE_DIRECTORY, f"{team_short_name}")
            os.makedirs(path, exist_ok=True)

            # Get the png image from sofifa
            link = f"https://cdn.sofifa.net/kits/{team_id}/{season}_1@3x.png"
            image_bytes = requests.get(link).content

            # create `ImageFile` pillow object
            im = Image.open(io.BytesIO(image_bytes))
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")

            # resize the image and save as webp file
            sizes = {66: (66, 87), 110: (110, 145), 220: (220, 290)}
            # Loop, resize, and save
            for size, dimensions in sizes.items():
                # Use Resampling.LANCZOS for the highest quality downscaling
                resized_im = im.resize(dimensions, Image.Resampling.LANCZOS)
                image_path = os.path.join(path, f"away_{size}.webp")
                resized_im.save(image_path, "WEBP", lossless=True)

            # Update bar progress
            bar()


def remove_existing_kit_images() -> None:
    """
    Quicky and dirty way to remove existing(old) kit images
        from ${IMAGE_DIRECTORY}
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

        # download home and away kits
        #   home kits are downloaded from fantasy.premierleague.com
        #   away kits are downloaded from sofifa.com
        download_home_kits(bootstrap["teams"])
        download_away_kits(config)
    else:
        raise Exception(
            f"Request for FPL bootstrap response failed: Got status code {r.status_code}"
        )


if __name__ == "__main__":
    main()
