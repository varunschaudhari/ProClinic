import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"],
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"],
  },
});

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    schedule: {
      monday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      tuesday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      wednesday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      thursday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      friday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      saturday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
      sunday: {
        isAvailable: { type: Boolean, default: false },
        morningSlot: timeSlotSchema,
        eveningSlot: timeSlotSchema,
      },
    },
  },
  {
    timestamps: true,
  }
);

const DoctorSchedule = mongoose.model("DoctorSchedule", doctorScheduleSchema);

export default DoctorSchedule;
