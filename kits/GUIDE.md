`kits.py` downloads the home and away kits of current season's premier league teams. The downloaded images are in `png` format. Each kit is stored in three different dimensions:

    * 66w : 66 x 87
    * 110w : 110 x 145
    * 220w : 220 x 290

### How does it work
The python program uses `https://fantasy.premierleague.com/` for home kits, and it relies on `sofifa.com` for downloading away kits.

For home kits, the image is originally in `webp` format and is accessed using `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_id}-{66|110|220}.webp`. The `team_id` for respective teams is accessed using `https://fantasy.premierleague.com/api/bootstrap-static/`

For away kits, the image is in `png` format, and it is accessed using `https://cdn.sofifa.net/kits/{team_id}/{season}_1.png`. The `team_id` values are different from that of the fantasy premier league. The `season` is an int. For example, for the 2025/26 season, the value will be `26`.

`config.json` stores mappings from FPL team short names -> team sofifa id. Moreover, it also stores the current season. This will need to be updated every year **manually**. More info below.

## Prerequisites & running `kits.py`
Ideally, this would need to be done only once a year before the new season starts.
1. Make sure the links mentioned in section above are working correctly. 
2. Update `config.json` manually.
    * Increment `season`.
    * Remove the three old premier league team mappings
    * Add the three new premier league team mappings
        ```
        i). You can find their sofifa team id by going to https://sofifa.com/teams
        For example, MCI has team-id 10. We know this because MCI sofifa page looks like: https://sofifa.com/team/10/manchester-city

        ii). You will need to find the team's short name which is the key using https://fantasy.premierleague.com/api/bootstrap-static/
        ```
3. Run `kits.py`. `kits.py` will not run if the teams mentioned in `config.json` are incorrect.