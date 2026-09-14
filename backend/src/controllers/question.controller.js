import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { getPagination, buildPageMeta } from '../utils/helpers.js';
import { ROLES, NOTIFICATION_TYPE } from '../utils/constants.js';

import Question from '../models/Question.js';
import Orchard from '../models/Orchard.js';
import { notify } from '../services/notification.service.js';

/* ----------------------- List by Orchard --------------------------- */
export const listOrchardQuestions = asyncHandler(async (req, res) => {
  const orchardId = req.params.id;
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);

  const orchard = await Orchard.findOne({ _id: orchardId, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard not found');

  const filter = { orchard: orchardId, status: { $ne: 'hidden' } };

  if (q.q) {
    // Case-insensitive regex search for substring match on question
    filter.question = { $regex: q.q, $options: 'i' };
  }

  const sortOrder = q.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Question.find(filter)
      .populate('askedBy', 'name avatar')
      .populate('answeredBy', 'name avatar')
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return ok(res, items, 'Orchard questions loaded', buildPageMeta({ page, limit, total }));
});

/* --------------------------- Ask Question --------------------------- */
export const createQuestion = asyncHandler(async (req, res) => {
  const orchardId = req.params.id;
  const { question } = req.body;

  const orchard = await Orchard.findOne({ _id: orchardId, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard not found');

  const newQuestion = await Question.create({
    orchard: orchardId,
    askedBy: req.user._id,
    question,
  });

  // Notify seller
  await notify({
    user: orchard.sellerId,
    type: NOTIFICATION_TYPE.SYSTEM,
    title: 'New Orchard Question',
    message: `A renter asked a question about "${orchard.gardenName}"`,
    link: `/seller/questions`,
  });

  const populated = await newQuestion.populate('askedBy', 'name avatar');

  return created(res, populated, 'Question submitted successfully');
});

/* ------------------------- Answer Question -------------------------- */
export const answerQuestion = asyncHandler(async (req, res) => {
  const questionId = req.params.id;
  const { answer } = req.body;

  const question = await Question.findById(questionId);
  if (!question) throw ApiError.notFound('Question not found');

  const orchard = await Orchard.findOne({ _id: question.orchard, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard associated with this question has been deleted or not found');

  if (String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the orchard owner can answer questions');
  }

  question.answer = answer;
  question.answeredBy = req.user._id;
  question.isOfficialAnswer = true;
  question.answeredAt = new Date();
  await question.save();

  // Notify renter
  await notify({
    user: question.askedBy,
    type: NOTIFICATION_TYPE.SYSTEM,
    title: 'Official Answer Posted',
    message: `The seller posted an answer to your question about "${orchard.gardenName}"`,
    link: `/orchards/${orchard.slug}`,
  });

  const populated = await question.populate([
    { path: 'askedBy', select: 'name avatar' },
    { path: 'answeredBy', select: 'name avatar' }
  ]);

  return ok(res, populated, 'Answer saved successfully');
});

/* ----------------------- Patch Official Answer ---------------------- */
export const patchOfficialAnswer = asyncHandler(async (req, res) => {
  const questionId = req.params.id;
  const { isOfficialAnswer } = req.body;

  const question = await Question.findById(questionId);
  if (!question) throw ApiError.notFound('Question not found');

  const orchard = await Orchard.findOne({ _id: question.orchard, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard associated with this question not found');

  if (String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the orchard owner can update official status');
  }

  question.isOfficialAnswer = isOfficialAnswer;
  await question.save();

  return ok(res, question, 'Official answer status updated');
});

/* -------------------------- Report Question ------------------------- */
export const reportQuestion = asyncHandler(async (req, res) => {
  const questionId = req.params.id;

  const question = await Question.findByIdAndUpdate(
    questionId,
    { status: 'reported' },
    { new: true }
  );
  if (!question) throw ApiError.notFound('Question not found');

  return ok(res, null, 'Question reported successfully');
});

/* ----------------------- Seller Lists Questions --------------------- */
export const listSellerQuestions = asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);

  // Find all orchards owned by this seller
  const orchards = await Orchard.find({ sellerId: req.user._id, deletedAt: null }).select('_id');
  const orchardIds = orchards.map((o) => o._id);

  const filter = { orchard: { $in: orchardIds }, status: { $ne: 'hidden' } };
  
  if (q.status === 'unanswered') {
    filter.answer = '';
  } else if (q.status === 'answered') {
    filter.answer = { $ne: '' };
  }

  const [items, total] = await Promise.all([
    Question.find(filter)
      .populate('orchard', 'gardenName slug')
      .populate('askedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return ok(res, items, 'Seller questions loaded', buildPageMeta({ page, limit, total }));
});

/* ------------------------ Admin Lists Questions --------------------- */
export const listAllQuestions = asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);

  const filter = {};
  if (q.q) {
    filter.question = { $regex: q.q, $options: 'i' };
  }
  if (q.status === 'reported') {
    filter.status = 'reported';
  }

  const [items, total] = await Promise.all([
    Question.find(filter)
      .populate('orchard', 'gardenName slug')
      .populate('askedBy', 'name email avatar')
      .populate('answeredBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return ok(res, items, 'All questions loaded', buildPageMeta({ page, limit, total }));
});

/* -------------------------- Delete Question ------------------------- */
export const deleteQuestion = asyncHandler(async (req, res) => {
  const questionId = req.params.id;

  const question = await Question.findByIdAndDelete(questionId);
  if (!question) throw ApiError.notFound('Question not found');

  return ok(res, null, 'Question deleted successfully');
});

/* ---------------------------- Delete Answer -------------------------- */
export const deleteAnswer = asyncHandler(async (req, res) => {
  const questionId = req.params.id;

  const question = await Question.findById(questionId);
  if (!question) throw ApiError.notFound('Question not found');

  const orchard = await Orchard.findOne({ _id: question.orchard, deletedAt: null });
  
  // Only the seller who owns the orchard OR an admin can clear the answer
  const isOwner = orchard && String(orchard.sellerId) === String(req.user._id);
  const isAdmin = req.user.role === ROLES.ADMIN;
  
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to delete this reply');
  }

  question.answer = '';
  question.answeredBy = null;
  question.isOfficialAnswer = false;
  await question.save();

  return ok(res, question, 'Answer deleted successfully');
});

/* -------------------------- Dismiss Report -------------------------- */
export const dismissReport = asyncHandler(async (req, res) => {
  const questionId = req.params.id;

  const question = await Question.findByIdAndUpdate(
    questionId,
    { status: 'active' },
    { new: true }
  );
  if (!question) throw ApiError.notFound('Question not found');

  return ok(res, question, 'Question report dismissed successfully');
});

