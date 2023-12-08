const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 6000;

// database connection start
const mysql = require("mysql");

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DATABASE,
  connectTimeout: 30000,
});

// Function to handle database connection errors
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed: " + err.message);
  } else {
    console.log("Database connection is successful");
    connection.release(); // Release the connection back to the pool
  }
});
// database connection End

// custom package
const { v4: uuidv4 } = require("uuid");

// create chat
app.post("/createChat", async (req, res) => {
  const { users, message: reqMessage } = req.body;

  if (!users) {
    return res.status(400).json({
      status: false,
      message: "No user data provided",
    });
  }

  try {
    const roomId = uuidv4();
    const searchQueryUserPersonID = users.map((user) => [user.PersonID]);
    const roomData = [roomId, null];
    const searchQuery = `SELECT PersonID FROM elitepro_chat.users WHERE PersonID IN (?)`;
    const searchResult = await queryAsync(searchQuery, [
      searchQueryUserPersonID,
    ]);

    const newUser = users.filter(
      (user) =>
        !searchResult.some(
          (searchUser) => searchUser.PersonID === user.PersonID
        )
    );

    // console.log(newUser, "new user ");

    const createUserResult = await createUser(newUser);
    if (createUserResult?.success) {
      await createRoom(roomData);
      await createParticipation(newUser, roomId);
      if (reqMessage) {
        const checkMessagePerson = users.find(
          (user) => user?.PersonID === reqMessage?.messageUserId
        );
        if (checkMessagePerson) {
          const message = { ...reqMessage, messageRoomId: roomId };
          await sendMessage(message);
          res.status(200).json({
            status: true,
            message: "Chat created successfully",
          });
        } else {
          res.status(400).json({
            status: false,
            message: "Chat created successfully but message send fail!",
            error: "your message user id is not right",
          });
        }
      }
    } else {
      if (reqMessage) {
        const requestMessageQueryResult = await personIdThenRoomIdReturnFromDB(
          reqMessage
        );
        if (requestMessageQueryResult?.success) {
          res.status(200).json({
            status: true,
            message: "user already exists but message send successful",
          });
        } else {
          const { error } = requestMessageQueryResult;
          res.status(400).json({
            status: false,
            message: "user already exists and message send fail!",
            error: error.message,
          });
        }
      } else {
        res.status(200).json({
          status: true,
          message: "user already exists",
        });
      }
    }
  } catch (error) {
    console.error(error);
    throw new CustomErrorHandler("Failed to create chat", error, 400);
  }
});

async function queryAsync(query, values) {
  return new Promise((resolve, reject) => {
    pool.query(query, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// create user
async function createUser(users) {
  if (users.length === 0) {
    return {
      success: false,
    };
  }
  const insertUserQuery =
    "INSERT INTO elitepro_chat.users (PersonID, firstName, lastName, profilePic, accountType, webName) VALUES ?";

  const userValues = users.map((user) => [
    user.PersonID,
    user.firstName,
    user.lastName,
    user.profilePic,
    user.accountType,
    user.webName,
  ]);

  await queryAsync(insertUserQuery, [userValues]);
  return {
    success: true,
  };
}

// create room
async function createRoom(roomData) {
  const roomQuery =
    "INSERT INTO elitepro_chat.room (roomId, lastMessageId) VALUES ?";
  await queryAsync(roomQuery, [[roomData]]);
}

// create participation
async function createParticipation(userData, roomId) {
  if (userData.length === 0) {
    return;
  }
  const participateValues = userData.map((user) => [user.PersonID, roomId]);
  const participateQuery =
    "INSERT INTO elitepro_chat.participate (participateUserId, participateRoomId) VALUES ?";
  await queryAsync(participateQuery, [participateValues]);
  return {
    success: true,
  };
}

// user personId send then room id return
async function personIdThenRoomIdReturnFromDB(reqMessage) {
  const roomIdQuery =
    "SELECT participateRoomId FROM elitepro_chat.participate WHERE participateUserId = ?";
  const values = [reqMessage?.messageUserId];

  try {
    const result = await queryAsync(roomIdQuery, values);
    const sendMessageUserDAta = {
      ...reqMessage,
      messageRoomId: result[0]?.participateRoomId,
    };
    await sendMessage(sendMessageUserDAta);
    return { success: true, message: "send message is successful" };
  } catch (error) {
    return { success: false, error };
  }
}

// this is custom error handel class
class CustomErrorHandler extends Error {
  constructor(message, originalError, statusCode) {
    super(message);
    this.name = "CustomError";
    this.originalError = originalError;
    this.statusCode = statusCode || 500;
  }
}

// Global error handler middleware
app.use((err, req, res, next) => {
  // You can customize the response based on the type of error
  if (err instanceof CustomErrorHandler) {
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message,
      error: err,
    });
  }
  // Generic error response
  res.status(500).json({
    status: false,
    message: "Internal server error",
  });
});

app.post("/send/message", async (req, res) => {
  try {
    await sendMessage(req.body);
    res.status(200).json({
      status: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    // console.error(error);
    res.status(400).json({
      status: false,
      message: "Message sent fail",
      error: error.message,
    });
  }
});

// sending message
async function sendMessage(userMessageData) {
  const { messageRoomId, messageContent, messageUserId } = userMessageData;
  const messageId = uuidv4();
  const userMessage = [messageId, messageRoomId, messageContent, messageUserId];
  const sendMessageQuery =
    "INSERT INTO elitepro_chat.message (messageId, messageRoomId, messageContent, messageUserId) VALUES (?)";
  await queryAsync(sendMessageQuery, [userMessage]);
  await lastMessageIdInsert(messageId, messageRoomId);
}

// update last message
async function lastMessageIdInsert(messageId, roomId) {
  const updateLastMessageIdQuery =
    "UPDATE elitepro_chat.room SET lastMessageId = ? WHERE roomId = ?";

  await queryAsync(updateLastMessageIdQuery, [messageId, roomId]);
}

// edit message
app.post("/edit/message", async (req, res) => {
  try {
    const { messageId, messageContent } = req.body;

    const sendMessageQuery =
      "UPDATE elitepro_chat.message SET messageContent = ? WHERE messageId = ?";

    const userMessage = [messageContent, messageId];

    await queryAsync(sendMessageQuery, userMessage);

    res.status(200).json({
      status: true,
      message: "Message updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: "Message update failed",
      error: error.message,
    });
  }
});

// my all chat friends data
app.get("/my/chatting/friend/list", (req, res) => {
  const { uid } = req.headers;

  const roomQuery = `SELECT participateRoomId FROM elitepro_chat.participate WHERE participateUserId = '${uid}'`;

  pool.query(roomQuery, (err, roomResults) => {
    if (err) {
      console.error(err);
      return res.status(400).json({
        status: false,
        message: "Failed to fetch chat rooms",
        error: err.message,
      });
    }

    if (roomResults.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No chat rooms found for the user.",
        result: [],
      });
    }

    const roomId = roomResults[0].participateRoomId;

    const myChatQuery = `
    SELECT cu.*, mgs.messageId, mgs.messageContent, mgs.messageTimeStamp , rom.roomId, rom.groupName
    FROM elitepro_chat.participate p1
    INNER JOIN elitepro_chat.users cu ON p1.participateUserId = cu.PersonID
    INNER JOIN elitepro_chat.room rom ON p1.participateRoomId = rom.roomId
    LEFT JOIN elitepro_chat.message mgs ON rom.lastMessageId = mgs.messageId
    WHERE p1.participateRoomId = '${roomId}' AND p1.participateUserId != '${uid}';
  `;

    pool.query(myChatQuery, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(400).json({
          status: false,
          message: "Failed to fetch chat details",
          error: err.message,
        });
      } else {
        res.status(200).json({
          status: true,
          message: "Chat details fetched successfully.",
          result: results,
        });
      }
    });
  });
});

// group member add
app.post("/group/member/add", async (req, res) => {
  const {
    PersonID,
    firstName,
    lastName,
    profilePic,
    accountType,
    webName,
    participateUserId,
    participateRoomId,
  } = req.body;

  try {
    const userQuery = `SELECT PersonID FROM elitepro_chat.users WHERE PersonID = '${PersonID}'`;
    const result = await queryAsync(userQuery);

    if (result.length === 0) {
      await createUser([
        {
          PersonID,
          firstName,
          lastName,
          profilePic,
          accountType,
          webName,
        },
      ]);

      await createParticipationGroup({
        participateUserId,
        participateRoomId,
      });

      res.status(200).json({
        status: true,
        message: "Group member added successfully.",
      });
    } else {
      const participateMemberCheck = `SELECT * FROM elitepro_chat.participate WHERE participateUserId='${participateUserId}' AND participateRoomId='${participateRoomId}'`;

      const memberResult = await queryAsync(participateMemberCheck);

      if (memberResult.length === 0) {
        const participateQuery = "INSERT INTO elitepro_chat.participate SET ?";
        pool.query(
          participateQuery,
          [{ participateUserId, participateRoomId }],
          (err, result) => {
            if (err) {
              console.log(err);
              res.status(400).json({
                status: false,
                message: "Group member add failed.",
                error: err.message,
              });
            } else {
              console.log(result);
              res.status(200).json({
                status: true,
                message: "Group member added successfully.",
                result,
              });
            }
          }
        );
        console.log(memberResult, "This member does not exist");
      } else {
        console.log(memberResult, "This member already exists");
        res.status(200).json({
          status: true,
          message: "This member already exists.",
          memberResult,
        });
      }
    }
  } catch (error) {
    console.error("Error in /group/member/add:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// this is create Participation Group
async function createParticipationGroup(user) {
  const participateQuery = "INSERT INTO elitepro_chat.participate SET ?";

  await queryAsync(participateQuery, user);
}
// this is async handel function
async function queryAsync(query, params) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

// group name add
app.post("/group/name", async (req, res) => {
  console.log(req.body);
  const groupNameAddQuery = `UPDATE elitepro_chat.room SET groupName = ? WHERE roomId = ?`;
  const { roomId, groupName } = req.body;

  pool.query(groupNameAddQuery, [groupName, roomId], (err, result) => {
    if (err) {
      res.status(400).json({
        status: false,
        message: "Group name add fail",
        error: err.message,
      });
    } else {
      res.status(200).json({
        status: true,
        message: "Group name added successfully",
      });
    }
  });
});

// all conversion message getting
app.get("/all/conversion/message", (req, res) => {
  const { roomid } = req.headers;
  const messageQuery = `SELECT msg.*
  FROM elitepro_chat.room rom
  INNER JOIN elitepro_chat.message msg ON rom.roomId = msg.messageRoomId
  WHERE rom.roomId = ? ORDER BY msg.messageTimeStamp DESC LIMIT 10`;

  pool.query(messageQuery, [roomid], (err, result) => {
    if (err) {
      console.log(err);
      res.status(400).json({
        status: false,
        message: "Conversion message retrieval failed.",
        error: err.message,
      });
    } else {
      const reversedMessages = result.reverse();
      res.status(200).json({
        status: true,
        message: "Conversion message retrieval was successful.",
        result: reversedMessages,
      });
    }
  });
});

// server starting
app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "Hello Developer your chatting application server is running",
  });
});

app.all("*", (req, res) => {});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    socket.join(userData?.PersonID);
    socket.emit("connected");
  });

  socket.on("joinRoom", (roomId, userId) => {
    socket.join(roomId);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.messageRoomId).emit("newMessageReceived", data);
  });

  socket.on("startTyping", (roomId, userId) => {
    socket.to(roomId).emit("userTyping", { roomId, userId });
  });

  socket.on("stopTyping", (roomId, userId) => {
    socket.to(roomId).emit("userStoppedTyping", { roomId, userId });
  });

  socket.on("disconnect", () => {
    // console.log("User disconnected");
  });
});
