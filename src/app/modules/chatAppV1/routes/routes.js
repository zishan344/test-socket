const { Router } = require("express");
const chatAppControllerV1 = require("../controller/chat.v1.controller");

const routes = Router();

const chatAppModuleRoutes = [
  {
    method: "get",
    path: "/",
    controller: chatAppControllerV1.testFirstRoute,
  },
  {
    method: "post",
    path: "/createChat",
    controller: chatAppControllerV1.createChatUser,
  },
  {
    method: "get",
    path: "/single/user/chatting/friend/list",
    controller: chatAppControllerV1.chatFriendListGetting,
  },
  {
    method: "post",
    path: "/send/message",
    controller: chatAppControllerV1.sendMessageRoom,
  },
  // {
  //   method: "post",
  //   path: "/edit/message",
  //   controller: chatAppControllerV1.editMessage,
  // },
  {
    method: "post",
    path: "/new/group/create",
    controller: chatAppControllerV1.newGroupCreate,
  },
  {
    method: "patch",
    path: "/edit/group/name",
    controller: chatAppControllerV1.editGroupName,
  },
  {
    method: "delete",
    path: "/group/member/block/:userId/:roomId",
    controller: chatAppControllerV1.groupMemberBlock,
  },
  {
    method: "delete",
    path: "/group/member/delete/:userId/:roomId",
    controller: chatAppControllerV1.groupMemberDelete,
  },
  {
    method: "get",
    path: "/all/conversion/message",
    controller: chatAppControllerV1.allConversionMessage,
  },
  {
    method: "post",
    path: "/view/message",
    controller: chatAppControllerV1.userViewMessage,
  },
];

chatAppModuleRoutes.forEach((route) =>
  routes.route(route.path)[route.method](route.controller)
);

module.exports = routes;
