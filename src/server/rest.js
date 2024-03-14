//=====================================================Imported Zone
const express = require("express");
const { json, urlencoded } = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const prisma = require("../config/prisma");

//=====================================================local consted Zone

const { notFound } = require("../middlewares/notFound");
const { errorMiddlewares } = require("../middlewares/error");

const CustomError = require("../config/error");
const userRoute = require("../router/user");
const orderRoute = require("../router/order");
const brandRoute = require("../router/brand");
const watchRoute = require("../router/watch");
const inventoryRoute = require("../router/inventory");
const walletRoute = require("../router/wallet");
const authenticate = require("../middlewares/authenticate");
const livechatRoute = require("../router/livechat");
const profileRoute = require("../router/profile");
const transactionRoute = require("../router/transaction");
const shippingRoute = require("../router/shipping");
const wishlistRoute = require("../router/wishlist");
const addressRoute = require("../router/address");
const mailRoute = require("../router/mail");

//=====================================================Server Zone
module.exports = function restApiServer(app, server) {
  //=====================================================Encoding Zone
  app.use(morgan("dev"));
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: false }));
  app.use(express.static("public"));

  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  app.get("", (req, res) => {
    res.json({ msg: "test socket" });
  });

  const onlineUser = {};

  io.use((socket, next) => {
    const authUser = socket.handshake.auth.senderId;
    console.log(socket.handshake.auth, "auth");
    onlineUser[authUser] = socket.id;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Client is connected");
    console.log(onlineUser, "onlineUser");

    socket.on("message", async (data) => {
      const { receiverId, msg, chatRoomId } = data;
      const res = await prisma.chatMessage.create({
        data: {
          senderId: socket.handshake.auth.senderId,
          receiverId: +receiverId,
          message: msg,
          chatRoomId: +chatRoomId,
        },
        include: {
          sender: true,
          receiver: true,
        },
      });
      console.log(res, "res");
      io.to([
        onlineUser[socket.handshake.auth.senderId],
        onlineUser[receiverId],
      ]).emit("message1", { receiverId: receiverId, ...res });
    });

    socket.on("disconnect", () => {
      console.log("Client is disconnected");
    });
  });
  //=====================================================Routing Zone
  // app.use("/ping", (req, res, next) => {
  //   try {
  //     console.log("Checking the API status: Everything is OK");
  //     res.status(200).json("pong");
  //   } catch (error) {
  //     next(new CustomError("Ping Error", "NotFoundData", 500));
  //   }
  // });
  app.use("/auth", userRoute);
  app.use("/order", orderRoute);
  app.use("/brand", brandRoute);
  app.use("/watch", watchRoute);
  app.use("/inventory", inventoryRoute);
  app.use("/wallet", walletRoute);
  app.use("/livechat", authenticate, livechatRoute);
  app.use("/profile", profileRoute);
  app.use("/transaction", transactionRoute);
  app.use("/shipping", shippingRoute);
  app.use("/wishlist", wishlistRoute);
  app.use("/address", addressRoute);
  app.use("/mail", mailRoute);

  //=====================================================Throwing Zone
  app.use(notFound);
  app.use(errorMiddlewares);
};
