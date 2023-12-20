const { v4: uuidv4 } = require("uuid");
const { queryAsync } = require("../../../../../db/dbAsync");

// create user service
const createUserFromDB = async (users) => {
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
    user.userRole,
    user.webName,
  ]);

  await queryAsync(insertUserQuery, [userValues]);
  return {
    success: true,
  };
};

// create room service
const createRoomFromDB = async (roomData) => {
  const roomQuery =
    "INSERT INTO elitepro_chat.room (roomId, lastMessageId, groupName, groupAdminPersonId) VALUES ?";
  await queryAsync(roomQuery, [[roomData]]);
};

// create participation service
const createParticipationFromDB = async (userData, roomId) => {
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
};

// sending message service
const sendMessageFromDB = async (userMessageData) => {
  const { messageRoomId, messageContent, messageUserId } = userMessageData;
  const messageId = uuidv4();
  const userMessage = [messageId, messageRoomId, messageContent, messageUserId];
  const sendMessageQuery =
    "INSERT INTO elitepro_chat.message (messageId, messageRoomId, messageContent, messageUserId) VALUES (?)";
  await queryAsync(sendMessageQuery, [userMessage]);
  await lastMessageIdInsertFromDB(messageId, messageRoomId);
};

// update last message service
const lastMessageIdInsertFromDB = async (messageId, roomId) => {
  const updateLastMessageIdQuery =
    "UPDATE elitepro_chat.room SET lastMessageId = ? WHERE roomId = ?";

  await queryAsync(updateLastMessageIdQuery, [messageId, roomId]);
};

// this is function received user personId and return room id service
const receivedUidReturnRoomIdFromDB = async (uid) => {
  const roomQuery = `SELECT participateRoomId FROM elitepro_chat.participate WHERE participateUserId = ?`;
  const results = await queryAsync(roomQuery, [uid]);
  return results;
};

// this function received  user personId and roomId then return chat friend list
const userChatFriendListFromDB = async (data) => {
  const { roomIdFromDB, PersonID } = data;
  const roomIds = roomIdFromDB.map((row) => row.participateRoomId).join("','");
  const myChatQuery = `
    SELECT cu.*, mgs.messageId, mgs.messageContent, mgs.messageTimeStamp, rom.roomId, rom.groupName, rom.lastMessageId, p1.isDelete
    FROM elitepro_chat.participate p1
    INNER JOIN elitepro_chat.users cu ON p1.participateUserId = cu.PersonID
    INNER JOIN elitepro_chat.room rom ON p1.participateRoomId = rom.roomId
    LEFT JOIN elitepro_chat.message mgs ON rom.lastMessageId = mgs.messageId
    WHERE p1.participateRoomId IN ('${roomIds}')
      AND p1.participateUserId != '${String(PersonID)}';
  `;
  const results = await queryAsync(myChatQuery);
  console.log(results);
  const groupedData = {};
  results.forEach((item) => {
    const { roomId, groupName, messageContent, lastMessageId } = item;

    if (!groupedData[roomId]) {
      groupedData[roomId] = {
        roomId,
        groupName,
        messageContent,
        lastMessageId,
        participants: [],
      };
    }

    const {
      PersonID,
      firstName,
      lastName,
      profilePic,
      accountType,
      webName,
      createUserTimeStamp,
      messageId,

      messageTimeStamp,
      isDelete,
    } = item;

    groupedData[roomId].participants.push({
      PersonID,
      firstName,
      lastName,
      profilePic,
      accountType,
      webName,
      createUserTimeStamp,
      messageId,
      messageTimeStamp,
      isDelete,
    });
  });
  const result = Object.values(groupedData);
  return result;
};

// this is group user check from db
const groupParticipateUserCheckFromDB = async (payload) => {
  const { userId: participateUserId, roomId: participateRoomId } = payload;
  const participateQuery = `
    SELECT id
    FROM elitepro_chat.participate
    WHERE participateUserId = ? AND participateRoomId = ?
  `;
  const result = await queryAsync(participateQuery, [
    participateUserId,
    participateRoomId,
  ]);
  return result;
};

// this is group user Block from db
const groupParticipateUserBlockFromDB = async (id) => {
  const participateQuery = `UPDATE elitepro_chat.participate SET isDelete = 'block' WHERE id = ?`;
  await queryAsync(participateQuery, [id]);
};
// this is group user delete from db
const groupParticipateUserDeleteFromDB = async (id) => {
  const participateQuery = `UPDATE elitepro_chat.participate SET isDelete = 'delete' WHERE id = ?`;
  await queryAsync(participateQuery, [id]);
};

// this is group participate User add from DB
const groupParticipateUserInsertFromDB = async (payload) => {
  const participateQuery =
    "INSERT INTO elitepro_chat.participate (participateUserId, participateRoomId) VALUES ?";
  await queryAsync(participateQuery, [payload]);
};

// this is all conversion message getting from DB

const allConversionMessageFromDB = async (payload) => {
  const { roomid: roomId } = payload;
  const messageQuery = `
    SELECT msg.*
    FROM elitepro_chat.room rom
    INNER JOIN elitepro_chat.message msg ON rom.roomId = msg.messageRoomId
    WHERE rom.roomId = ? ORDER BY msg.messageTimeStamp DESC LIMIT 10
  `;
  const message = await queryAsync(messageQuery, [roomId]);

  const viewMessage = `
    SELECT *
    FROM elitepro_chat.userViewMessage
    WHERE viewUserId IN ('${message
      .map((message) => message.messageUserId)
      .join("','")}')
      AND messageId IN ('${message
        .map((message) => message.messageId)
        .join("','")}')
  `;
  const viewMessageResult = await queryAsync(viewMessage);
  const resultArray = message.map((msg) => {
    return {
      message: msg,
      viewMessageResult: viewMessageResult.filter(
        (viewMsg) => viewMsg.messageId === msg.messageId
      ),
    };
  });
  return resultArray;
};

// this is user view message data insert from DB
const userViewMessageFromDB = async (payload) => {
  const { viewUserId, messageId } = payload;
  const messageQuery = `
    INSERT INTO elitepro_chat.userViewMessage (viewUserId, messageId)
    VALUES (?, ?)
  `;
  const result = await queryAsync(messageQuery, [viewUserId, messageId]);
  return result;
};

// user personId send then room id return service
const personIdThenRoomIdReturnFromDB = async (reqMessage) => {
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
};

module.exports = {
  createUserFromDB,
  createRoomFromDB,
  createParticipationFromDB,
  sendMessageFromDB,
  lastMessageIdInsertFromDB,
  receivedUidReturnRoomIdFromDB,
  userChatFriendListFromDB,
  groupParticipateUserCheckFromDB,
  groupParticipateUserBlockFromDB,
  groupParticipateUserDeleteFromDB,
  groupParticipateUserInsertFromDB,
  allConversionMessageFromDB,
  userViewMessageFromDB,
};
