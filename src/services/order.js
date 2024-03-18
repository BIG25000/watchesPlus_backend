const prisma = require("../config/prisma");
const { CustomError } = require("../config/error");

module.exports.findOrderOnWatchId = async (userId, watchId) => {
  //เอาทุก order ไป show ที่ product detail
  return await prisma.$transaction(async (tx) => {
    const myWallet = await tx.wallet.findUnique({
      where: { userId },
    });
    const foundAllBuyOrder = await tx.buyOrder.findMany({
      where: {
        watchId: watchId,
        status: "PENDING",
        NOT: {
          walletId: myWallet.id
        }
      },
      orderBy: {
        price: "asc",
      },
    });
    const foundAllSaleOrder = await tx.saleOrder.findMany({
      where: {
        inventory: {
          watchId: watchId,
          status: "SELLING",
          NOT: {
            userId: userId
          }
        },
      },
      orderBy: {
        price: "asc",
      },
    });
    return [foundAllBuyOrder, foundAllSaleOrder];
  });
};

module.exports.findMyOrder = async (userId) => {
  return await prisma.$transaction(async (tx) => {
    const myWallet = await tx.wallet.findUnique({
      where: { userId },
    });
    const myBuyOrder = await tx.buyOrder.findMany({
      where: {
        walletId: myWallet.id,
        status: "PENDING",
      },
    });
    const mySaleOrder = await tx.saleOrder.findMany({
      where: {
        status: "PENDING",
        inventory: {
          userId: userId,
          status: "SELLING",
        },
      },
    });
    return [myBuyOrder, mySaleOrder];
  });
};

module.exports.findMyAllOrder = async (userId) => {
  const activity = await prisma.$transaction(async (tx) => {
    const myWallet = await tx.wallet.findUnique({
      where: { userId },
    });
    const myBuyOrder = await tx.buyOrder.findMany({
      where: {
        walletId: myWallet.id,
        status: "PENDING",
      },
      include: { watch: { include: { brand: { select: { name: true } } } } },
    });
    const mySaleOrder = await tx.saleOrder.findMany({
      where: {
        status: "PENDING",
        inventory: {
          userId: userId,
          status: "SELLING",
        },
      },
      include: {
        inventory: {
          include: {
            watch: { include: { brand: { select: { name: true } } } },
          },
        },
      },
    });
    return { myBuyOrder, mySaleOrder };
  });
  const history = await prisma.$transaction(async (tx) => {
    const myWallet = await tx.wallet.findUnique({
      where: { userId },
    });
    const myBuyHistory = await tx.buyOrder.findMany({
      where: {
        walletId: myWallet.id,
        OR: [{ status: "CANCELED" }, { status: "SUCCESS" }],
      },
      include: { watch: { include: { brand: { select: { name: true } } } } },
    });
    const mySaleHistory = await tx.saleOrder.findMany({
      where: {
        OR: [{ status: "CANCELED" }, { status: "SUCCESS" }],
        inventory: {
          userId: userId,
          OR: [{ status: "AVAILABLE" }, { status: "SOLD" }],
        },
      },
      include: { inventory: { include: { watch: { include: { brand: { select: { name: true } } } } } } },
    });
    return { myBuyHistory, mySaleHistory };
  });
  return { activity, history };
};

module.exports.findSaleOrderToMatch = async (watchId, price, buyerId) => {
  return prisma.$transaction(async (tx) => {
    const foundSaleOrder = await tx.saleOrder.findFirst({
      where: {
        price: price,
        status: "PENDING",
        inventory: {
          watchId: watchId,
        },
        NOT: {
          inventory: {
            userId: buyerId,
          },
        },
      },
      include: {
        inventory: {
          //inventory.user.wallet.id //inventory.user.wallet.amount
          include: {
            user: {
              include: {
                wallet: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return foundSaleOrder;
  });
};

module.exports.findBuyOrderToMatch = async (inventoryId, price) => {
  return await prisma.$transaction(async (tx) => {
    const foundInventory = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    const foundOrder = await tx.buyOrder.findFirst({
      where: {
        price,
        watchId: foundInventory.watchId,
        status: "PENDING",
      },
    });
    return foundOrder;
  });
};

module.exports.createBuyOrder = async (buyerWallet, body) => {
  return await prisma.$transaction(async (tx) => {
    //1. หักเงินออกจาก wallet buyer
    const updateBuyerWallet = await tx.wallet.update({
      where: { id: buyerWallet.id },
      data: {
        amount: {
          decrement: body.price,
        },
      },
    });
    //2. create buyorder
    const createOrder = await tx.buyOrder.create({ data: body });
    // create placed transaction
    const createPlaceTransaction = await tx.transactionWallet.create({
      data: {
        fromWalletId: buyerWallet.id,
        price: body.price,
        type: "PLACED",
        buyOrderId: createOrder.id,
        watchId: createOrder.watchId
      },
    });
    return createOrder;
  });
};

module.exports.createSaleOrder = async (sellerId, inventoryId, price) => {
  return prisma.$transaction(async (tx) => {
    //2. update inventory ที่ watchId นั้นให้่เป็น SELLING
    const updateSellerInventory = await tx.inventory.update({
      where: {
        id: inventoryId,
        userId: sellerId,
      },
      data: {
        status: "SELLING",
      },
    });
    //3. สร้าง saleOrder
    const createSale = await tx.saleOrder.create({
      data: {
        inventoryId: inventoryId,
        price,
      },
    });
    return createSale;
  });
};

module.exports.updateBuyOrderToCancel = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // 1.update buyorder to cancel
    const updateBuyerOrder = await tx.buyOrder.update({
      where: { id: id },
      data: { status: "CANCELED" },
    });
    //2.คืนเงิน wallet
    const refundWallet = await tx.wallet.update({
      where: { id: updateBuyerOrder.walletId },
      data: {
        amount: {
          increment: updateBuyerOrder.price,
        },
      },
    });
    // 3.create refund transaction
    const createRefundTransaction = await tx.transactionWallet.create({
      data: {
        type: "REFUNDED",
        price: updateBuyerOrder.price,
        toWalletId: refundWallet.id,
      },
    });
    return refundWallet;
  });
};

module.exports.updateSaleOrderToCancel = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // 1.update saleOrder to cancel
    const updateSaleOrder = await tx.saleOrder.update({
      where: { id: id },
      data : { status : "CANCELED" }
    });
    //2. ค้นหา inventroy เก่า เพื่อเอาไปสร้างใหม่
    const foundInventory = await tx.inventory.update({
      where: { 
        id: updateSaleOrder.inventoryId ,
        status : "SELLING"
      },data : {
        status : "UNAVAILABLE"
      }
    
    });
    //3.คืนของ inventory
    const returnItem = await tx.inventory.create({
      data: {
        watchId : foundInventory.watchId,
        userId : foundInventory.userId,
        watchImage : foundInventory.watchImage,
        referenceNumber : foundInventory.referenceNumber,
        status: "AVAILABLE",
      },
    });
    return returnItem;
  });
};

module.exports.findMostBuyOrderAndSaleOrder = async () => {
  const mostBuyOrders = await prisma.buyOrder.groupBy({
    by: ['watchId'],
    _count: {
      watchId: true,
    },
    where: {
      status: 'PENDING',
    },
    orderBy: {
      _count: {
        watchId: 'desc',
      },
    },
    // take: 4,
  });

  // Fetching watch details for the grouped buy orders
  const resultsWithWatchDetails = await Promise.all(
    mostBuyOrders.map(async (groupedOrder) => {
      const watchDetails = await prisma.watch.findUnique({
        where: {
          id: groupedOrder.watchId,
        },
        include: { brand: true, wishlist: true }
      });
      return { ...groupedOrder, watch: watchDetails };
    })
  );

  return resultsWithWatchDetails;
};