const { v4: uuidv4 } = require("uuid");
const chatAppServices = require("../service/chat.v1.service");
const { queryAsync } = require("../../../../../db/dbAsync");
const { catchAsyncTryCatch } = require("../../../utils/catchAsyncTryCatch");
const { sendResponse } = require("../../../utils/sendResponse");
const AppError = require("../../../middleware/customAppErrorHandler/customAppErrorHandler");

// this is test route
module.exports.testFirstRoute = (req, res) => {
  const id1 = uuidv4();
  const id2 = uuidv4();
  console.log(id1, id2);
  res.status(200).json({
    success: true,
    message: "chat app server is running and test route is working ",
    uid: {
      id1,
      id2,
    },
  });
};

// this is create user controller
module.exports.createChatUser = catchAsyncTryCatch(async (req, res) => {
  const { users, message: reqMessage } = req.body;

  if (!users) {
    sendResponse(res, {
      statusCode: 400,
      success: true,
      message: "No user data provided",
    });
    return;
  }

  const roomId = uuidv4();
  const searchQueryUserPersonID = users.map((user) => [user.PersonID]);
  const roomData = [roomId, null, null, null];
  const searchQuery = `SELECT PersonID FROM elitepro_chat.users WHERE PersonID IN (?)`;
  const searchResult = await queryAsync(searchQuery, [searchQueryUserPersonID]);
  const newUser = await users.filter(
    (user) =>
      !searchResult.some((searchUser) => searchUser.PersonID === user.PersonID)
  );
  //   console.log(newUser, "newUser");
  if (searchResult.length === users.length) {
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "user already exists",
    });
    return;
  }

  const createUserResult = await chatAppServices.createUserFromDB(newUser);
  if (createUserResult?.success) {
    await chatAppServices.createRoomFromDB(roomData);
    await chatAppServices.createParticipationFromDB(users, roomId);
    if (reqMessage) {
      const checkMessagePerson = users.find(
        (user) => user?.PersonID === reqMessage?.messageUserId
      );
      if (checkMessagePerson) {
        const message = { ...reqMessage, messageRoomId: roomId };
        await chatAppServices.sendMessageFromDB(message);
        sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Chat created successfully",
        });
        return;
      } else {
        sendResponse(res, {
          statusCode: 400,
          success: true,
          message:
            "The message sent does not match the user id please check it!",
        });
        return;
      }
    }
  }
});

// this is chatting friend list getting controller
module.exports.chatFriendListGetting = catchAsyncTryCatch(
  async (req, res, next) => {
    const { uid } = req.headers;
    if (!uid) {
      throw new AppError(
        "User person id is missing please provide user person id.",
        400
      );
    }
    const roomIdFromDB = await chatAppServices.receivedUidReturnRoomIdFromDB(
      uid
    );

    if (roomIdFromDB.length === 0) {
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "No chat rooms found for the user.",
      });
      return;
    }
    const chatList = await chatAppServices.userChatFriendListFromDB({
      roomIdFromDB,
      uid,
    });
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Chat details fetched successfully.",
      result: chatList,
    });
  }
);

// this is group member delete controller
module.exports.groupMemberBlock = catchAsyncTryCatch(async (req, res) => {
  const result = await chatAppServices.groupParticipateUserCheckFromDB(
    req.params
  );

  console.log(result[0].id, "result");
  if (result.length === 0) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message:
        "wrong your user id and room id please send right user id and room id.",
    });
    return;
  }

  await chatAppServices.groupParticipateUserBlockFromDB(result[0].id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "user delete successfully.",
  });
});
// this is group member delete controller
module.exports.groupMemberDelete = catchAsyncTryCatch(
  async (req, res, next) => {
    const result = await chatAppServices.groupParticipateUserCheckFromDB(
      req.params
    );

    console.log(result[0].id, "result");
    if (result.length === 0) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message:
          "wrong your user id and room id please send right user id and room id.",
      });
      return;
    }

    await chatAppServices.groupParticipateUserDeleteFromDB(result[0].id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "user delete successfully.",
    });
  }
);

// this is send message room controller
module.exports.sendMessageRoom = catchAsyncTryCatch(async (req, res) => {
  await chatAppServices.sendMessageFromDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Message sent successfully.",
  });
});

// // this is edit message controller
// module.exports.editMessage = catchAsyncTryCatch(async (req, res, ) => {
//   console.log(req.body);
//   const result = await chatAppServices.editMessageFromDB(req.body);
//   // sendResponse(res, {
//   //   statusCode: 200,
//   //   success: true,
//   //   message: "Message sent successfully.",
//   // });
// });

// this is new group create function
module.exports.newGroupCreate = catchAsyncTryCatch(async (req, res) => {
  const participateRoomId = uuidv4();
  const { admin, member } = req.body;
  if (!(member.length >= 3)) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "minimum 4 members add pleas",
    });
    return;
  }
  const roomData = [
    participateRoomId,
    null,
    admin?.groupName,
    admin?.groupAdminPersonId,
  ];
  await chatAppServices.createRoomFromDB(roomData);
  let newGroupMember = [[admin?.groupAdminPersonId, participateRoomId]];
  member.forEach((user) => {
    const newUser = [user.participateUserId, participateRoomId];
    newGroupMember.push(newUser);
  });
  await chatAppServices.groupParticipateUserInsertFromDB(newGroupMember);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "new group create successfully.",
  });
});
// this is edit group name
module.exports.editGroupName = catchAsyncTryCatch(async (req, res) => {
  const result = await chatAppServices.editGroupNameFromDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "edit group name is successfully.",
    result,
  });
});

// this is all conversion message get function
module.exports.allConversionMessage = catchAsyncTryCatch(
  async (req, res, next) => {
    const result = await chatAppServices.allConversionMessageFromDB(
      req.headers
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "all conversion fetching successfully.",
      result,
    });
  }
);
// this is user conversion message view data inseart function
module.exports.userViewMessage = catchAsyncTryCatch(async (req, res) => {
  const result = await chatAppServices.userViewMessageFromDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Message sent successfully.",
    result,
  });
});
