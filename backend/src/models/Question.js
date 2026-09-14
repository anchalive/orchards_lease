import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    orchard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orchard',
      required: true,
      index: true,
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
    answer: {
      type: String,
      trim: true,
      default: '',
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    isOfficialAnswer: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'reported', 'hidden'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
questionSchema.index({ orchard: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ question: 'text' });

const Question = mongoose.model('Question', questionSchema);
export default Question;
