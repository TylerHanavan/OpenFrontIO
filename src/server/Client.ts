import WebSocket from "ws";
import { TokenPayload } from "../core/ApiSchemas";
import { Tick } from "../core/game/Game";
import { ClientID } from "../core/Schemas";

export class Client {
  public lastPing: number = Date.now();

  public hashes: Map<Tick, number> = new Map();

  private _isDisconnected = false;
  private _isKicked = false;

  constructor(
    public readonly clientID: ClientID,
    public readonly persistentID: string,
    public readonly claims: TokenPayload | null,
    public readonly roles: string[] | undefined,
    public readonly flares: string[] | undefined,
    public readonly ip: string,
    public readonly username: string,
    public ws: WebSocket,
    public readonly flag: string | undefined,
    public readonly pattern: string | undefined,
  ) {}

  public getWebSocket(): WebSocket {
    return this.ws;
  }

  public setWebSocket(ws: WebSocket): void {
    this.ws = ws;
  }

  public isDisconnected(): boolean {
    return this._isDisconnected;
  }

  public markDisconnected(disconnected: boolean): void {
    this._isDisconnected = disconnected;
  }

  public isKicked(): boolean {
    return this._isKicked;
  }

  public markKicked(kicked: boolean): void {
    this._isKicked = kicked;
  }
}
