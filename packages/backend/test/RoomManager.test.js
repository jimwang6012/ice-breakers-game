import { RoomManager } from "../manager/RoomManager.js";
import { createServer } from "http";
import { io as Client } from "socket.io-client";
import { assert } from "chai";
import * as SocketOn from "../socket/on.js";
import { getSocketIO, initSocketServer } from "../socket/index.js";
import { domainToASCII } from "url";

describe("my awesome project", () => {
  let io, serverSocket, clientSocket1, clientSocket2;

  before((done) => {
    const httpServer = createServer();
    initSocketServer(httpServer);
    io = getSocketIO();

    httpServer.listen(() => {
      // initialised 2 client socket
      const port = httpServer.address().port;
      clientSocket1 = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);

      io.on("connection", (socket) => {
        serverSocket = socket;
        SocketOn.CreateRoomOn(serverSocket);
        SocketOn.JoinRoomOn(serverSocket);
      });

      let connectedClientNum = 0;

      function socketConnected() {
        connectedClientNum++;

        if (connectedClientNum == 2) {
          done();
        }
      }
      clientSocket1.on("connect", socketConnected);
      clientSocket2.on("connect", socketConnected);
    });
  });

  after((done) => {
    io.close();
    clientSocket1?.close();
    clientSocket2?.close();
    done();
  });

  it("should create a room", (done) => {
    clientSocket1.emit("create-room", { name: "world" }, (room) => {
      assert.equal(room.players.length, 1);
      assert(RoomManager.getRoom(room.roomId));
      done();
    });
  });

  it("create and join rooms", (done) => {
    clientSocket1.emit("create-room", { name: "world" }, (room) => {
      let roomId = room.roomId;
      clientSocket2.emit("join-room", { roomId, name: "world" }, (room) => {
        assert.equal(room.players.length, 2);
        assert(RoomManager.getRoom(room.roomId));
        done();
      });
    });
  });
});
