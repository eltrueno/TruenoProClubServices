import { getClubMatchHistory, TPlatformType } from '@trueno-proclub-services/eafcapi';
import { TGametype } from '@trueno-proclub-services/eafcapi/dist/model/club';
import { getLatestMatch, insertMatch } from '@controllers/match.controller';
import { IMatch } from '@interfaces/match.interface';
import MatchDTO from '@dtos/match.dto';
import { getMatchProducer } from "@events/index"

/**
 * Fetches recent matches from EA and processes any new ones.
 */
export const syncRecentMatches = async (clubId: number, platform: string) => {
    try {
        const types: any[] = ["leagueMatch", "playoffMatch", "friendlyMatch"];
        const matchTypeMap: Record<string, string> = {
            "leagueMatch": "league",
            "playoffMatch": "playoff",
            "friendlyMatch": "friendly"
        };

        const results = await Promise.all(
            types.map(type => getClubMatchHistory(<TPlatformType>platform, clubId, type))
        );

        const leagueMatches = results[0] || [];
        const playoffMatches = results[1] || [];
        const friendlyMatches = results[2] || [];

        const resp = await getLatestMatch();
        const latestDbMatch: IMatch | undefined = (resp && resp.length > 0) ? <IMatch>resp[0] : undefined;

        if (latestDbMatch) {
            const matchesToInsert: any[] = [];

            // Helper to filter new matches
            const filterNew = (apiMatches: any[], type: string) => {
                for (const match of apiMatches) {
                    if (match.timestamp >= latestDbMatch.timestamp && Number(match.matchId) !== latestDbMatch.matchId) {
                        match.matchType = matchTypeMap[type];
                        matchesToInsert.push(match);
                    }
                }
            };

            filterNew(leagueMatches, "leagueMatch");
            filterNew(playoffMatches, "playoffMatch");
            filterNew(friendlyMatches, "friendlyMatch");

            for (const match of matchesToInsert) {
                await insertMatch(match);
                if (match.matchType !== "friendly") {
                    await getMatchProducer().publish(new MatchDTO(match));
                }
            }

            if (matchesToInsert.length > 0) {
                console.info(`[Sync Service] Inserted ${matchesToInsert.length} new matches`);
            }
        } else {
            console.info("[Sync Service] No matches found in database. Performing initial ingest...");
            // Ingest everything
            const ingest = async (apiMatches: any[], type: string) => {
                for (const match of apiMatches) {
                    match.matchType = matchTypeMap[type];
                    await insertMatch(match);
                }
            };
            await ingest(leagueMatches, "leagueMatch");
            await ingest(playoffMatches, "playoffMatch");
            await ingest(friendlyMatches, "friendlyMatch");
            console.info(`[Sync Service] Initial ingest complete: ${leagueMatches.length + playoffMatches.length + friendlyMatches.length} matches`);
        }
    } catch (error) {
        console.error("[Sync Service] Error during match sync:", error);
    }
};
