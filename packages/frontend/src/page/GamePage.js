import { useContext, useEffect, useState } from "react";
import { useKeyUp } from "react-keyboard-input-hook";
import classNames from "classnames";
import { useParams } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  changeDirection,
  breakIce,
  breakerMove,
  playerMove,
} from "../util/PlayerControl";
import "./gampage.css";
import socket from "../Socket";
import { Modal } from "../component/Modal";
import { AppContext } from "../AppContextProvider";
import { LeaderBoard } from "../component/LeaderBoard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVideoCamera } from "@fortawesome/free-solid-svg-icons";
// import Avatar from "react-avatar";
// import { BiCaretUp,BiCaretRight,BiCaretLeft,BiCaretDown } from "react-icons/bi";
import { convertToMS } from "../util/timer";

function GamePage() {
  const navigate = useNavigate();

  const windowSizeChanged = () => {
    const initWidth = window.innerWidth * 0.65;
    const initHeight = window.innerHeight - 20;
    const size = initWidth > initHeight ? initHeight : initWidth;
    setIceSize(size / (board?.length + 3));
  };
  window.addEventListener("resize", windowSizeChanged);
  const { config, isTyping } = useContext(AppContext);
  const { state } = useLocation();
  const [currentTime, setCurrentTime] = useState(config.roundTime);
  const [show, setShow] = useState(false);

  const [showOut, setShowOut] = useState(true);
  const [leaderboardList, setLeaders] = useState();
  const [winningMessage, setWinner] = useState("");
  const initGame = (game, myId) => {
    const initWidth = window.innerWidth * 0.65;
    const initHeight = window.innerHeight - 20;
    const size = initWidth > initHeight ? initHeight : initWidth;

    setBoard(game.board);
    setIceSize(size / (game.board?.length + 3));

    const playerList = game.players;
    playerList.forEach((player, index) => {
      if (player.id === myId) {
        setMe(player);
      }
    });
    setPlayers(playerList);
  };

  const roomId = useParams().code;

  useEffect(() => {
    // @ts-ignore
    if (!!state.game) initGame(state.game, socket.id);

    const onGameUpdate = (game) => initGame(game, socket.id);
    const onGameEnd = (room) => {
      room.players.sort(function (a, b) {
        return b.score - a.score;
      });

      setLeaders(room.players);

      if (
        room.players.filter((player) => player.isAlive && !player.isBreaker)
          .length === 0
      ) {
        setWinner("Breaker Win !!!");
      } else {
        setWinner("Survivors Win !!!");
      }

      setShow(true);
    };
    const onGameTimeChanged = (time) => {
      setCurrentTime(time);
    };

    const gameDone = () => {
      setDone(true);
    };
    socket.on("room-closed", gameDone);
    socket.on("game-update", onGameUpdate);
    socket.on("game-end", onGameEnd);
    socket.on("game-time-changed", onGameTimeChanged);

    return () => {
      socket.off("room-closed", gameDone);
      socket.off("game-update", onGameUpdate);
      socket.off("game-end", onGameEnd);
      socket.off("game-time-changed", onGameTimeChanged);
    };
    // @ts-ignore
  }, [navigate, roomId, state.game]);

  const [players, setPlayers] = useState([]);
  const [iceSize, setIceSize] = useState(10);
  const [done, setDone] = useState(false);
  const [me, setMe] = useState({
    id: null,
    name: null,
    isAlive: true,
    isBreaker: false,
    x: 0,
    y: 0,
    direction: null,
  });
  const [board, setBoard] = useState([]);

  const handlePlayerMove = ({ keyName }) => {
    if (me.isAlive && !done && !isTyping) {
      // what every move or not, direction need to change
      if (me.isBreaker && !isBreaking) {
        changeDirection(me, keyName);
        if (keyName === "Space") {
          //handle break ice using space
          breakIce(me, board, handleBreak);
        } else {
          // movement of breakers
          breakerMove(keyName, me, board);
        }
      } else if (!me.isBreaker) {
        changeDirection(me, keyName);
        // normal non-breaker players on the ice
        playerMove(keyName, me, board.length);
      }
      socket.emit("movement", {
        roomId,
        x: me.x,
        y: me.y,
        direction: me.direction,
      });
      setMe(me);
    }
  };

  useKeyUp(handlePlayerMove);

  const [isBreaking, setIsBreaking] = useState(false);

  const handleBreak = async (row, col) => {
    setIsBreaking(true);
    await new Promise((resolve) =>
      setTimeout(resolve, config.breakTime * 1000)
    );
    board[row][col] = 0;
    setBoard([...board]);
    socket.emit("break", { roomId, y: col, x: row });
    setIsBreaking(false);
  };

  const onThisIce = (player, row, col) => {
    return player.x === row && player.y === col;
  };
  return (
    <div>
      {!me.isAlive && (
        <div className="absolute flex flex-col p-5 text-ice-5">
          <FontAwesomeIcon style={{ fontSize: 48 }} icon={faVideoCamera} />
          <div className="font-bold">Spectating</div>
        </div>
      )}
      <div className="flex items-center justify-center h-screen overflow-y-auto bg-ice-8">
        <Modal
          title={
            <div className="text-3xl font-black text-ice-6">
              {winningMessage}
            </div>
          }
          show={show}
          pageJump={() => {
            navigate("/" + roomId.toString() + "/idle");
          }}
          mainPrompt={<LeaderBoard list={leaderboardList} myID={me.id} />}
          buttonPrompt={"GG!"}
        />
        <div className="text-3xl font-bold text-white timer">
          {convertToMS(currentTime)}
        </div>

        <div className="flex items-center justify-center mt-4 overflow-y-auto bg-ice-8">
          {/* Dead indicator */}
          {!me.isAlive && showOut && (
            <div className="absolute z-40 flex flex-row animate-bounce">
              <div style={{ fontSize: 100 }} className="text-ice-6 text-9xl">
                You Out!
              </div>
              <div className="text-red-800" onClick={() => setShowOut(false)}>
                ✖
              </div>
            </div>
          )}
          <div className="">
            {board ? (
              board.map((rowItems, row) => {
                return (
                  <div className="flex flex-row" key={row}>
                    {rowItems.map((ice, col) => {
                      return (
                        <div className="flex" key={col}>
                          {/* {If is 0 but with less than 2 players} */}
                          {ice === 1 ? (
                            <div
                              style={{
                                width: Math.round(iceSize),
                                height: Math.round(iceSize),
                                margin: Math.round(iceSize / board.length),
                              }}
                              className="flex items-center justify-center m-2 border-2 shadow-md border-ice-0 player bg-ice-0"
                            >
                              {players.map((item, index) => {
                                if (onThisIce(item, row, col)) {
                                  return (
                                    <PlayerAvatar
                                      key={index}
                                      player={item}
                                      ice={iceSize}
                                    />
                                  );
                                } else return null;
                              })}
                            </div>
                          ) : (
                            <div
                              style={{
                                width: Math.round(iceSize),
                                height: Math.round(iceSize),
                                margin: Math.round(iceSize / board.length),
                              }}
                              className="flex items-center justify-center m-2 border-2 player border-ice-0"
                            >
                              {players.map((item, index) => {
                                if (
                                  onThisIce(item, row, col) &&
                                  item.isBreaker
                                ) {
                                  return (
                                    <PlayerAvatar
                                      key={index}
                                      player={item}
                                      ice={iceSize}
                                    />
                                  );
                                } else return null;
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;

function getIcon(props, colors) {
  const myColor = colors[props.player.colorId ?? 0];
  var direction = props.player.direction;
  if (props.player.direction === "LEFT") {
    direction = "RIGHT";
  } else if (props.player.direction === "RIGHT") {
    direction = "LEFT";
  }
  return props.player.isBreaker
    ? "../avatars/seal_" + direction + ".png"
    : "../avatars/p_" +
        direction.toString().toLowerCase() +
        "_" +
        myColor.toString().substring(1) +
        ".png";
}

function PlayerAvatar(props) {
  const { colors } = useContext(AppContext);

  const img_path = getIcon(props, colors);

  if (props.player.isAlive) {
    return (
      <div
        className={classNames(
          "playerme flex items-center justify-center text-white rounded-2xl text "
        )}
      >
        <div
          className="flex items-center justify-center "
          style={{ width: props.ice * 0.85, height: props.ice * 0.85 }}
        >
          <img
            src={process.env.PUBLIC_URL + img_path}
            width={props.ice * 0.8}
          />
        </div>
      </div>
    );
  } else {
    return null;
  }
}
