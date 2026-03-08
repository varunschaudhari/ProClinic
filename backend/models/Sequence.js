import mongoose from "mongoose";

const sequenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: Number,
    required: true,
    default: 0,
  },
});

const Sequence = mongoose.model("Sequence", sequenceSchema);

export default Sequence;
