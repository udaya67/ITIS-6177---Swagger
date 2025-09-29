const express = require("express");
const mariadb = require("mariadb");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const { body, param, validationResult } = require("express-validator");
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student & Customer API',
      version: '1.0.0',
      description: 'API documentation with Swagger',
    },
    servers: [
      {
        url: `http://161.35.136.18:3000`, // your server IP + port
      },
    ],
  },
  apis: [path.join(__dirname, 'server.js')], // Path to your API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Connection pool (small to avoid overload)
const pool = mariadb.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "sample",
  connectionLimit: 100
});
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Orders API
/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get first 10 orders
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       500:
 *         description: Server error
 */
app.get("/orders", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM orders LIMIT 10");
    res.status(200).json({ total: rows.length, orders: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Customers API
/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get first 10 customers
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       500:
 *         description: Server error
 */

app.get("/customers", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM customer LIMIT 10");
    res.status(200).json({ total: rows.length, customers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Students API
/**
 * @swagger
 * /students:
 *   get:
 *     summary: Get first 10 students
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       500:
 *         description: Server error
 */
app.get("/students", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM student LIMIT 10");
    res.status(200).json({ total: rows.length, students: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ORD_AMOUNT
 *               - ADVANCE_AMOUNT
 *               - ORD_DATE
 *               - CUST_CODE
 *               - AGENT_CODE
 *               - ORD_DESCRIPTION
 *             properties:
 *               ORD_AMOUNT:
 *                 type: number
 *                 example: 5000
 *               ADVANCE_AMOUNT:
 *                 type: number
 *                 example: 1000
 *               ORD_DATE:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-28"
 *               CUST_CODE:
 *                 type: string
 *                 example: "C00001"
 *               AGENT_CODE:
 *                 type: string
 *                 example: "A003"
 *               ORD_DESCRIPTION:
 *                 type: string
 *                 example: "New order description"
 *     responses:
 *       201:
 *         description: Order created successfully
*         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ORD_NUM:
 *                   type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
app.post(
  "/orders",
  [
    body("ORD_AMOUNT").isFloat({ min: 0 }).withMessage("ORD_AMOUNT must be a positive number"),
    body("ADVANCE_AMOUNT").isFloat({ min: 0 }).withMessage("ADVANCE_AMOUNT must be a positive number"),
    body("ORD_DATE").isDate().withMessage("ORD_DATE must be a valid date"),
    body("CUST_CODE").notEmpty().withMessage("CUST_CODE is required").trim(),
    body("AGENT_CODE").notEmpty().withMessage("AGENT_CODE is required").trim(),
    body("ORD_DESCRIPTION").notEmpty().withMessage("ORD_DESCRIPTION is required").trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let conn;
    try {
      conn = await pool.getConnection();

      // Generate next ORD_NUM
      const result = await conn.query("SELECT MAX(ORD_NUM) AS maxNum FROM orders");
      const newOrderNum = (result[0].maxNum || 0) + 1;

      // Insert new order
      await conn.query(
        "INSERT INTO orders (ORD_NUM, ORD_AMOUNT, ADVANCE_AMOUNT, ORD_DATE, CUST_CODE, AGENT_CODE, ORD_DESCRIPTION) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          newOrderNum,
          req.body.ORD_AMOUNT,
          req.body.ADVANCE_AMOUNT,
          req.body.ORD_DATE,
          req.body.CUST_CODE,
          req.body.AGENT_CODE,
          req.body.ORD_DESCRIPTION,
                  ]
      );

      res.status(201).json({ message: "Order created successfully", ORD_NUM: newOrderNum });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) conn.release();
    }
  }
);


/**
 * @swagger
 * /orders/{ORD_NUM}:
 *   put:
 *     summary: Replace an order completely
 *     parameters:
 *       - in: path
 *         name: ORD_NUM
 *         required: true
 *         schema:
 *           type: integer
 *         description: The order number to replace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ORD_AMOUNT
 *               - ADVANCE_AMOUNT
 *               - ORD_DATE
 *               - CUST_CODE
 *               - AGENT_CODE
 *             properties:
 *               ORD_AMOUNT:
 *                 type: number
 *               ADVANCE_AMOUNT:
 *                 type: number
 *               ORD_DATE:
 *                 type: string
 *                 format: date
 *               CUST_CODE:
 *                 type: string
 *               AGENT_CODE:
*                 type: string
 *               ORD_DESCRIPTION:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
app.put(
  "/orders/:ORD_NUM",
  [
    param("ORD_NUM").isInt(),
    body("ORD_AMOUNT").isDecimal(),
    body("ADVANCE_AMOUNT").isDecimal(),
    body("ORD_DATE").isISO8601(),
    body("CUST_CODE").isString().trim().escape(),
    body("AGENT_CODE").isString().trim().escape(),
    body("ORD_DESCRIPTION").isString().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let conn;
    const { ORD_NUM } = req.params;
    const { ORD_AMOUNT, ADVANCE_AMOUNT, ORD_DATE, CUST_CODE, AGENT_CODE, ORD_DESCRIPTION } = req.body;

    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        "UPDATE orders SET ORD_AMOUNT=?, ADVANCE_AMOUNT=?, ORD_DATE=?, CUST_CODE=?, AGENT_CODE=?, ORD_DESCRIPTION=? WHERE ORD_NUM=?",
        [ORD_AMOUNT, ADVANCE_AMOUNT, ORD_DATE, CUST_CODE, AGENT_CODE, ORD_DESCRIPTION, ORD_NUM]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Order not found" });
      res.json({ message: "Order updated", ORD_NUM });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) conn.release();
    }
  }
  );

/**
 * @swagger
 * /orders/{ORD_NUM}:
 *   patch:
 *     summary: Partially update an order
 *     parameters:
 *       - in: path
 *         name: ORD_NUM
 *         required: true
 *         schema:
 *           type: integer
 *         description: The order number to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ORD_AMOUNT:
 *                 type: number
 *               ADVANCE_AMOUNT:
 *                 type: number
 *               ORD_DATE:
 *                 type: string
 *                 format: date
 *               CUST_CODE:
 *                 type: string
 *               AGENT_CODE:
 *                 type: string
 *               ORD_DESCRIPTION:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order partially updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
app.patch(
  "/orders/:ORD_NUM",
  [
    param("ORD_NUM").isInt().withMessage("ORD_NUM must be an integer"),
    body("ORD_AMOUNT").optional().isFloat({ min: 0 }),
    body("ADVANCE_AMOUNT").optional().isFloat({ min: 0 }),
    body("ORD_DATE").optional().isDate(),
    body("CUST_CODE").optional().isLength({ min: 1 }),
    body("AGENT_CODE").optional().isLength({ min: 1 }),
    body("ORD_DESCRIPTION").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updates = [];
    const values = [];
    for (const key in req.body) {
      updates.push(`${key}=?`);
      values.push(req.body[key]);
    }
    values.push(req.params.ORD_NUM);

    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(`UPDATE orders SET ${updates.join(", ")} WHERE ORD_NUM=?`, values);

      if (result.affectedRows === 0) return res.status(404).json({ message: "Order not found" });
      res.status(200).json({ message: "Order partially updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) conn.release();
    }
  }
);


/**
 * @swagger
 * /orders/{ORD_NUM}:
 *   delete:
 *     summary: Delete an order
 *     parameters:
 *       - in: path
 *         name: ORD_NUM
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
app.delete("/orders/:ORD_NUM", [param("ORD_NUM").isInt()], async (req, res) => {
  let conn;
  const { ORD_NUM } = req.params;
  try {
    conn = await pool.getConnection();
    const result = await conn.query("DELETE FROM orders WHERE ORD_NUM=?", [ORD_NUM]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted", ORD_NUM });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`✅   Server running at http://161.35.136.18:${port}`);
console.log(`📖  Swagger docs available at http://161.35.136.18:${port}/docs`);
});

