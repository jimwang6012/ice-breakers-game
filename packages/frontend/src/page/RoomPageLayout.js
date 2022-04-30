import React, { useContext, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { Text, ScrollArea, Group } from "@mantine/core";
import { useInputState, useListState } from "@mantine/hooks";
import { createStyles } from "@mantine/core";
import Avatar from "react-avatar";
import { AppContext } from "../AppContextProvider";
import socket from "../Socket";
import { Modal } from "../component/Modal";
export default function RoomPageLayout() {
  const { classes } = useStyles();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const openModal = () => {
      setShow(true);
    };
    socket.on("room-closed", openModal);
    return () => {
      // Clean up
      socket.off("room-closed", openModal);
    };
  }, []);
  return (
    <div className={classes.roomPage}>
      {/* This is the section of the room layout that shows the game page and idle page. */}
      <div className={classes.leftSection}>
        <Outlet />
      </div>
      {/* This is the section of the room layout that shows the player list and message list */}
      <div className={classes.rightSection}>
        <PlayerList />
        <MessageList />
      </div>
      <Modal show={show} />
    </div>
  );
}

//player list componenet
function PlayerList() {
  const { classes } = useStyles();
  const { handlers, players } = useContext(AppContext);

  const updateGame = (data) => {
    handlers.setState(data.players);
  };
  useEffect(() => {
    socket.on("game-update", updateGame);
    return () => {
      socket.off("game-update", updateGame);
    };
  }, []);

  return (
    <div className={classes.playerList}>
      <Text size="lg" style={{ paddingBottom: 5 }}>
        Players ({players.length})
      </Text>
      <ScrollArea
        scrollbarSize={8}
        offsetScrollbars
        classNames={{
          root: classes.scrollArea,
          scrollbar: classes.scrollbar,
          thumb: classes.thumb,
        }}
      >
        {players.map((p, index) => (
          <PlayerItem key={index} name={p.name} />
        ))}
      </ScrollArea>
    </div>
  );
}

//player list item
function PlayerItem({ name }) {
  const { classes } = useStyles();
  return (
    <Group spacing={"xs"} className={classes.playerItem}>
      <Avatar size="44" textSizeRatio={2} name={name} round />
      <Text size="xl" weight={500}>
        {name}
      </Text>
    </Group>
  );
}

//message list componenet
function MessageList() {
  const { classes } = useStyles();
  const [messageValue, setMessageValue] = useInputState("");
  const [messageList, handlers] = useListState([]);
  const { roomId, name, setIsTyping, isTyping } = useContext(AppContext);

  const receiveMessage = (message) => {
    handlers.append(message);
    console.log(message);
    scrollToBottom();
  };

  useEffect(() => {
    socket.on("message-to-chat", receiveMessage);
    return () => {
      socket.off("message-to-chat", receiveMessage);
    };
  }, [socket]);

  const sendMessage = (message) => {
    socket.emit("send-message", {
      roomID: roomId,
      chatMessage: name + ": " + message,
    });
  };

  const viewport = useRef();

  const scrollToBottom = () =>
    viewport.current.scrollTo({
      top: viewport.current.scrollHeight,
      behavior: "smooth",
    });

  return (
    <div className={classes.messageList}>
      {" "}
      <ScrollArea
        id="scroll"
        scrollbarSize={8}
        offsetScrollbars
        classNames={{
          root: classes.scrollArea,
          scrollbar: classes.scrollbar,
          thumb: classes.thumb,
        }}
        viewportRef={viewport}
      >
        {messageList.map((m, index) => {
          if (m.type == "chat") {
            return <MessageItem key={index} value={m.value} />;
          } else if (m.type == "system") {
            return <NotiItem key={index} value={m.value} />;
          }
        })}
      </ScrollArea>
      {/* Text input box */}
      <div className={classes.InputArea}>
        <input
          className={classes.InputField}
          onChange={setMessageValue}
          onFocus={() => {
            setIsTyping(true);
          }}
          onBlur={() => {
            setIsTyping(false);
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              sendMessage(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
        ></input>
      </div>
    </div>
  );
}

function NotiItem({ value }) {
  const { classes } = useStyles();
  return (
    <Text size="xl" weight={500} className={classes.NotiItem}>
      {value}
    </Text>
  );
}
// function MessageHead() {
//   const { classes } = useStyles();
//   return (
//     <Group className={classes.MessageHead}>
//       <Text size="md">Owen Wang:</Text>
//     </Group>
//   );
// }
function MessageItem({ value }) {
  const { classes } = useStyles();
  return (
    <Text size="md" className={classes.MessageItem}>
      {value}
    </Text>
  );
}

// Create styles using Mantine theme color
const useStyles = createStyles((theme) => ({
  playerList: {
    backgroundColor: theme.colors.ice[6],
    height: "45vh",
    color: "white",
    paddingInline: 10,
  },
  InputArea: {
    backgroundColor: theme.colors.ice[7],
    height: "6vh",
  },
  messageList: {
    "& #scroll": {
      height: "100%",
    },
    backgroundColor: theme.colors.ice[7],
    height: "49vh",
    color: "white",
  },
  roomPage: {
    display: "flex",
  },
  leftSection: {
    width: "68.75%",
    height: "100vh",
  },
  rightSection: {
    width: "31.25%",
    height: "100vh",
  },

  scrollArea: {
    height: "91%",
  },

  scrollbar: {
    backgroundColor: "transparent",
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  thumb: {
    backgroundColor: theme.colors.ice[2],
    "&:hover": {
      backgroundColor: theme.colors.ice[2],
    },
  },
  playerItem: {
    marginBottom: 8,
  },
  NotiItem: {
    backgroundColor: theme.colors.ice[5],
    paddingInline: 10,
    marginTop: 5,
  },
  MessageItem: {
    paddingInline: 10,
    wordBreak: "break-all",
    flex: 1,
    flexWrap: "wrap",
    color: theme.colors.white,
  },
  InputField: {
    backgroundColor: theme.colors.ice[6],
    margin: 8,
    borderRadius: 6,
    paddingInline: 8,
    color: "white",
    width: "96%",
    onKeyDown: "if(event.keyCode==13)",
    type: "text",
    height: "70%",
  },
}));
