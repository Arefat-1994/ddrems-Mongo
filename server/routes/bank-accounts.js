const express = require("express");
const router = express.Router();
const { BankAccounts } = require("../models");

// Get all active bank accounts (for customers to see)
router.get("/active", async (req, res) => {
  try {
    const accounts = await BankAccounts.find({ status: 'active' }).sort({ bank_name: 1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin: Get all bank accounts
router.get("/", async (req, res) => {
  try {
    const accounts = await BankAccounts.find().sort({ created_at: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin: Add a new bank account
router.post("/", async (req, res) => {
  try {
    const { bank_name, account_number, account_name, type, status } = req.body;
    const newAccount = new BankAccounts({
      bank_name,
      account_number,
      account_name: account_name || 'DDREMS',
      type: type || 'bank',
      status: status || 'active'
    });
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ message: "Failed to create account", error: error.message });
  }
});

// Admin: Update bank account status or details
router.put("/:id", async (req, res) => {
  try {
    const { bank_name, account_number, account_name, type, status } = req.body;
    const account = await BankAccounts.findById(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });

    if (bank_name) account.bank_name = bank_name;
    if (account_number) account.account_number = account_number;
    if (account_name) account.account_name = account_name;
    if (type) account.type = type;
    if (status) account.status = status;
    account.updated_at = new Date();

    await account.save();
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: "Failed to update account", error: error.message });
  }
});

// Admin: Delete a bank account
router.delete("/:id", async (req, res) => {
  try {
    await BankAccounts.findByIdAndDelete(req.params.id);
    res.json({ message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
});

module.exports = router;
