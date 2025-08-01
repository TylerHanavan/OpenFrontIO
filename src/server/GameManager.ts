import { Logger } from "winston";
import WebSocket from "ws";
import { ServerConfig } from "../core/configuration/Config";
import { Difficulty, GameMapType, GameMode, GameType } from "../core/game/Game";
import { GameConfig, GameID } from "../core/Schemas";
import { Client } from "./Client";
import { GamePhase, GameServer } from "./GameServer";

export class GameManager {
  private games: Map<GameID, GameServer> = new Map();

  constructor(
    private config: ServerConfig,
    private log: Logger,
  ) {
    setInterval(() => this.tick(), 1000);
  }

  public game(id: GameID): GameServer | null {
    return this.games.get(id) ?? null;
  }

  getClient(clientID: string, gameID: GameID): Client | undefined {
    return this.games.get(gameID)?.getClient(clientID) ?? undefined;
  }

  updateClient(
    client: Client,
    gameID: GameID,
    ws: WebSocket,
    lastTurn: number,
  ): boolean {
    const game = this.games.get(gameID);
    if (game) {
      game.updateClient(client, ws, lastTurn);
      return true;
    }
    return false;
  }

  addClient(client: Client, gameID: GameID, lastTurn: number): boolean {
    const game = this.games.get(gameID);
    if (game) {
      game.addClient(client, lastTurn);
      return true;
    }
    return false;
  }

  createGame(id: GameID, gameConfig: GameConfig | undefined) {
    const game = new GameServer(id, this.log, Date.now(), this.config, {
      gameMap: GameMapType.World,
      gameType: GameType.Private,
      difficulty: Difficulty.Medium,
      disableNPCs: false,
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      gameMode: GameMode.FFA,
      bots: 400,
      disabledUnits: [],
      ...gameConfig,
    });
    this.games.set(id, game);
    return game;
  }

  activeGames(): number {
    return this.games.size;
  }

  activeClients(): number {
    let totalClients = 0;
    this.games.forEach((game: GameServer) => {
      totalClients += Array.from(game.getAllClients().values()).filter(
        (c) => !c.isDisconnected(),
      ).length;
    });
    return totalClients;
  }

  tick() {
    const active = new Map<GameID, GameServer>();
    for (const [id, game] of this.games) {
      const phase = game.phase();
      if (phase === GamePhase.Active) {
        if (!game.hasStarted()) {
          // Prestart tells clients to start loading the game.
          game.prestart();
          // Start game on delay to allow time for clients to connect.
          setTimeout(() => {
            try {
              game.start();
            } catch (error) {
              this.log.error(`error starting game ${id}: ${error}`);
            }
          }, 2000);
        }
      }

      if (phase === GamePhase.Finished) {
        try {
          game.end();
        } catch (error) {
          this.log.error(`error ending game ${id}: ${error}`);
        }
      } else {
        active.set(id, game);
      }
    }
    this.games = active;
  }
}
