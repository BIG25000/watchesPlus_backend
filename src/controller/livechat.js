const catchError = require("../utils/catch-error");
const createError = require("../utils/create-error");

const {
  createChatroomService,
  createMessageService,
  getConversationService,
  getUserByIdService,
  getChatRoomService,
  getALlChatroom,
  getChatRoomAdminService,
  getAllConversationService,
  sortNewChat,
} = require("../services/livechat");

exports.createChatRoom = catchError(async (req, res, next) => {
  const { userId, adminId } = req.body;

  // Need more validate

  //   console.log(req.body);
  if (userId === adminId) {
    createError("You're cannot chat with yourself");
  }

  const chatRoom = await createChatroomService(userId, adminId);

  res.status(200).json({ chatRoom });
});

module.exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.body;
    console.log(req.body, "id-------------------------");
    const user = await getUserByIdService(userId);
    delete user.password;
    res.status(200).json({ user });
  } catch (err) {
    console.log(err);
    next(err);
  }
  return;
};

exports.getChatroom = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { userId, adminId } = req.body;

    if (id === adminId) {
      createError("Both user must not be the same");
    }

    const chatRoom = await getChatRoomService(userId);
    res.status(201).json({ chatRoom });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.createMessage = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { receiverId, message, chatRoomId } = req.body;

    if (id === receiverId) {
      createError("You're cannot chat with yourself");
    }

    const isMessage = await createMessageService(
      id,
      receiverId,
      chatRoomId,
      message
    );

    res.status(201).json({ isMessage });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const { chatRoomId } = req.body;
    const conversation = await getConversationService(chatRoomId);
    res.status(200).json({ conversation });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

///////////////////////////////////////////////////////////////////////

exports.getAllChatroomUser = async (req, res, next) => {
  try {
    const data = await getALlChatroom();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.getChatRoomAdmin = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { userId } = req.body;

    if (id === userId) {
      createError("Both user must not be the same");
    }

    const chatRoom = await getChatRoomAdminService(userId, id);
    res.status(201).json({ chatRoom });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getAllConversation = async (req, res, next) => {
  try {
    const sort = await sortNewChat();
    res.status(200).json({ sort });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
