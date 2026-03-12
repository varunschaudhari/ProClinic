import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      trim: true,
      default: "general",
    },
    floor: {
      type: String,
      trim: true,
    },
    ward: {
      type: String,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    beds: [
      {
        bedNumber: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          enum: ["available", "occupied", "maintenance", "reserved"],
          default: "available",
        },
        currentPatientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "IPD",
          default: null,
        },
      },
    ],
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    ratePerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    amenities: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ roomType: 1, status: 1 });
roomSchema.index({ "beds.status": 1 });

const Room = mongoose.model("Room", roomSchema);

export default Room;
