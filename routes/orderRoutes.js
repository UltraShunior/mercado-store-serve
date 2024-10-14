const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Create new order
router.post('/', protect, async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    }

    const order = await prisma.order.create({
      data: {
        user: { connect: { id: req.user.id } },
        orderItems: {
          create: orderItems.map(item => ({
            product: { connect: { id: item.product } },
            name: item.name,
            qty: item.qty,
            image: item.image,
            price: item.price,
          })),
        },
        shippingAddress: { create: shippingAddress },
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      },
      include: {
        orderItems: true,
        shippingAddress: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: true,
        shippingAddress: true,
        paymentResult: true,
      },
    });
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order to paid
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: {
          create: {
            status: req.body.status,
            updateTime: req.body.update_time,
            emailAddress: req.body.payer.email_address,
          },
        },
      },
      include: { paymentResult: true },
    });
    res.json(order);
  } catch (error) {
    res.status(404).json({ message: 'Order not found' });
  }
});

// Get logged in user orders
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { orderItems: true },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (Admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;