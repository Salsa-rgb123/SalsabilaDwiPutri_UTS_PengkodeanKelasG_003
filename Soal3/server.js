'use strict';

const crypto = require('node:crypto');
const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3000;
const transactions = new Map();
const checksumSecret = process.env.CHECKSUM_SECRET || 'development-only-change-this-secret';

if (!process.env.CHECKSUM_SECRET) {
  console.warn('Set CHECKSUM_SECRET before using this server outside local development.');
}

app.use(express.json({ limit: '1mb' }));

// Demo identity only. Production authentication must set req.user from a verified session or token.
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production' && !req.user && req.get('x-user-id')) {
    req.user = { id: req.get('x-user-id') };
  }
  next();
});

function auditPayload(transaction) {
  // created_by comes from the authenticated principal; created_at is set once at creation.
  // hash_checksum is an HMAC-SHA-256 over this canonical payload; verify it via the /verify route.
  // Keep CHECKSUM_SECRET stable and private. Persist records and enforce immutability in the DB in production.
  return {
    id: transaction.id,
    status: transaction.status,
    description: transaction.description,
    entries: transaction.entries,
    created_by: transaction.created_by,
    created_at: transaction.created_at,
    posted_by: transaction.posted_by,
    posted_at: transaction.posted_at,
    reversal_of: transaction.reversal_of
  };
}

function calculateChecksum(transaction) {
  return crypto
    .createHmac('sha256', checksumSecret)
    .update(JSON.stringify(auditPayload(transaction)))
    .digest('hex');
}

function checksumIsValid(transaction) {
  const expected = Buffer.from(calculateChecksum(transaction), 'hex');
  const stored = Buffer.from(transaction.hash_checksum || '', 'hex');
  return expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
}

function refreshChecksum(transaction) {
  transaction.hash_checksum = calculateChecksum(transaction);
  return transaction;
}

function requireActor(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function loadTransaction(req, res, next) {
  const transaction = transactions.get(req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
  req.transaction = transaction;
  next();
}

function blockPostedMutation(req, res, next) {
  if (req.transaction.status === 'POSTED') {
    return res.status(409).json({
      error: 'Posted transactions are immutable. Create a reversal (storno) instead.',
      code: 'POSTED_TRANSACTION_IMMUTABLE'
    });
  }
  next();
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { error: 'entries must be a non-empty array.' };
  }

  const normalized = [];
  for (const entry of entries) {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    if (
      !entry.account ||
      !Number.isSafeInteger(debit) || debit < 0 ||
      !Number.isSafeInteger(credit) || credit < 0 ||
      (debit > 0 && credit > 0) ||
      (debit === 0 && credit === 0)
    ) {
      return { error: 'Each entry needs an account and one non-negative whole-rupiah debit or credit amount.' };
    }
    normalized.push({
      account: String(entry.account),
      description: String(entry.description || ''),
      debit,
      credit
    });
  }
  return { entries: normalized };
}

function entriesAreBalanced(entries) {
  const debit = entries.reduce((total, entry) => total + entry.debit, 0);
  const credit = entries.reduce((total, entry) => total + entry.credit, 0);
  return Number.isSafeInteger(debit) && Number.isSafeInteger(credit) && debit === credit;
}

function newTransaction({ description, entries, createdBy, status = 'DRAFT', reversalOf = null }) {
  const now = new Date().toISOString();
  const transaction = {
    id: crypto.randomUUID(),
    status,
    description: String(description || ''),
    entries,
    created_by: createdBy,
    created_at: now,
    posted_by: status === 'POSTED' ? createdBy : null,
    posted_at: status === 'POSTED' ? now : null,
    reversal_of: reversalOf,
    hash_checksum: ''
  };
  return refreshChecksum(transaction);
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/transactions', (_req, res) => {
  res.json(Array.from(transactions.values()));
});

app.get('/api/transactions/:id', loadTransaction, (req, res) => {
  res.json({ ...req.transaction, integrity_valid: checksumIsValid(req.transaction) });
});

app.get('/api/transactions/:id/verify', loadTransaction, (req, res) => {
  const valid = checksumIsValid(req.transaction);
  res.status(valid ? 200 : 409).json({
    transaction_id: req.transaction.id,
    integrity_valid: valid
  });
});

app.post('/api/transactions', requireActor, (req, res) => {
  const result = normalizeEntries(req.body && req.body.entries);
  if (result.error) return res.status(400).json({ error: result.error });

  const transaction = newTransaction({
    description: req.body.description,
    entries: result.entries,
    createdBy: String(req.user.id)
  });
  transactions.set(transaction.id, transaction);
  res.status(201).json(transaction);
});

function updateDraft(req, res) {
  const transaction = req.transaction;
  const body = req.body || {};

  if (typeof body.description === 'string') transaction.description = body.description;
  if (body.entries !== undefined) {
    const result = normalizeEntries(body.entries);
    if (result.error) return res.status(400).json({ error: result.error });
    transaction.entries = result.entries;
  }

  refreshChecksum(transaction);
  res.json(transaction);
}

const draftMutationGuards = [requireActor, loadTransaction, blockPostedMutation];
app.put('/api/transactions/:id', draftMutationGuards, updateDraft);
app.patch('/api/transactions/:id', draftMutationGuards, updateDraft);
app.delete('/api/transactions/:id', draftMutationGuards, (req, res) => {
  transactions.delete(req.transaction.id);
  res.status(204).end();
});

app.post('/api/transactions/:id/post', requireActor, loadTransaction, (req, res) => {
  const transaction = req.transaction;
  if (transaction.status !== 'DRAFT') {
    return res.status(409).json({ error: 'Only DRAFT transactions can be posted.' });
  }
  if (!entriesAreBalanced(transaction.entries)) {
    return res.status(422).json({ error: 'Debits and credits must balance before posting.' });
  }

  transaction.status = 'POSTED';
  transaction.posted_by = String(req.user.id);
  transaction.posted_at = new Date().toISOString();
  refreshChecksum(transaction);
  res.json(transaction);
});

app.post('/api/transactions/:id/storno', requireActor, loadTransaction, (req, res) => {
  const original = req.transaction;
  if (original.status !== 'POSTED') {
    return res.status(409).json({ error: 'Only POSTED transactions can be reversed.' });
  }
  const alreadyReversed = Array.from(transactions.values()).some(item => item.reversal_of === original.id);
  if (alreadyReversed) {
    return res.status(409).json({ error: 'This transaction already has a reversal.' });
  }

  const reversalEntries = original.entries.map(entry => ({
    account: entry.account,
    description: entry.description ? 'Storno: ' + entry.description : 'Storno',
    debit: entry.credit,
    credit: entry.debit
  }));
  const reversal = newTransaction({
    description: 'Storno transaksi ' + original.id,
    entries: reversalEntries,
    createdBy: String(req.user.id),
    status: 'POSTED',
    reversalOf: original.id
  });
  transactions.set(reversal.id, reversal);
  res.status(201).json(reversal);
});

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
  app.listen(port, () => console.log('API running at http://localhost:' + port));
}

module.exports = { app, transactions, calculateChecksum, checksumIsValid };
