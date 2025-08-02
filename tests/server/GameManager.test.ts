import { jest } from "@jest/globals";

import { createLogger, format, Logger, transports } from "winston";
import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { Client } from "../../src/server/Client";
import { GameManager } from "../../src/server/GameManager";
import { GameServer } from "../../src/server/GameServer";

jest.mock("ws", () => {
  return {
    default: jest.fn().mockImplementation(() => ({})),
    Server: jest.fn(),
  };
});

import { WebSocket } from "ws";

const mockSocket = {
  send: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
  terminate: jest.fn(),
  ping: jest.fn(),
  pong: jest.fn(),
  readyState: 1,
  isPaused: false,
  removeAllListeners: jest.fn(),
} as unknown as WebSocket;

let gm: GameManager;
let gameServer1: GameServer;
let gameServer2: GameServer;

let clients: Client[];

let emptyStringArray: string[];

let logger: Logger;

type ClientStatsFn = (
  gs: GameServer,
  all: number,
  alive: number,
  disconnected: number,
  kicked: number,
) => number;

let testClientsLists: ClientStatsFn;

describe("GameServer and GameManager", () => {
  beforeAll(() => {
    logger = createLogger({
      level: "info",
      format: format.json(),
      transports: [new transports.Console()],
    });
    emptyStringArray = [];
    jest.useFakeTimers();

    testClientsLists = (
      gs: GameServer,
      all: number,
      alive: number,
      disconnected: number,
      kicked: number,
    ): void => {
      expect(gs.getAllClients().length).toBe(all);
      expect(gs.getAliveClients().length).toBe(alive);
      expect(gs.getDisconnectedClients().length).toBe(disconnected);
      expect(gs.getKickedClients().length).toBe(kicked);
    };
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    gm = new GameManager(new DevServerConfig(), logger);
    gameServer1 = gm.createGame("001", undefined);
    gameServer2 = gm.createGame("002", undefined);

    clients = [];

    for (let x = 0; x < 3; x++) {
      clients.push(
        new Client(
          "fakeclientid" + x,
          "persistentid" + x,
          null,
          emptyStringArray,
          emptyStringArray,
          "ip" + x,
          "username" + x,
          mockSocket,
          undefined,
          undefined,
        ),
      );
    }
  });

  test("GameManager check adding client to bad game id", async () => {
    expect(gm.addClient(clients[0], "003", 0)).toBeFalsy();

    expect(gm.addClient(clients[0], "", 0)).toBeFalsy();
  });

  test("GameManager check if games are added", async () => {
    expect(gm.game("001")).toBeDefined();
    expect(gm.game("002")).toBeDefined();
    expect(gm.game("003")).toBeNull();

    expect(gm.activeGames()).toBe(2);
  });

  test("GameManager client counting is working correctly", async () => {
    expect(gm.activeClients()).toBe(0);
    testClientsLists(gameServer1, 0, 0, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    expect(gm.addClient(clients[0], "001", 0)).toBeTruthy();

    expect(gm.activeClients()).toBe(1);
    testClientsLists(gameServer1, 1, 1, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    expect(gm.addClient(clients[1], "001", 0)).toBeTruthy();

    expect(gm.activeClients()).toBe(2);
    testClientsLists(gameServer1, 2, 2, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    expect(gm.addClient(clients[2], "002", 0)).toBeTruthy();

    expect(gm.activeClients()).toBe(3);
    testClientsLists(gameServer1, 2, 2, 0, 0);
    testClientsLists(gameServer2, 1, 1, 0, 0);
  });

  test("GameServer client counting is working correctly", async () => {
    expect(gm.activeClients()).toBe(0);
    testClientsLists(gameServer1, 0, 0, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    gameServer1.addClient(clients[0], 0);

    expect(gm.activeClients()).toBe(1);
    testClientsLists(gameServer1, 1, 1, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    gameServer1.addClient(clients[1], 0);
    gameServer2.addClient(clients[2], 0);

    expect(gm.activeClients()).toBe(3);
    testClientsLists(gameServer1, 2, 2, 0, 0);
    testClientsLists(gameServer2, 1, 1, 0, 0);
  });

  test("GameServer test kicking a client", async () => {
    gameServer1.addClient(clients[0], 0);

    expect(gm.activeClients()).toBe(1);
    testClientsLists(gameServer1, 1, 1, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    gameServer1.kickClient(clients[0]);

    expect(gm.activeClients()).toBe(0);
    testClientsLists(gameServer1, 1, 0, 1, 1);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    gameServer1.addClient(
      new Client(
        "fakeclientid0",
        "persistentid0",
        null,
        emptyStringArray,
        emptyStringArray,
        "ip0",
        "username0",
        mockSocket,
        undefined,
        undefined,
      ),
      0,
    );

    expect(gm.activeClients()).toBe(0);
    testClientsLists(gameServer1, 1, 0, 1, 1);
    testClientsLists(gameServer2, 0, 0, 0, 0);
  });

  test("GameServer check if persistent ids do not match", async () => {
    gameServer1.addClient(clients[0], 0);

    expect(gm.activeClients()).toBe(1);
    testClientsLists(gameServer1, 1, 1, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);

    gameServer1.addClient(
      new Client(
        "fakeclientid0",
        "persistentid1",
        null,
        emptyStringArray,
        emptyStringArray,
        "ip0",
        "username0",
        mockSocket,
        undefined,
        undefined,
      ),
      0,
    );

    expect(gm.activeClients()).toBe(1);
    testClientsLists(gameServer1, 1, 1, 0, 0);
    testClientsLists(gameServer2, 0, 0, 0, 0);
  });
});
